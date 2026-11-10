/**
 * Cloudflare Pages Function: GET /api/manifest — 웹 앱 설정 파일(이름·아이콘·색).
 * 홈 화면 추가 안내 기능은 앱 단계로 미뤘다(사용자 결정 2026-11-10). 브라우저 메뉴로 직접 추가하면 /home에서 시작.
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
