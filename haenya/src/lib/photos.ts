/** 비공개 버킷 사진 → 잠깐 쓰는 주소(서명 URL, 1시간). 같은 그룹 멤버만 받을 수 있다(Storage 권한) */
import { CHECKIN_BUCKET, supabase } from './supabase';

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(CHECKIN_BUCKET).createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

export const REACTIONS: { key: 'fire' | 'muscle' | 'clap' | 'laugh'; label: string }[] = [
  { key: 'fire', label: '🔥' },
  { key: 'muscle', label: '💪' },
  { key: 'clap', label: '👏' },
  { key: 'laugh', label: '😂' },
];
