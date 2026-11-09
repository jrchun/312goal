/** 이미지 공유 (앱) — 2단계 */
export async function shareImage(_blob: Blob, _filename: string): Promise<'shared' | 'cancelled' | 'manual'> {
  return 'manual';
}
