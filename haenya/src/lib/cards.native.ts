/** 공유 카드 (앱) — 2단계에서 react-native-view-shot 으로 구현 */
export type DidCardInput = {
  photoUrl: string; groupName: string; weekLabel: string; nickname: string;
  weekCount: number; weeklyGoal: number; memo: string; timeLabel: string;
};
export type NudgeCardInput = {
  groupName: string; weekLabel: string; callName: string; weekCount: number; weeklyGoal: number; daysSilent: number;
};
const notYet = async (): Promise<Blob> => {
  throw new Error('앱 공유 카드는 2단계에서 지원');
};
export const makeStoryCard = (_i: DidCardInput) => notYet();
export const makeDidSquareCard = (_i: DidCardInput) => notYet();
export const makeNudgeCard = (_i: NudgeCardInput) => notYet();
export type WeeklyCardInput = {
  groupName: string; weekLabel: string; groupTotal: number; groupTarget: number; achievedMembers: number; nudgeCount: number;
};
export const makeWeeklyCard = (_i: WeeklyCardInput) => notYet();
