/**
 * 공유 카드 이미지 (웹, canvas로 직접 그림) — 디자인 가이드라인 06 스티커 · 08 공유 카드.
 *  인증 스토리 1080×1920 / 나 했다 카드 1200×1200 / 재촉 카드 1200×1200
 * 스티커는 단색 블록, 기울기 -6°~+3°, 7개 이하. 사진 위 반투명 글자 금지.
 */
import { color } from '../theme';

const DISPLAY = "'Black Han Sans'";
const GOTHIC = "'Gothic A1'";

export type DidCardInput = {
  photoUrl: string;
  groupName: string;
  weekLabel: string; // "W46"
  nickname: string;
  weekCount: number;
  weeklyGoal: number;
  memo: string; // "이번 주 두 번째"
  timeLabel: string; // "11월 9일 월 · 17:26" 또는 "날짜 미확인"
};

export type NudgeCardInput = {
  groupName: string;
  weekLabel: string; // "W46 · 월요일 밤"
  callName: string; // "민지야"
  weekCount: number;
  weeklyGoal: number;
  daysSilent: number;
};

async function ensureFonts(text: string) {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  await Promise.all([
    document.fonts.load(`100px ${DISPLAY}`, text),
    document.fonts.load(`800 40px ${GOTHIC}`, text),
  ]).catch(() => undefined);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = url;
  });
}

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('NO_CANVAS');
  return { c, ctx };
}

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('ENCODE_FAILED'))), 'image/jpeg', 0.9),
  );
}

/** 사진을 꽉 채워 자르기 (object-fit: cover) */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

type Run = { text: string; color: string };
type StickerOpts = {
  x: number;
  y: number; // 왼쪽 위 기준 (anchor right 이면 x는 오른쪽 끝)
  font: string;
  size: number;
  bg: string;
  runs: Run[] | Run[][]; // 한 줄 또는 여러 줄
  rotate?: number; // 도
  padX: number;
  padY: number;
  minWidth?: number;
  anchor?: 'left' | 'right';
  lineGap?: number;
};

/** 단색 블록 스티커. 돌리기 전 크기를 돌려준다 */
function sticker(ctx: CanvasRenderingContext2D, o: StickerOpts) {
  const lines: Run[][] = Array.isArray(o.runs[0]) ? (o.runs as Run[][]) : [o.runs as Run[]];
  ctx.font = o.font;
  const lineH = o.size * (o.lineGap ?? 1.15);
  const widths = lines.map((l) => l.reduce((s, r) => s + ctx.measureText(r.text).width, 0));
  const w = Math.max(o.minWidth ?? 0, Math.max(...widths) + o.padX * 2);
  const h = lineH * lines.length + o.padY * 2;
  const left = o.anchor === 'right' ? o.x - w : o.x;
  ctx.save();
  ctx.translate(left + w / 2, o.y + h / 2);
  ctx.rotate(((o.rotate ?? 0) * Math.PI) / 180);
  ctx.fillStyle = o.bg;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    let cx = -w / 2 + o.padX;
    const cy = -h / 2 + o.padY + lineH * i + lineH / 2 + o.size * 0.04;
    for (const r of line) {
      ctx.fillStyle = r.color;
      ctx.fillText(r.text, cx, cy);
      cx += ctx.measureText(r.text).width;
    }
  });
  ctx.restore();
  return { w, h };
}

