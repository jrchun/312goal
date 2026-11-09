import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { isServer, supabase } from './supabase';
import type { Membership, Profile } from './types';

type SessionState = {
  /** 처음 세션·프로필을 읽는 중 */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** 내가 속한 그룹 (MVP: 한 사람 한 그룹). 없으면 null */
  membership: Membership | null;
  /** 프로필·그룹 정보를 다시 읽는다 (약관 동의, 그룹 합류 뒤 호출) */
  refresh: () => Promise<UserState>;
  signOut: () => Promise<void>;
};

export type UserState = { session: Session | null; profile: Profile | null; membership: Membership | null };

const Ctx = createContext<SessionState | null>(null);

async function loadUserData(userId: string) {
  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from('profiles').select('id, nickname, avatar_url, terms_agreed_at').eq('id', userId).maybeSingle(),
    supabase
      .from('group_members')
      .select('season_goal, role, group:groups(id, name, invite_code, weekly_goal, season_goal, owner_id)')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  return {
    profile: (profile as Profile | null) ?? null,
    membership: member && member.group ? (member as unknown as Membership) : null,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // 서버(정적 HTML)와 브라우저 첫 화면이 같아야 하므로 둘 다 '불러오는 중'으로 시작
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);

  const apply = useCallback(async (s: Session | null): Promise<UserState> => {
    const d = s ? await loadUserData(s.user.id) : { profile: null, membership: null };
    setSession(s);
    setProfile(d.profile);
    setMembership(d.membership);
    setLoading(false);
    return { session: s, ...d };
  }, []);

  useEffect(() => {
    if (isServer) return;
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // 토큰 갱신은 사용자 정보가 바뀌지 않으므로 세션만 교체
      if (event === 'TOKEN_REFRESHED') setSession(s);
      else if (event !== 'INITIAL_SESSION') setTimeout(() => apply(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [apply]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return apply(data.session);
  }, [apply]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await apply(null);
  }, [apply]);

  return (
    <Ctx.Provider value={{ loading, session, profile, membership, refresh, signOut }}>{children}</Ctx.Provider>
  );
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('SessionProvider 밖에서 useSession 사용');
  return v;
}

/**
 * 로그인 상태에 따라 가야 할 곳.
 *  약관 미동의 → /login (동의 단계)
 *  초대 링크로 들어왔으면 → 그 초대 링크 (자동 합류)
 *  그룹 있음 → /home, 없음 → /create-group
 */
export function nextRoute(
  s: Pick<SessionState, 'session' | 'profile' | 'membership'>,
  next?: string | null,
): string {
  if (!s.session) return next?.startsWith('/join/') ? next : '/';
  if (!s.profile?.terms_agreed_at) return next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  if (next?.startsWith('/join/') && !s.membership) return next;
  return s.membership ? '/home' : '/create-group';
}
