/**
 * 내 영상 (웹) — 올해 인증샷을 한 장씩 넘기며 숫자가 올라가는 1080×1920 스토리 영상 (사용자 요청 2026-11-24).
 * 화면에서 재생하는 그 순간을 그대로 녹화한다(canvas → MediaRecorder). 아이폰 Safari는 mp4로 나온다.
 * 구성: 시작(이름) → 사진마다 "했다." + 올해 N/목표 → 끝(누적 큰 숫자 + 했냐? 띠).
 */
import { color } from '../theme';
import { drawCover, ensureFonts, sticker } from './cards.web';
import type { ClipHandle, ClipInput, ClipSaveResult, ClipEvents } from './clip.types';

export * from './clip.types';

const DISPLAY = "'Black Han Sans'";
const GOTHIC = "'Gothic A1'";
const W = 1080; // 그림은 1080×1920 기준으로 그리고
const H = 1920;
const OUT_W = 720; // 녹화는 720×1280 (휴대폰이 실시간으로 버틸 크기)
const OUT_H = 1280;
const INTRO = 1.4;
const OUTRO = 2.6;
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 사진 한 장 시간: 기본 0.5초, 많으면 줄여서 전체 20초 안팎 (최소 0.2초) */
export const perPhoto = (n: number) => Math.max(0.2, Math.min(0.5, 20 / Math.max(1, n)));
export const clipSeconds = (n: number) => INTRO + n * perPhoto(n) + OUTRO;

const dateLabel = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  const wd = DAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return `${m}월 ${day}일 ${wd}`;
};

const pickMime = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const t of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
};

/** 사진 파일을 미리 받아 둔다 (그릴 때는 앞쪽 몇 장만 풀어서 메모리를 아낀다) */
async function fetchAll(urls: string[], onProgress: (n: number) => void): Promise<(Blob | null)[]> {
  const out: (Blob | null)[] = new Array(urls.length).fill(null);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      out[i] = await fetch(urls[i]).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
      onProgress(++done);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return out;
}

const decode = async (b: Blob): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === 'function') return createImageBitmap(b);
  const url = URL.createObjectURL(b);
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  return img;
};

function drawIntro(ctx: CanvasRenderingContext2D, c: ClipInput) {
  ctx.fillStyle = color.cream;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'top';
  ctx.fillStyle = color.black;
  ctx.font = `800 36px ${GOTHIC}`;
  ctx.fillText(c.groupName, 56, 84);
  ctx.textAlign = 'right';
  ctx.fillText(`${c.year} 내 기록`, W - 56, 84);
  ctx.textAlign = 'left';
  ctx.fillRect(0, 150, W, 16);
  ctx.font = `${fitSize(ctx, `${c.name}.`, 400, W - 80)}px ${DISPLAY}`;
  ctx.fillText(`${c.name}.`, 40, 300);
  ctx.font = `220px ${DISPLAY}`;
  ctx.fillText('한 장씩', 48, 820);
  ctx.fillStyle = color.red;
  ctx.fillText('본다.', 48, 1060);
  ctx.fillStyle = color.black;
  ctx.font = `800 44px ${GOTHIC}`;
  const counted = c.total - c.before;
  ctx.fillText(c.before > 0 ? `했냐로 ${counted}번. 그 전까지 ${c.before}번.` : `올해 ${c.total}번 했다.`, 56, 1400);
}

