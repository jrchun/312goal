/**
 * Cloudflare Pages Function: POST /api/register — 기기 등록용 새 계정 정보 발급.
 * 가짜 이메일(무작위@users.haenya.app) + 서버 비밀값으로 만든 긴 비밀번호를 돌려준다.
 * 앱은 이걸로 supabase.auth.signUp 을 한다. (Supabase 설정: 이메일 확인 끔)
 * 비밀번호 = HMAC-SHA256(HAENYA_AUTH_SECRET, 이메일) → 되찾기(/api/restore) 때 같은 값을 다시 만들 수 있다.
 * ⚠️ HAENYA_AUTH_SECRET 를 바꾸면 모든 사용자의 되찾기가 깨진다. 절대 바꾸지 말 것.
 */
type Env = { HAENYA_AUTH_SECRET?: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function passwordFor(secret: string, email: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email)));
  let bin = '';
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequestPost({ env }: { env: Env }): Promise<Response> {
  if (!env.HAENYA_AUTH_SECRET) return json({ error: 'SERVER_NOT_CONFIGURED' }, 500);
  const email = `${crypto.randomUUID().replace(/-/g, '')}@users.haenya.app`;
  return json({ email, password: await passwordFor(env.HAENYA_AUTH_SECRET, email) });
}