/** 인증 카드: 사진 전체 + 스티커 7개. 스토리(1080×1920)와 정사각(1200×1200) 공용 */
async function drawDid(input: DidCardInput, W: number, H: number): Promise<Blob> {
  await ensureFonts(`했냐다?.0123456789/ ${input.nickname}${input.groupName}${input.memo}${input.timeLabel}너도→`);
  const img = await loadImage(input.photoUrl);
  const { c, ctx } = canvasOf(W, H);
  ctx.fillStyle = color.black;
  ctx.fillRect(0, 0, W, H);
  drawCover(ctx, img, W, H);
  const u = W / 1080; // 1080 기준 비율
  const m = 60 * u; // 가장자리 여백
  const square = H / W < 1.3;

  // 1. 했냐? 로고 — 왼쪽 위, 크림 −3°
  sticker(ctx, { x: m, y: m + 10 * u, font: `${64 * u}px ${DISPLAY}`, size: 64 * u, bg: color.cream,
    runs: [{ text: '했냐?', color: color.black }], rotate: -3, padX: 28 * u, padY: 16 * u });
  // 2. 그룹 · 주차 — 오른쪽 위, 검정 0°
  sticker(ctx, { x: W - m, y: m + 18 * u, font: `800 ${34 * u}px ${GOTHIC}`, size: 34 * u, bg: color.black,
    runs: [{ text: `${input.groupName} · ${input.weekLabel}`, color: color.cream }], padX: 22 * u, padY: 14 * u, anchor: 'right' });

  // 3. 했다. — 가장 큼, 빨강 −5°, 화면 폭 60% 이상
  const didY = square ? H * 0.42 : H * 0.55;
  const did = sticker(ctx, { x: m, y: didY, font: `${210 * u}px ${DISPLAY}`, size: 210 * u, bg: color.red,
    runs: [{ text: '했다.', color: color.black }], rotate: -5, padX: 44 * u, padY: 14 * u, minWidth: W * 0.62, lineGap: 1.05 });
  // 4. n/목표 — 검정 0°, 했다. 바로 아래
  const cntY = didY + did.h + 34 * u;
  const cnt = sticker(ctx, { x: m, y: cntY, font: `${118 * u}px ${DISPLAY}`, size: 118 * u, bg: color.black,
    runs: [{ text: String(input.weekCount), color: color.cream }, { text: `/${input.weeklyGoal}`, color: color.gray }],
    padX: 30 * u, padY: 10 * u, lineGap: 1.05 });
  // 5. 이름 메모 — 크림 +2°, n/목표 옆
  sticker(ctx, { x: m + cnt.w + 22 * u, y: cntY + 16 * u, font: `800 ${38 * u}px ${GOTHIC}`, size: 38 * u, bg: color.cream,
    runs: [[{ text: `${input.nickname},`, color: color.black }], [{ text: input.memo, color: color.black }]],
    rotate: 2, padX: 22 * u, padY: 14 * u, lineGap: 1.3 });

  // 6. 날짜 — 왼쪽 아래, 크림 0°
  const bottomY = H - m - 70 * u;
  sticker(ctx, { x: m, y: bottomY, font: `800 ${34 * u}px ${GOTHIC}`, size: 34 * u, bg: color.cream,
    runs: [{ text: input.timeLabel, color: color.black }], padX: 22 * u, padY: 14 * u });
  // 7. 너도 했냐 → — 오른쪽 아래, 빨강 0° (외부 공유 유입 문구)
  sticker(ctx, { x: W - m, y: bottomY, font: `800 ${34 * u}px ${GOTHIC}`, size: 34 * u, bg: color.red,
    runs: [{ text: '너도 했냐 →', color: color.black }], padX: 22 * u, padY: 14 * u, anchor: 'right' });

  return toBlob(c);
}

export const makeStoryCard = (i: DidCardInput) => drawDid(i, 1080, 1920);
export const makeDidSquareCard = (i: DidCardInput) => drawDid(i, 1200, 1200);

/** 재촉 카드 1200×1200: 빨강 바탕 전체 + "○○야 했냐?" + 아래 검정 띠 */
export async function makeNudgeCard(i: NudgeCardInput): Promise<Blob> {
  const W = 1200;
  const H = 1200;
  await ensureFonts(`${i.callName}했냐?0123456789/ 일째무소식다들기다리는중.${i.groupName}${i.weekLabel}눌러서인증하기→`);
  const { c, ctx } = canvasOf(W, H);
  const m = 72;
  ctx.fillStyle = color.red;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color.black;
  ctx.textBaseline = 'alphabetic';

  ctx.font = `800 34px ${GOTHIC}`;
  ctx.fillText(i.groupName, m, m + 30);
  ctx.textAlign = 'right';
  ctx.fillText(i.weekLabel, W - m, m + 30);
  ctx.textAlign = 'left';

  // 헤드라인: 두 줄, 화면 폭을 꽉 채우게
  let size = 270;
  ctx.font = `${size}px ${DISPLAY}`;
  const widest = Math.max(ctx.measureText(i.callName).width, ctx.measureText('했냐?').width);
  if (widest > W - m * 2) {
    size = Math.floor((size * (W - m * 2)) / widest);
    ctx.font = `${size}px ${DISPLAY}`;
  }
  const lh = size * 0.92;
  ctx.fillText(i.callName, m - 6, m + 70 + lh);
  ctx.fillText('했냐?', m - 6, m + 70 + lh * 2);

  // n/목표 + 문장
  const y = m + 70 + lh * 2 + 150;
  ctx.font = `120px ${DISPLAY}`;
  const cnt = `${i.weekCount}/${i.weeklyGoal}`;
  ctx.fillText(cnt, m, y);
  const cw = ctx.measureText(cnt).width;
  ctx.font = `800 40px ${GOTHIC}`;
  const first = i.daysSilent > 0 ? `${i.daysSilent}일째 무소식.` : '이번 주 아직이다.';
  ctx.fillText(first, m + cw + 36, y - 58);
  ctx.fillText('다들 기다리는 중.', m + cw + 36, y - 6);

  // 아래 띠: 워드마크 + 유입 문구
  const bandH = 170;
  ctx.fillStyle = color.black;
  ctx.fillRect(0, H - bandH, W, bandH);
  ctx.fillStyle = color.cream;
  ctx.font = `70px ${DISPLAY}`;
  ctx.fillText('했냐?', m, H - bandH / 2 + 26);
  ctx.font = `800 36px ${GOTHIC}`;
  ctx.textAlign = 'right';
  ctx.fillText('눌러서 인증하기 →', W - m, H - bandH / 2 + 13);
  ctx.textAlign = 'left';
  return toBlob(c);
}
