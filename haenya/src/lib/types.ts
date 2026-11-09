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
