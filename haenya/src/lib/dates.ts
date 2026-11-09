/**
 * 날짜 규칙 (DB의 to_check_date / week_start 와 같은 계산).
 * 한국 시간 기준, 새벽 3시 이전은 전날. 한 주는 월요일 시작.
 * 화면 표시·사전 확인용이고, 최종 판정은 항상 DB(submit_checkin)가 한다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_START_MS = 3 * 60 * 60 * 1000;

/** 시각 → 인정 날짜 'YYYY-MM-DD' */
export function checkDate(at: Date = new Date()): string {
  return new Date(at.getTime() + KST_OFFSET_MS - DAY_START_MS).toISOString().slice(0, 10);
}

function parse(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}

/** 날짜가 속한 주의 월요일 */
export function weekStart(d: string): string {
  const x = parse(d);
  const dow = (x.getUTCDay() + 6) % 7; // 월=0 … 일=6
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}

/** ISO 주차 번호 (W01~W53) */
export function isoWeek(d: string): number {
  const x = parse(d);
  x.setUTCDate(x.getUTCDate() + 3 - ((x.getUTCDay() + 6) % 7)); // 그 주의 목요일
  const firstThursday = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((x.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/** "1월 14일 목 · 7:42" (한국 시간) */
export function stickerTime(at: Date): string {
  const k = new Date(at.getTime() + KST_OFFSET_MS);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const hh = k.getUTCHours();
  const mm = String(k.getUTCMinutes()).padStart(2, '0');
  return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 ${days[k.getUTCDay()]} · ${hh}:${mm}`;
}

/** 1~7 → 한·두·세… (그 이상은 숫자) */
export function countWord(n: number): string {
  return ['', '한', '두', '세', '네', '다섯', '여섯', '일곱'][n] ?? String(n);
}
