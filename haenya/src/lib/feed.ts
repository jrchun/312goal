/**
 * 그룹 소식 (사용자 결정 2026-11-10) — 그룹에서 일어난 일을 한 줄씩.
 * 기록은 DB가 남기고(docs/schema.sql 2-1, 9-4), 여기서는 읽어서 문장으로 바꾼다.
 * 새 종류를 DB에 추가하면 feedText에도 추가한다(모르는 종류는 화면에서 건너뛴다).
 */
import { fetchInto } from './cache';
import { checkDate } from './dates';
import { subj } from './korean';
import { supabase } from './supabase';

export type FeedEvent = {
  id: number;
  kind: string;
  actor: string | null;
  target: string | null;
  data: Record<string, unknown> & { actor_name?: string; target_name?: string };
  created_at: string;
};

export const feedKey = (gid: string) => `feed:${gid}`;

export function loadFeed(gid: string): Promise<FeedEvent[]> {
  return fetchInto(feedKey(gid), async () => {
    const { data, error } = await supabase.rpc('group_feed', { p_group_id: gid });
    if (error) throw new Error(error.message);
    return (data as FeedEvent[]) ?? [];
  });
}

/** 홈에서 "소식"을 누르고 그룹 탭으로 갈 때, 그룹 탭이 소식 칸을 열도록 남기는 쪽지 */
let openFeed = false;
export const askFeedView = () => {
  openFeed = true;
};
export const takeFeedView = () => {
  const v = openFeed;
  openFeed = false;
  return v;
};

const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);

/** 소식 한 줄. warn = 감시용(숫자 초기화)이라 빨간 글씨. 모르는 종류면 null */
export function feedText(e: FeedEvent): { text: string; warn?: boolean } | null {
  const d = e.data;
  const a = d.actor_name ?? '누군가';
  const t = d.target_name ?? '누군가';
  switch (e.kind) {
    case 'checkin': {
      const weekly = num(d.weekly_goal);
      const count = weekly == null ? `올해 ${num(d.season_count) ?? 0}번째.` : `이번 주 ${num(d.week_count) ?? 0}/${weekly}.`;
      const min = num(d.after_nudge_min);
      const after = min == null ? '' : ` 찔리고 ${min < 60 ? `${Math.max(1, min)}분` : `${Math.round(min / 60)}시간`} 만에.`;
      return { text: `${a} 했다. ${count}${d.verified === false ? ' 날짜 미확인.' : ''}${after}` };
    }
    case 'nudge': {
      const n = num(d.week_nudged) ?? 1;
      return { text: `${subj(a)} ${t} 찔렀다.${n >= 2 ? ` ${t} 이번 주 ${n}번째.` : ''}` };
    }
    case 'nudge_all':
      return { text: `${subj(a)} 다 같이 찔렀다. ${num(d.count) ?? 0}명.` };
    case 'milestone':
      return { text: `${a} ${num(d.count) ?? 0}회 찍었다.` };
    case 'goal_done':
      return { text: `${a} 올해 목표 끝. ${num(d.count) ?? 0}회.` };
    case 'overtake': {
      const passed = Array.isArray(d.passed) ? (d.passed as string[]) : [];
      return passed.length ? { text: `${subj(a)} ${passed.join('·')} 제치고 ${num(d.rank) ?? ''}등.` } : null;
    }
    case 'silence':
      return { text: `${t} ${num(d.days) ?? 0}일째 무소식.` };
    case 'pin_reset':
      return { text: `그룹장 ${subj(a)} ${t} 숫자를 초기화했다.`, warn: true };
    case 'goal_change':
      return { text: `${a}, 올해 목표 ${d.from} → ${d.to}.` };
    case 'checkin_delete': {
      const [, m, day] = String(d.date ?? '').split('-');
      return { text: `${subj(a)} ${Number(m)}월 ${Number(day)}일 인증을 지웠다.` };
    }
    case 'photo_remove': {
      const [, m, day] = String(d.date ?? '').split('-');
      return { text: `${subj(a)} ${Number(m)}월 ${Number(day)}일 인증 사진을 지웠다. 횟수는 그대로.` };
    }
    case 'group_rename':
      return { text: `그룹 이름 ${d.from} → ${d.to}.` };
    case 'weekly_goal':
      if (d.to == null) return { text: '주간 목표를 없앴다. 이제 올해 목표만.' };
      if (d.from == null) return { text: `주간 목표가 생겼다. 주 ${d.to}회.` };
      return { text: `주간 목표 ${d.from} → ${d.to}회.` };
    case 'join':
      return { text: `${a} 들어왔다.` };
    case 'seat':
      return { text: `${subj(a)} 자리 찾아 들어왔다.` };
    case 'leave':
      return { text: `${a} 나갔다.` };
    case 'owner_change':
      return { text: `이제 그룹장은 ${t}.` };
    case 'rename':
      return { text: `${d.from} → ${d.to}. 이름 바꿨다.` };
    default:
      return null;
  }
}

const KST_MS = 9 * 60 * 60 * 1000;

/** 오늘이면 "16:47", 아니면 "11월 9일" (하루 기준은 새벽 3시) */
export function feedTime(iso: string): string {
  const at = new Date(iso);
  const k = new Date(at.getTime() + KST_MS);
  if (checkDate(at) === checkDate()) return `${k.getUTCHours()}:${String(k.getUTCMinutes()).padStart(2, '0')}`;
  const [, m, d] = checkDate(at).split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 날짜 묶음 제목: 오늘 / 어제 / 11월 8일 */
export function feedDay(iso: string): string {
  const day = checkDate(new Date(iso));
  const today = checkDate();
  if (day === today) return '오늘';
  if (day === checkDate(new Date(Date.now() - 86400000))) return '어제';
  const [, m, d] = day.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 묶음 안에서는 시각만 */
export function feedClock(iso: string): string {
  const k = new Date(new Date(iso).getTime() + KST_MS);
  return `${k.getUTCHours()}:${String(k.getUTCMinutes()).padStart(2, '0')}`;
}
