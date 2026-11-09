/**
 * 인증 사진 (웹)
 *  pickPhoto: 카메라(지금 찍기) 또는 앨범에서 사진 한 장 고르기
 *  preparePhoto: 촬영 시각(EXIF) 읽기 → 긴 변 1600px JPEG로 다시 그리기
 * 다시 그리면(canvas) 원본의 메타정보가 모두 빠진다 → 위치(GPS)·기기 정보가 서버에 올라가지 않는다.
 */
import exifr from 'exifr/dist/lite.esm.mjs';

export type PreparedPhoto = {
  blob: Blob;
  /** 화면에 바로 보여줄 주소 (URL.createObjectURL) */
  previewUrl: string;
  /** 촬영 시각. 알 수 없으면 null → "날짜 미확인" */
  takenAt: Date | null;
  /** 촬영 시각을 어디서 얻었나: exif(사진 정보) / capture(방금 찍은 파일의 생성 시각) */
  takenAtSource: 'exif' | 'capture' | null;
  width: number;
  height: number;
};

const MAX_EDGE = 1600;
const QUALITY = 0.82;

/** 파일 고르기 창을 연다. 취소하면 null */
export function pickPhoto(mode: 'camera' | 'album'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (mode === 'camera') input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    let done = false;
    const finish = (f: File | null) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(f);
    };
    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

/** EXIF 촬영 시각. OffsetTimeOriginal(시간대)이 있으면 반영, 없으면 기기 시간대로 해석 */
async function readTakenAt(file: Blob): Promise<Date | null> {
  try {
    // 주의: lite 빌드는 pick 옵션을 쓰면 오류가 난다. 날짜는 직접 해석하려고 reviveValues: false
    const tags = await exifr.parse(file, { tiff: true, exif: true, gps: false, ifd1: false, interop: false, reviveValues: false });
    const raw: string | undefined = tags?.DateTimeOriginal ?? tags?.CreateDate;
    if (!raw || typeof raw !== 'string') return null;
    // "2027:01:14 07:42:10" → "2027-01-14T07:42:10"
    const m = raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    const offset: string | undefined = tags?.OffsetTimeOriginal;
    const d = new Date(offset && /^[+-]\d{2}:\d{2}$/.test(offset) ? iso + offset : iso);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  // 회전 정보(EXIF Orientation)를 반영해서 그린다
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height };
    } catch {
      /* 아래 방법으로 */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** "지금 찍기" 파일을 방금 찍은 것으로 보는 시간 범위 */
const CAPTURE_WINDOW_MS = 10 * 60 * 1000;

/**
 * 아이폰은 "지금 찍기"(카메라 바로 촬영) 사진에서 촬영 시각(EXIF)을 지워서 넘긴다 (2026.11 실기기 확인).
 * 그래서 카메라로 찍었고 EXIF 날짜가 없으면, 파일이 만들어진 시각(lastModified)이 10분 안일 때만 촬영 시각으로 쓴다.
 * 앨범 사진은 EXIF가 그대로 남아 있어 그걸로 판정한다.
 */
export async function preparePhoto(file: File, mode: 'camera' | 'album' = 'album'): Promise<PreparedPhoto> {
  const exifAt = await readTakenAt(file);
  const fresh = Math.abs(Date.now() - file.lastModified) <= CAPTURE_WINDOW_MS;
  const takenAt = exifAt ?? (mode === 'camera' && fresh ? new Date(file.lastModified) : null);
  const takenAtSource = exifAt ? 'exif' : takenAt ? 'capture' : null;
  const { source, width, height } = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('NO_CANVAS');
  ctx.drawImage(source, 0, 0, w, h);
  if ('close' in source && typeof source.close === 'function') source.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('ENCODE_FAILED'))), 'image/jpeg', QUALITY),
  );
  return { blob, previewUrl: URL.createObjectURL(blob), takenAt, takenAtSource, width: w, height: h };
}
