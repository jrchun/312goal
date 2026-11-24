/**
 * Cloudflare Pages Function: GET /api/health — 앱 허브(hub.woongstudio.com)가 하루 한 번 "살아 있는지" 확인할 때 읽는다.
 * 허브는 이것과 /app.json(public/app.json, 카드의 이름·설명), /og.png(카드 그림)를 읽는다(app_starter docs/HUB.md).
 * starter: 허브 연동 형식 버전(1). usage: 했냐는 사용 기록을 허브에 내지 않는다(null).
 * DB는 Supabase라 여기서 확인하지 않는다(db: null). 서버 함수가 응답하면 살아 있는 것으로 본다.
 */
export async function onRequestGet(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, db: null, mode: 'supabase', starter: 1, usage: null }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
