/**
 * 기기 등록 로그인 (기본 로그인 방식).
 *  registerDevice: 새 계정 만들기 → 이 브라우저에 로그인 상태가 저장된다(다음부터 자동)
 *  restoreWithPin: 다른 브라우저·홈 화면 아이콘·새 폰에서 "이름 + 4자리"로 되찾기
 * 서버: functions/api/register.ts, restore.ts (Cloudflare에서만 동작 → 로컬 npm run web 에서는 안 됨)
 */
import { siteUrl } from './invite';
import { supabase } from './supabase';

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${siteUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? 'SERVER_ERROR');
  return data;
}

export async function registerDevice(name: { family: string; given: string }): Promise<void> {
  const cred = await post<{ email: string; password: string }>('/api/register');
  const { error } = await supabase.auth.signUp({
    email: cred.email,
    password: cred.password,
    options: { data: { name: `${name.family}${name.given}`, family_name: name.family, given_name: name.given } },
  });
  if (error) throw new Error('REGISTER_FAILED');
}

export async function restoreWithPin(userId: string, pin: string): Promise<void> {
  const cred = await post<{ email: string; password: string }>('/api/restore', { user_id: userId, pin });
  const { error } = await supabase.auth.signInWithPassword({ email: cred.email, password: cred.password });
  if (error) throw new Error('RESTORE_FAILED');
}

/** 미리 만들어 둔 내 자리에 처음 들어오기 (숫자 아직 없음) → 로그인 후 /login에서 숫자·약관을 정한다 */
export async function claimAccount(userId: string, code: string): Promise<void> {
  const cred = await post<{ email: string; password: string }>('/api/claim', { user_id: userId, code });
  const { error } = await supabase.auth.signInWithPassword({ email: cred.email, password: cred.password });
  if (error) throw new Error('CLAIM_FAILED');
}
