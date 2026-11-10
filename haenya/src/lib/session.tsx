import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { clearCache } from './cache';
import { clearSignedUrls } from './photos';
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

/**
 * 내 프로필·그룹·숫자 상태 읽기. 하나라도 못 읽으면 오류를 던진다.
 * (못 읽은 걸 "없음"으로 치면, 잠깐 인터넷이 끊겼을 때 멀쩡한 계정이 "프로필 미완성"으로 보여
 *  이름·숫자를 다시 정하는 화면으로 가 버린다)
 */
async function loadUserData(userId: string) {
  const [{ data: profile, error: e1 }, { data: member, error: e2 }, { data: pin, error: e3 }] = await Promise.all([
    supabase.from('profiles').select('id, nickname, family_name, given_name, avatar_url, terms_agreed_at').eq('id', userId).maybeSingle(),
    supabase
      .from('group_members')
      .select('season_goal, role, joined_at, group:groups(id, name, invite_code, weekly_goal, season_goal, owner_id)')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.rpc('my_pin_status').maybeSingle(),
  ]);
  if (e1 || e2 || e3) throw new Error('LOAD_FAILED');
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
    let d: Omit<UserState, 'session'> = { profile: null, membership: null, pin: null };
    if (s) {
      // 못 읽으면 조금씩 쉬었다가 다시 (0.5초 → 1.5초 → 3초 … 최대 5초 간격). 읽을 때까지 "불러오는 중"으로 둔다
      for (let attempt = 0; ; attempt++) {
        try {
          d = await loadUserData(s.user.id);
          break;
        } catch {
          await new Promise((r) => setTimeout(r, Math.min(5000, 500 + attempt * 1000)));
          if (id !== latest.current) return { session: s, ...d };
        }
      }
    }
    if (id !== latest.current) return { session: s, ...d };
    if (!s) {
      clearCache();
      clearSignedUrls();
    }
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

  // 이 브라우저에서만 로그아웃한다. (기본값은 "모든 기기에서 로그아웃"이라 Safari에서 나가면 카톡 브라우저·다른 폰도 같이 풀려 버린다)
  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
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