function drawPhoto(ctx: CanvasRenderingContext2D, c: ClipInput, i: number, img: ImageBitmap | HTMLImageElement | null) {
  const p = c.photos[i];
  ctx.fillStyle = color.black;
  ctx.fillRect(0, 0, W, H);
  if (img) drawCover(ctx, img, W, H);
  const m = 60;
  sticker(ctx, { x: m, y: m + 10, font: `64px ${DISPLAY}`, size: 64, bg: color.cream,
    runs: [{ text: '했냐?', color: color.black }], rotate: -3, padX: 28, padY: 16 });
  sticker(ctx, { x: W - m, y: m + 18, font: `800 34px ${GOTHIC}`, size: 34, bg: color.black,
    runs: [{ text: `${c.groupName} · ${i + 1}/${c.photos.length}`, color: color.cream }], padX: 22, padY: 14, anchor: 'right' });
  const didY = H * 0.55;
  const did = sticker(ctx, { x: m, y: didY, font: `210px ${DISPLAY}`, size: 210, bg: color.red,
    runs: [{ text: '했다.', color: color.black }], rotate: -5, padX: 44, padY: 14, minWidth: W * 0.62, lineGap: 1.05 });
  const cntY = didY + did.h + 34;
  const cnt = sticker(ctx, { x: m, y: cntY, font: `118px ${DISPLAY}`, size: 118, bg: color.black,
    runs: [{ text: String(p.n), color: color.cream }, ...(c.goal ? [{ text: `/${c.goal}`, color: color.gray }] : [])],
    padX: 30, padY: 10, lineGap: 1.05 });
  sticker(ctx, { x: m + cnt.w + 22, y: cntY + 16, font: `800 38px ${GOTHIC}`, size: 38, bg: color.cream,
    runs: [[{ text: `${c.name},`, color: color.black }], [{ text: p.counted ? `올해 ${p.n}번째` : '그날 한 장 더', color: color.black }]],
    rotate: 2, padX: 22, padY: 14, lineGap: 1.3 });
  sticker(ctx, { x: m, y: H - m - 70, font: `800 34px ${GOTHIC}`, size: 34, bg: color.cream,
    runs: [{ text: p.verified ? dateLabel(p.date) : `${dateLabel(p.date)} · 날짜 미확인`, color: color.black }], padX: 22, padY: 14 });
}

function drawOutro(ctx: CanvasRenderingContext2D, c: ClipInput) {
  ctx.fillStyle = color.cream;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'top';
  ctx.fillStyle = color.black;
  ctx.font = `800 36px ${GOTHIC}`;
  ctx.fillText(c.groupName, 56, 84);
  ctx.fillRect(0, 150, W, 16);
  ctx.font = `${fitSize(ctx, `${c.name}.`, 220, W - 80)}px ${DISPLAY}`;
  ctx.fillText(`${c.name}.`, 40, 260);
  ctx.font = `${fitSize(ctx, String(c.total), 420, W - 80)}px ${DISPLAY}`;
  ctx.fillText(String(c.total), 40, 520);
  if (c.goal) {
    ctx.fillStyle = color.gray;
    ctx.font = `200px ${DISPLAY}`;
    ctx.fillText(`/${c.goal}`, 48, 980);
  }
  ctx.fillStyle = color.black;
  ctx.font = `800 48px ${GOTHIC}`;
  const left = c.goal ? c.goal - c.total : 0;
  ctx.fillText(`올해 ${c.total}번 했다. ${c.goal ? (left > 0 ? `${left}번 남았다.` : '목표 넘겼다.') : ''}`, 56, 1290);
  ctx.fillStyle = color.bodyGray;
  ctx.fillText('오늘 했냐?', 56, 1360);
  ctx.fillStyle = color.black;
  ctx.fillRect(0, H - 300, W, 300);
  ctx.fillStyle = color.red;
  ctx.font = `110px ${DISPLAY}`;
  ctx.fillText('했냐?', 56, H - 210);
  ctx.fillStyle = color.cream;
  ctx.font = `800 40px ${GOTHIC}`;
  ctx.textAlign = 'right';
  ctx.fillText('너도 했냐 →', W - 56, H - 168);
  ctx.textAlign = 'left';
}

/** 폭에 맞게 글자 크기 줄이기 (긴 이름) */
function fitSize(ctx: CanvasRenderingContext2D, text: string, size: number, maxW: number) {
  ctx.font = `${size}px ${DISPLAY}`;
  const w = ctx.measureText(text).width;
  return w > maxW ? Math.floor((size * maxW) / w) : size;
}

/**
 * 영상을 el(화면의 빈 상자) 안에 띄우고 재생한다. 첫 재생을 녹화해 events.recorded로 넘긴다.
 * 녹화를 못 하는 브라우저면 recorded(null) — 보기만 된다.
 */
