/**
 * Cloudflare Pages Function(모든 주소 앞에서 한 번 돈다): 옛 주소(haenya.pages.dev) → 새 주소로 넘기기.
 *
 * 환경 변수 CANONICAL_ORIGIN(예: https://haenya.woongstudio.com)이 있을 때만 켜진다. 없으면 아무것도 하지 않는다.
 * - 화면 주소(GET/HEAD)만 301로 넘긴다. 경로·쿼리는 그대로(/join/ABCD → 새 주소의 /join/ABCD).
 * - /api/*와 /app.json은 넘기지 않는다: 카카오 연결 해제 웹훅처럼 바깥에 옛 주소로 등록된 것이 계속 동작하게,
 *   그리고 앱 허브가 옛 주소·새 주소의 app.json을 비교해 줄을 옮길 수 있게.
 * - 미리보기 배포(<해시>.haenya.pages.dev)와 새 주소 자체는 넘기지 않는다.
 * 브라우저 저장소는 주소마다 따로라, 넘어간 사람은 새 주소에서 이름 + 숫자 4자리로 한 번 되찾기를 한다.
 * 정적 파일(/_expo, /assets, /fonts, 그림)은 public/_routes.json에서 이 함수를 거치지 않게 뺐다(요청 수 절약).
 */
type Ctx = { request: Request; env: { CANONICAL_ORIGIN?: string }; next: () => Promise<Response> };

export const OLD_HOST = 'haenya.pages.dev';

/** 넘길 주소를 돌려준다. 넘기지 않으면 null. (순수 함수) */
export function redirectTarget(requestUrl: string, method: string, canonical: string | undefined): string | null {
  if (!canonical) return null;
  let target: URL;
  try { target = new URL(canonical); } catch { return null; }
  if (target.protocol !== 'https:') return null;
  const url = new URL(requestUrl);
  if (url.hostname !== OLD_HOST || url.hostname === target.hostname) return null;
  if (method !== 'GET' && method !== 'HEAD') return null;
  if (url.pathname.startsWith('/api/') || url.pathname === '/app.json') return null; // 허브가 두 주소의 app.json을 비교한다
  return `${target.origin}${url.pathname}${url.search}`;
}

export async function onRequest({ request, env, next }: Ctx): Promise<Response> {
  const to = redirectTarget(request.url, request.method, env.CANONICAL_ORIGIN);
  if (to) return Response.redirect(to, 301);
  return next();
}
