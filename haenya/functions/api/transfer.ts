/**
 * Cloudflare Pages Function: POST /api/transfer — 1회용 이어가기 열쇠로 로그인.
 * 로그인된 곳(카톡 브라우저 등)에서 만든 열쇠를 Safari·홈 화면 아이콘이 받아 숫자 없이 이어간다.
 * DB redeem_transfer_token: 10분, 한 번만.
 */
import { passwordFor } from './register';

type Env = { HAENYA_AUTH_SECRET?: string; EXPO_PUBLIC_SUPABASE_URL?: string; EXPO_PUBLIC_SUPABASE_ANON_KEY?: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  const { HAENYA_AUTH_SECRET: secret, EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_ANON_KEY: anon } = env;
  if (!secret || !url || !anon) return json({ error: 'SERVER_NOT_CONFIGURED' }, 500);
  let token = '';
  try {
    token = ((await request.json()) as { token?: string }).token ?? '';
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }
  if (!/^[0-9a-f]{48}$/.test(token)) return json({ error: 'INVALID' }, 400);
  const r = await fetch(`${url}/rest/v1/rpc/redeem_transfer_token`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token }),
  });
  const rows = (await r.json().catch(() => [])) as { status: string; email: string | null }[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row || row.status !== 'OK' || !row.email) return json({ error: row?.status ?? 'INVALID' }, 401);
  return json({ email: row.email, password: await passwordFor(secret, row.email) });
}
