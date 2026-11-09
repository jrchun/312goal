/**
 * Cloudflare Pages Function: POST /api/restore — 이름 + 4자리로 계정 되찾기.
 * DB의 verify_pin(틀리면 5번마다 15분 잠금)으로 확인하고, 맞으면 로그인 정보를 돌려준다.
 */
import { passwordFor } from './register';

type Env = { HAENYA_AUTH_SECRET?: string; EXPO_PUBLIC_SUPABASE_URL?: string; EXPO_PUBLIC_SUPABASE_ANON_KEY?: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }: { request: Request; env: Env }): Promise<Response> {
  const { HAENYA_AUTH_SECRET: secret, EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_ANON_KEY: anon } = env;
  if (!secret || !url || !anon) return json({ error: 'SERVER_NOT_CONFIGURED' }, 500);

  let userId = '';
  let pin = '';
  try {
    const b = (await request.json()) as { user_id?: string; pin?: string };
    userId = b.user_id ?? '';
    pin = b.pin ?? '';
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/.test(userId) || !/^[0-9]{4}$/.test(pin)) return json({ error: 'BAD_PIN' }, 400);

  const r = await fetch(`${url}/rest/v1/rpc/verify_pin`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user: userId, p_pin: pin }),
  });
  const rows = (await r.json().catch(() => [])) as { status: string; email: string | null }[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) return json({ error: 'RESTORE_FAILED' }, 500);
  if (row.status !== 'OK' || !row.email) return json({ error: row.status }, row.status === 'LOCKED' ? 429 : 401);
  return json({ email: row.email, password: await passwordFor(secret, row.email) });
}
