/** 내 영상 (앱) — 2단계에서 구현. 지금은 웹에서만 */
import type { ClipEvents, ClipHandle, ClipInput, ClipSaveResult } from './clip.types';

export * from './clip.types';
export const perPhoto = (n: number) => Math.max(0.2, Math.min(0.5, 20 / Math.max(1, n)));
export const clipSeconds = (n: number) => 1.4 + n * perPhoto(n) + 2.6;
export function mountClip(_el: unknown, _c: ClipInput, events: ClipEvents): ClipHandle {
  events.recorded(null);
  return { replay: () => undefined, destroy: () => undefined };
}
export async function saveClip(_b: Blob, _f: string): Promise<ClipSaveResult> {
  return 'cancelled';
}
