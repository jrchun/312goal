import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { isServer, supabase } from './supabase';
import type { Membership, PinStatus, Profile } from './types';

type SessionState = {
  /** 처음 세션·프로필을 읽는 중 */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** 내가 속한 그룹 (MVP: 한 사람 한 그룹). 없으면 null */
  membership: Membership | null;
  /** 되찾기용 4자리를 정했는지 / 임시 숫자인지 */
  pin: PinStatus | null;
  /** 프로필·그룹 정보를 다시 읽는다 (약관 동의, 그룹 합류 뒤 호출) */
  refresh: () => Promise<UserState>;
  signOut: () => Promise<void>;
};

export type UserState = { session: Session | null; profile: Profile | null; membership: Membership | null; pin: PinStatus | null };

const Ctx = createContext<SessionState | null>(null);

async function loadUserData(userId: string) {
  const [{ data: profile }, { data: member }, { data: pin }] = await Promise.all([
    supabase.from('profiles').select('id, nickname, family_name, given_name, avatar_url, terms_agreed_at').eq('id', userId).maybeSingle(),
    supabase
      .from('group_members')
      .select('season_goal, role, joined_at, group:groups(id, name, invite_code, weekly_goal, season_goal, owner_id)')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.rpc('my_pin_status').maybeSingle(),
  ]);
  return {
    profile: (profile as Profile | null) ?? null,
    membership: member && member.group ? (member as unknown as Membership) : null,
    pin: (pin as PinStatus | null) ?? null,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // 서버(정적 HTML)와 브라우저 첫 화면이 같아야 하므로 둘 다 '불러오는 중'으로 시작
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [pin, setPin] = useState<PinStatus | null>(null);

  // 여러 번 겹쳐 읽을 때 마지막 요청만 반영한다.
  // (가입 직후 시작된 느린 읽기가, 이름·숫자 저장 뒤의 새 읽기보다 늦게 도착해 "미완성"으로 덮어쓰던 문제)
  const latest = useRef(0);
  const apply = useCallback(async (s: Session | null): Promise<UserState> => {
    const id = ++latest.current;
    const d = s ? await loadUserData(s.user.id) : { profile: null, membership: null, pin: null };
    if (id !== latest.current) return { session: s, ...d };
    setSession(s);
    setProfile(d.profile);
    setMembership(d.membership);
    setPin(d.pin);
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
    <Ctx.Provider value={{ loading, session, profile, membership, pin, refresh, signOut }}>{children}</Ctx.Provider>
  );
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('SessionProvider 밖에서 useSession 사용');
  return v;
}

/** 프로필이 다 채워졌나: 약관 동의 + 성·이름 + 되찾기 숫자(임시 아님) */
export function profileComplete(s: Pick<SessionState, 'profile' | 'pin'>): boolean {
  return !!s.profile?.terms_agreed_at && !!s.profile?.given_name && !!s.pin?.has_pin && !s.pin?.is_temp;
}

/** 화면에 부를 이름 (이름만. 없으면 전체 닉네임) */
export function displayName(p: Profile | null | undefined): string {
  return p?.given_name || p?.nickname || '';
}

/**
 * 로그인 상태에 따라 가야 할 곳.
 *  로그인 전 → 초대 링크면 그 링크, 아니면 첫 화면
 *  프로필 미완성(약관·이름·4자리) → /login (시작하기 화면)
 *  초대 링크로 왔고 그룹이 없으면 → 그 초대 링크 (자동 합류)
 *  그룹 있음 → /home, 없음 → /create-group
 */
export function nextRoute(
  s: Pick<SessionState, 'session' | 'profile' | 'membership' | 'pin'>,
  next?: string | null,
): string {
  if (!s.session) return next?.startsWith('/join/') ? next : '/';
  if (!profileComplete(s)) return next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  if (next?.startsWith('/join/') && !s.membership) return next;
  return s.membership ? '/home' : '/create-group';
}