export function mountClip(el: unknown, c: ClipInput, events: ClipEvents): ClipHandle {
  const box = el as HTMLElement;
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
  box.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(OUT_W / W, 0, 0, OUT_H / H, 0, 0);

  let alive = true;
  let raf = 0;
  let blobs: (Blob | null)[] = [];
  const bitmaps = new Map<number, ImageBitmap | HTMLImageElement>();
  const pending = new Set<number>();
  const per = perPhoto(c.photos.length);
  const total = clipSeconds(c.photos.length);
  let recorded = false;

  const ensure = (from: number) => {
    for (let i = from; i < Math.min(c.photos.length, from + 5); i++) {
      if (bitmaps.has(i) || pending.has(i) || !blobs[i]) continue;
      pending.add(i);
      decode(blobs[i]!).then((b) => { pending.delete(i); if (alive) bitmaps.set(i, b); }).catch(() => pending.delete(i));
    }
    for (const k of [...bitmaps.keys()]) {
      if (k < from - 1) {
        const b = bitmaps.get(k);
        if (b && 'close' in b) b.close();
        bitmaps.delete(k);
      }
    }
  };

  let lastPhoto: ImageBitmap | HTMLImageElement | null = null;
  const frame = (t: number) => {
    if (t < INTRO) {
      drawIntro(ctx, c);
      ensure(0);
    } else if (t < INTRO + c.photos.length * per) {
      const i = Math.min(c.photos.length - 1, Math.floor((t - INTRO) / per));
      ensure(i);
      const img = bitmaps.get(i) ?? lastPhoto; // 아직 못 풀었으면 앞 사진 유지
      lastPhoto = img ?? null;
      drawPhoto(ctx, c, i, img ?? null);
    } else drawOutro(ctx, c);
  };

  const play = () => {
    cancelAnimationFrame(raf);
    const mime = recorded ? null : pickMime();
    let rec: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    const stream = mime !== null && 'captureStream' in canvas ? canvas.captureStream(30) : null;
    if (stream) {
      try {
        rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 6_000_000 });
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onstop = () => {
          stream.getTracks().forEach((tr) => tr.stop());
          if (!alive) return;
          recorded = true;
          events.recorded(chunks.length ? new Blob(chunks, { type: (rec?.mimeType || mime || 'video/mp4').split(';')[0] }) : null);
        };
        rec.start(500);
      } catch {
        rec = null;
      }
    }
    if (!rec && !recorded) {
      recorded = true;
      events.recorded(null);
    }
    events.state('playing');
    lastPhoto = null;
    const t0 = performance.now();
    const tick = () => {
      if (!alive) return;
      const t = (performance.now() - t0) / 1000;
      frame(Math.min(t, total));
      events.time?.(Math.min(1, t / total));
      if (t < total) raf = requestAnimationFrame(tick);
      else {
        // 마지막 장면이 영상에 담기도록 잠깐 기다렸다 멈춘다
        setTimeout(() => rec?.state === 'recording' && rec.stop(), 300);
        events.state('done');
      }
    };
    raf = requestAnimationFrame(tick);
  };

  (async () => {
    events.state('loading');
    events.progress(0, c.photos.length);
    await ensureFonts(`했냐다?.0123456789/·월화수목금토일 ${c.name}${c.groupName}한장씩본다올해번째그날더전까지남았목표넘겼오늘너도→내기록날짜미확인`);
    drawIntro(ctx, c);
    blobs = await fetchAll(c.photos.map((p) => p.url), (n) => alive && events.progress(n, c.photos.length));
    if (!alive) return;
    ensure(0);
    play();
  })();

  return {
    replay: play,
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      bitmaps.forEach((b) => 'close' in b && b.close());
      canvas.remove();
    },
  };
}

/** 영상 저장: 공유 시트(아이폰 → "비디오 저장"·인스타) → 안 되면 내려받기 → 카톡 안이면 안내 */
export async function saveClip(blob: Blob, filename: string): Promise<ClipSaveResult> {
  const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
    }
  }
  if (/KAKAOTALK/i.test(navigator.userAgent)) return 'kakao';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  return 'downloaded';
}
