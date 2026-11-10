import { checkDate } from './dates';

/**
 * "연간 목표만" 그룹 (주간 목표 없음, weekly_goal null — 사용자 결정 2026-11-10, 312_2026).
 * 옛 312goal처럼 각자 올해 목표 대비 %와 "연도 대비 몇 회 앞섬/모자람"으로 본다.
 */
export const isAnnual = (weeklyGoal: number | null | undefined): boolean => weeklyGoal == null;

/** 올해 목표 대비 %와, 오늘까지 있어야 할 횟수 대비 차이(+면 앞섬) */
export function seasonPace(count: number, goal: number, today = checkDate()): { pct: number; diff: number } {
  const [y, m, d] = today.split('-').map(Number);
  const start = Date.UTC(y, 0, 1);
  const day = (Date.UTC(y, m - 1, d) - start) / 86400000 + 1;
  const days = (Date.UTC(y + 1, 0, 1) - start) / 86400000;
  const expected = Math.round((goal * day) / days);
  return { pct: goal > 0 ? Math.floor((count / goal) * 100) : 0, diff: count - expected };
}

/** "5회 앞섰다." / "3회 모자라다." / "딱 맞다." */
export function paceSentence(diff: number): string {
  return diff > 0 ? `${diff}회 앞섰다.` : diff < 0 ? `${-diff}회 모자라다.` : '딱 맞다.';
}
