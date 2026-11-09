/** docs/schema.sql 테이블과 맞춘 타입 (필요한 칸만) */
export type Profile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  terms_agreed_at: string | null;
};

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  weekly_goal: number;
  season_goal: number;
  owner_id: string;
};

export type Membership = {
  season_goal: number;
  joined_at: string;
  role: 'owner' | 'member';
  group: Group;
};

export type InvitePreview = {
  group_name: string;
  owner_nickname: string | null;
  member_count: number;
  weekly_goal: number;
  week_total: number;
  week_target: number;
  season_year: number;
  is_full: boolean;
};

/** group_week_board() 한 줄 */
export type BoardRow = {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  is_me: boolean;
  week_count: number;
  weekly_goal: number;
  season_count: number;
  season_goal: number;
  last_check_date: string | null;
  days_silent: number;
  streak_weeks: number;
  rank_weeks: number;
  rank: number;
};

/** 사진 한 장 (checkins 한 줄) */
export type CheckinRow = {
  id: string;
  user_id: string;
  check_date: string;
  photo_path: string;
  date_verified: boolean;
  counted: boolean;
  created_at: string;
};

export type ReactionKey = 'fire' | 'muscle' | 'clap' | 'laugh';
export type ReactionRow = { checkin_id: string; user_id: string; emoji: ReactionKey };

/** my_stats() */
export type MyStats = {
  season_year: number;
  season_count: number;
  season_goal: number;
  projected: number;
  streak_weeks: number;
  nudges_sent: number;
  nudges_received: number;
};

/** my_weeks() 한 줄 */
export type MyWeek = { week: string; cnt: number; achieved: boolean; is_current: boolean };
