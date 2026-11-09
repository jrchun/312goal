/**
 * Cloudflare Pages Function: GET /api/manifest — 홈 화면 앱(PWA) 설정 파일.
 * ?start=/install?t=... 를 주면 그 주소에서 시작한다 → 아이폰 홈 화면 아이콘이 처음 열릴 때
 * 1회용 이어가기 열쇠로 숫자 없이 로그인된다. 기본 시작 주소는 /home.
 */
export async function onRequestGet({ request }: { request: Request }): Promise<Response> {
  const start = new URL(request.url).searchParams.get('start') ?? '/home';
  const safeStart = start.startsWith('/') && !start.startsWith('//') ? start : '/home';
  const manifest = {
    name: '했냐',
    short_name: '했냐',
    description: '친구끼리 운동 인증. 안 하면 단톡방에서 찔린다.',
    lang: 'ko',
    start_url: safeStart,
    scope: '/',
    display: 'standalone',
    background_color: '#F1EDE4',
    theme_color: '#F1EDE4',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
