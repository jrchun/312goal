/**
 * Cloudflare Pages Function: POST /api/kakao-token
 * 카카오 인가 코드 → ID 토큰 교환. 클라이언트 시크릿은 여기(서버)에만 있고 브라우저로 나가지 않는다.
 *
 * 왜 필요한가: Supabase 기본 카카오 연동은 이메일 권한(account_email)을 무조건 요청해서
 * 이메일 심사가 없는 앱은 KOE205 오류가 난다. 그래서 카카오 OpenID Connect로 직접 로그인하고,
 * 받은 ID 토큰만 앱이 supabase.auth.signInWithIdToken 으로 넘긴다.
 *
 * Cloudflare 환경 변수: KAKAO_REST_KEY(공개), KAKAO_CLIENT_SECRET(비밀, "Secret" 종류로 저장)
 */
type Env = { KAKAO_REST_KEY?: string; KAKAO_CLIENT_SECRET?: string };
type Ctx = { request: Request; env: Env };

const ALLOWED_ORIGINS = ['https://haenya.pages.dev', 'http://localhost:8081'];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  if (!env.KAKAO_REST_KEY || !env.KAKAO_CLIENT_SECRET) return json({ error: 'SERVER_NOT_CONFIGURED' }, 500);

  let code = '';
  let redirectUri = '';
  try {
    const body = (await request.json()) as { code?: string; redirect_uri?: string };
    code = body.code ?? '';
    redirectUri = body.redirect_uri ?? '';
  } catch {
    return json({ error: 'BAD_REQUEST' }, 400);
  }

  // 우리 사이트(또는 미리보기 배포)의 /auth/kakao 로만 교환을 허용
  let origin = '';
  try {
    const u = new URL(redirectUri);
    origin = u.origin;
    if (u.pathname !== '/auth/kakao') throw new Error();
  } catch {
    return json({ error: 'BAD_REDIRECT_URI' }, 400);
  }
  const allowed = ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.haenya\.pages\.dev$/.test(origin);
  if (!code || !allowed) return json({ error: 'BAD_REQUEST' }, 400);

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.KAKAO_REST_KEY,
      client_secret: env.KAKAO_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string; error_code?: string };
  if (!res.ok || !data.id_token) {
    return json({ error: data.error_code ?? data.error ?? (res.ok ? 'NO_ID_TOKEN' : 'TOKEN_FAILED') }, 400);
  }
  // 액세스 토큰은 쓰지 않으므로 돌려주지 않는다
  return json({ id_token: data.id_token });
}
