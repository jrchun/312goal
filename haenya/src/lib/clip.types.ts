/** 내 영상 — 웹·앱 공용 타입 */
export type ClipPhoto = {
  url: string;
  date: string; // check_date
  verified: boolean;
  counted: boolean;
  n: number; // 이 사진까지 올해 누적
};

export type ClipInput = {
  name: string;
  groupName: string;
  year: number;
  total: number; // 올해 누적 (옛 기록 포함)
  before: number; // 사진 없는 앞선 기록 (옛 사이트 등)
  goal: number | null;
  photos: ClipPhoto[]; // 오래된 것부터
};

export type ClipEvents = {
  state: (s: 'loading' | 'playing' | 'done') => void;
  progress: (loaded: number, total: number) => void;
  recorded: (blob: Blob | null) => void;
  time?: (ratio: number) => void;
};

export type ClipHandle = { replay: () => void; destroy: () => void };
export type ClipSaveResult = 'shared' | 'cancelled' | 'downloaded' | 'kakao';

/** my_tab 데이터 → 영상 재료. 올해 사진만, 오래된 것부터. 인정된 사진마다 숫자가 하나씩 오른다 */
export function buildClipInput(o: {
  name: string; groupName: string; year: number; total: number; goal: number | null;
  photos: { check_date: string; created_at: string; counted: boolean; date_verified: boolean; photo_path: string }[];
  urls: Record<string, string>;
}): ClipInput {
  const ps = o.photos
    .filter((p) => p.check_date.startsWith(String(o.year)) && o.urls[p.photo_path])
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const counted = ps.filter((p) => p.counted).length;
  const before = Math.max(0, o.total - counted);
  let n = before;
  const photos = ps.map((p) => {
    if (p.counted) n += 1;
    return { url: o.urls[p.photo_path], date: p.check_date, verified: p.date_verified, counted: p.counted, n: Math.max(n, 1) };
  });
  return { name: o.name, groupName: o.groupName, year: o.year, total: o.total, before, goal: o.goal, photos };
}
