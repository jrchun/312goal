/** 받침이 있으면 true (한글이 아니면 false) */
function hasBatchim(word: string): boolean {
  const c = word.trim().slice(-1).charCodeAt(0);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}

/** 부를 때: 민지 → 민지야, 고은 → 고은아 */
export function callName(name: string): string {
  return `${name}${hasBatchim(name) ? '아' : '야'}`;
}

/** 1 → 첫, 2 → 두 … ("이번 주 두 번째") */
export function ordinalWord(n: number): string {
  return ['', '첫', '두', '세', '네', '다섯', '여섯', '일곱'][n] ?? String(n);
}
