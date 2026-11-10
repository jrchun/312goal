/**
 * 비공개 버킷 사진 → 잠깐 쓰는 주소(서명 URL, 1시간). 같은 그룹 멤버만 받을 수 있다(Storage 권한).
 * 같은 사진은 주소를 다시 만들지 않고 재사용한다 → 탭을 다시 열어도 사진이 깜빡이거나 다시 내려받지 않는다.
 */
import { CHECKIN_BUCKET, supabase } from './supabase';

/** 작은 사진 경로: abc.jpg → abc_t.jpg (2026-11-10 이후 인증부터 있음. 없으면 큰 사진으로) */
export const thumbOf = (path: string) => path.replace(/\.jpg$/, '_t.jpg');

const LIFETIME_S = 3600;
const REUSE_MS = 50 * 60 * 1000; // 만든 지 50분까지 재사용
const signed = new Map<string, { url: string; at: number }>();

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of new Set(paths)) {
    const hit = signed.get(p);
    if (hit && now - hit.at < REUSE_MS) out[p] = hit.url;
    else missing.push(p);
  }
  if (missing.length) {
    const { data } = await supabase.storage.from(CHECKIN_BUCKET).createSignedUrls(missing, LIFETIME_S);
    for (const d of data ?? []) {
      if (d.path && d.signedUrl) {
        signed.set(d.path, { url: d.signedUrl, at: now });
        out[d.path] = d.signedUrl;
      }
    }
  }
  return out;
}

/** 이미 받은 주소만 바로 돌려준다 (화면 첫 그림용) */
export function cachedUrls(paths: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of paths) {
    const hit = signed.get(p);
    if (hit) out[p] = hit.url;
  }
  return out;
}

export function clearSignedUrls() {
  signed.clear();
}

export const REACTIONS: { key: 'fire' | 'muscle' | 'clap' | 'laugh'; label: string }[] = [
  { key: 'fire', label: '🔥' },
  { key: 'muscle', label: '💪' },
  { key: 'clap', label: '👏' },
  { key: 'laugh', label: '😂' },
];
