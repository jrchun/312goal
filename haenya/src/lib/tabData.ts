/**
 * 탭 데이터 받기 (한 번의 요청) + 임시 저장 + 사진 주소 미리 준비.
 * 홈에서 미리 불러 두면 그룹·마이 탭이 바로 뜬다.
 */
import { fetchInto } from './cache';
import { signedUrls, thumbOf } from './photos';
import { supabase } from './supabase';
import type { BoardRow, CheckinRow, MyStats, MyWeek, ReactionRow } from './types';

export type GroupTab = { board: BoardRow[]; checkins: CheckinRow[]; reactions: ReactionRow[]; urls: Record<string, string> };
export type MyTab = { stats: MyStats | null; weeks: MyWeek[]; photos: CheckinRow[]; urls: Record<string, string> };

export const groupKey = (gid: string) => `group-tab:${gid}`;
export const myKey = (gid: string, uid: string) => `my-tab:${gid}:${uid}`;
export const boardKey = (gid: string) => `board:${gid}`;

export function loadGroupTab(gid: string): Promise<GroupTab> {
  return fetchInto(groupKey(gid), async () => {
    const { data, error } = await supabase.rpc('group_tab', { p_group_id: gid });
    if (error) throw new Error(error.message);
    const d = data as Omit<GroupTab, 'urls'>;
    const urls = await signedUrls(d.checkins.flatMap((c) => [c.photo_path, thumbOf(c.photo_path)]));
    return { ...d, urls };
  });
}

export function loadMyTab(gid: string, uid: string): Promise<MyTab> {
  return fetchInto(myKey(gid, uid), async () => {
    const { data, error } = await supabase.rpc('my_tab', { p_group_id: gid });
    if (error) throw new Error(error.message);
    const d = data as Omit<MyTab, 'urls'>;
    const urls = await signedUrls(d.photos.flatMap((c) => [c.photo_path, thumbOf(c.photo_path)]));
    return { ...d, urls };
  });
}

export function loadBoard(gid: string): Promise<BoardRow[]> {
  return fetchInto(boardKey(gid), async () => {
    const { data, error } = await supabase.rpc('group_week_board', { p_group_id: gid });
    if (error) throw new Error(error.message);
    return (data as BoardRow[]) ?? [];
  });
}
