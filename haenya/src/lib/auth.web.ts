/**
 * 카카오 로그인 (웹) — 카카오 OpenID Connect 직접 연동.
 *  1) 카카오 로그인 화면으로 이동 (scope 없이 → 앱에 설정된 동의항목만 요청, 이메일 안 받음)
 *  2) /auth/kakao 로 돌아오면 completeKakaoSignIn() 이 /api/kakao-token 으로 ID 토큰을 받아
 *     supabase.auth.signInWithIdToken 으로 로그인
 * Supabase 기본 카카오 연동(signInWithOAuth)은 이메일 권한을 강제로 요청해 KOE205가 나서 쓰지 않는다.
 */
import { supabase } from './supabase';

const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_KEY ?? '';
const STORE = 'haenya.kakao.login';

type Pending = { state: string; nonce: string; next: string };

function randomString(bytes = 16): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const redirectUri = () => `${window.location.origin}/auth/kakao`;

/** next: 로그인 후 보낼 경로 (예: 초대 링크 /join/ABCD2345) */
export async function signInWithKakao(next = '/'): Promise<void> {
  if (!KAKAO_REST_KEY) throw new Error('EXPO_PUBLIC_KAKAO_REST_KEY 없음');
  const pending: Pending = { state: randomString(), nonce: randomString(), next };
  sessionStorage.setItem(STORE, JSON.stringify(pending));
  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: KAKAO_REST_KEY,
    redirect_uri: redirectUri(),
    state: pending.state,
    // Supabase는 원래 nonce의 SHA-256 값이 ID 토큰에 들어 있기를 기대한다
    nonce: await sha256Hex(pending.nonce),
  }).toString();
  window.location.assign(url.toString());
}

/** /auth/kakao 화면에서 호출. 성공하면 로그인 후 보낼 경로(next)를 돌려준다 */
export async function completeKakaoSignIn(params: { code?: string; state?: string }): Promise<string> {
  const raw = sessionStorage.getItem(STORE);
  sessionStorage.removeItem(STORE);
  const pending = raw ? (JSON.parse(raw) as Pending) : null;
  if (!pending || !params.code || params.state !== pending.state) throw new Error('STATE_MISMATCH');

  const res = await fetch('/api/kakao-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: params.code, redirect_uri: redirectUri() }),
  });
  const data = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!res.ok || !data.id_token) throw new Error(data.error ?? 'TOKEN_FAILED');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'kakao',
    token: data.id_token,
    nonce: pending.nonce,
  });
  if (error) throw error;
  return pending.next;
}
