/**
 * Cloudflare Pages Function: POST /api/kakao-unlink — 카카오 "연결 해제" 웹훅.
 * 사용자가 카카오 쪽(카카오톡 설정 → 연결된 서비스)에서 했냐 연결을 끊으면 카카오가 이 주소로 알려준다.
 * → 그 사람의 사진 파일과 계정(프로필·기록)을 지운다. (개인정보 보완 ⑥)
 *
 * 카카오 요청: Authorization: KakaoAK {앱 어드민 키}, 본문(form): app_id, user_id(카카오 회원번호), referrer_type
 * Cloudflare 환경 변수(Secret): KAKAO_ADMIN_KEY, SUPABASE_SERVICE_ROLE_KEY / (일반) EXPO_PUBLIC_SUPABASE_URL
 * 카카오는 응답 코드만 본다 → 처리 결과와 상관없이 인증만 맞으면 200.
 */
type Env = { KAKAO_ADMIN_KEY?: string; SUPABASE_SERVICE_ROLE_KEY?: string; EXPO_PUBLIC_SUPABASE_URL?: string };
type Ctx = { request: Request; env: Env };

const text = (body: string, status = 200) => new Response(body, { status });

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.KAKAO_ADMIN_KEY || !service || !url) return text('not configured', 503);
  if (request.headers.get('Authorization') !== `KakaoAK ${env.KAKAO_ADMIN_KEY}`) return text('unauthorized', 401);

  const form = new URLSearchParams(await request.text());
  const kakaoId = form.get('user_id') ?? '';
  if (!/^\d+$/.test(kakaoId)) return text('ok');

  const headers = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };
  // 1) 카카오 회원번호 → 우리 사용자 + 사진 경로
  const t = await fetch(`${url}/rest/v1/rpc/kakao_unlink_target`, {
    method: 'POST', headers, body: JSON.stringify({ p_kakao_id: kakaoId }),
  });
  const rows = (await t.json().catch(() => [])) as { user_id: string; photo_paths: string[] }[];
  const target = Array.isArray(rows) ? rows[0] : undefined;
  if (!target) return text('ok');

  // 2) 사진 파일 삭제 (Storage API — SQL로는 못 지움)
  if (target.photo_paths.length) {
    await fetch(`${url}/storage/v1/object/checkins`, {
      method: 'DELETE', headers, body: JSON.stringify({ prefixes: target.photo_paths }),
    });
  }
  // 3) 계정 삭제 (그룹장 넘기기 → auth 사용자 삭제 → 기록 함께 삭제)
  await fetch(`${url}/rest/v1/rpc/delete_user_account`, {
    method: 'POST', headers, body: JSON.stringify({ p_uid: target.user_id }),
  });
  return text('ok');
}
