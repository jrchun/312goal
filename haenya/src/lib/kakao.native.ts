/** 카카오톡 공유 (앱) — 2단계에서 카카오 네이티브 SDK로 구현 */
export async function shareCardToKakao(_o: {
  image: Blob; title: string; description: string; link: string; buttonTitle: string;
}): Promise<void> {
  throw new Error('앱 카톡 공유는 2단계에서 지원');
}
