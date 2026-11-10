/**
 * Cloudflare Pages Function: POST /api/claim — 미리 만들어 둔 멤버 자리에 처음 들어오기.
 * 초대 코드 + 그 그룹의 "숫자 아직 안 정한" 미리 만든 자리일 때만 DB claim_account가 이메일을 준다.
 * 로그인 후 앱은 /login에서 성·이름·숫자 4자리·약관을 채운다(숫자를 정하면 더는 이 길로 못 들어온다).
 */
import { passwordFor } from './register';

type Env = { HAENYA_AUTH_SECRET?: string; EXPO_PUBLIC_SUPABASE_URL?: string; EXPO_PUBLIC_SUPABASE_ANON_KEY?: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  const { HAENYA_AUTH_SECRET: secret, EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_ANON_KEY: anon } = env;
  if (!secret || !url || !anon) return json({ error: 'SERVER_NOT_CONFIGURED' }, 500);

  let userId = '';
  let code = '';
  try {
    const b = (await request.json()) as { user_id?: string; code?: string };
    userId = b.user_id ?? '';
    code = b.code ?? '';
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/.test(userId) || !/^[0-9A-Za-z]{8}$/.test(code)) return json({ error: 'BAD_REQUEST' }, 400);

  const r = await fetch(`${url}/rest/v1/rpc/claim_account`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user: userId, p_code: code }),
  });
  const email = (await r.json().catch(() => null)) as string | null;
  if (!r.ok || typeof email !== 'string' || !email) return json({ error: 'CLAIM_FAILED' }, 403);
  return json({ email, password: await passwordFor(secret, email) });
}
