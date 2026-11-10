/**
 * 인증 올리기: 사진 업로드 → submit_checkin(DB가 날짜·하루 1회 판정) → 결과.
 * 결과는 인증 완료 화면(/checkin-done)이 읽도록 잠깐 메모리에 둔다.
 */
import { checkDate } from './dates';
import type { PreparedPhoto } from './photo';
import { thumbOf } from './photos';
import { CHECKIN_BUCKET, supabase } from './supabase';

export type CheckinResult = {
  checkin_id: string;
  check_date: string;
  counted: boolean;
  date_verified: boolean;
  week_count: number;
  weekly_goal: number | null;
  season_count: number;
  season_goal: number;
  previewUrl: string;
  takenAt: Date | null;
};

let last: CheckinResult | null = null;
export const lastCheckin = () => last;

function uuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/** 오류는 DB 오류 코드(message)로 던진다 → errorMessage()로 문구 변환 */
export async function submitCheckin(groupId: string, userId: string, photo: PreparedPhoto): Promise<CheckinResult> {
  // 서버에 올리기 전에 먼저 걸러서 쓸데없는 업로드를 막는다 (최종 판정은 DB)
  if (photo.takenAt && checkDate(photo.takenAt) !== checkDate()) {
    throw new Error('PHOTO_NOT_TODAY');
  }
  const path = `${groupId}/${userId}/${uuid()}.jpg`;
  // 큰 사진과 작은 사진(격자용)을 동시에 올린다. 작은 사진은 실패해도 인증은 그대로 — 화면이 큰 사진으로 대신 보여준다
  const [up] = await Promise.all([
    supabase.storage.from(CHECKIN_BUCKET).upload(path, photo.blob, { contentType: 'image/jpeg', upsert: false }),
    photo.thumb
      ? supabase.storage
          .from(CHECKIN_BUCKET)
          .upload(thumbOf(path), photo.thumb, { contentType: 'image/jpeg', upsert: false })
          .then(() => undefined, () => undefined)
      : undefined,
  ]);
  if (up.error) {
    await supabase.storage.from(CHECKIN_BUCKET).remove([thumbOf(path)]).then(() => undefined, () => undefined);
    throw new Error('UPLOAD_FAILED');
  }

  const { data, error } = await supabase
    .rpc('submit_checkin', {
      p_group_id: groupId,
      p_photo_path: path,
      p_taken_at: photo.takenAt ? photo.takenAt.toISOString() : null,
    })
    .single();
  if (error || !data) {
    await supabase.storage.from(CHECKIN_BUCKET).remove([path, thumbOf(path)]); // 거절되면 올린 사진도 지운다
    throw new Error(error?.message ?? 'SUBMIT_FAILED');
  }
  last = { ...(data as Omit<CheckinResult, 'previewUrl' | 'takenAt'>), previewUrl: photo.previewUrl, takenAt: photo.takenAt };
  return last;
}
