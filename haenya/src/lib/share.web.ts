/**
 * 이미지 공유·저장 (웹)
 * Web Share API로 파일 공유(아이폰 Safari: 공유 시트 → 인스타·사진에 저장)를 먼저 시도하고,
 * 안 되면(카톡 인앱 브라우저 등) 'manual'을 돌려준다 → 화면이 이미지를 띄워 "길게 눌러 저장"을 안내.
 */
export async function shareImage(blob: Blob, filename: string): Promise<'shared' | 'cancelled' | 'manual'> {
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
    }
  }
  return 'manual';
}
