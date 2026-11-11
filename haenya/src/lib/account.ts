/**
 * 인증 삭제 · 그룹 나가기 · 회원 탈퇴.
 * 사진 파일은 SQL로 못 지우므로(Storage 보호) 먼저 Storage API로 내 폴더를 비우고 DB 함수를 부른다.
 */
import { thumbOf } from './photos';
import { CHECKIN_BUCKET, supabase } from './supabase';

/** {group}/{me}/ 폴더의 내 사진 파일을 모두 지운다 */
async function removeMyPhotos(groupId: string, userId: string) {
  const prefix = `${groupId}/${userId}`;
  for (let round = 0; round < 20; round++) {
    const { data, error } = await supabase.storage.from(CHECKIN_BUCKET).list(prefix, { limit: 100 });
    if (error) throw new Error('PHOTO_DELETE_FAILED');
    if (!data || data.length === 0) return;
    const { error: e } = await supabase.storage.from(CHECKIN_BUCKET).remove(data.map((f) => `${prefix}/${f.name}`));
    if (e) throw new Error('PHOTO_DELETE_FAILED');
    if (data.length < 100) return;
  }
}

/** 인증 하나 지우기 (사진 파일 + 기록). 인정된 것이면 같은 날 다음 사진이 인정으로 올라간다(DB 트리거) */
/**
 * 인증 지우기. keepCount = 사진만 지우고 횟수는 남긴다(사용자 결정 2026-11-11: 지울 때 "횟수도 뺄까?"를 묻는다).
 * 사진 파일 먼저(Storage) → DB. keepCount면 인증 기록은 남기고 사진 목록에서만 빠진다(remove_checkin_photo)
 */
export async function deleteCheckin(c: { id: string; photo_path: string }, keepCount = false) {
  const { error: e1 } = await supabase.storage.from(CHECKIN_BUCKET).remove([c.photo_path, thumbOf(c.photo_path)]);
  if (e1) throw new Error('PHOTO_DELETE_FAILED');
  const { error } = keepCount
    ? await supabase.rpc('remove_checkin_photo', { p_checkin_id: c.id })
    : await supabase.from('checkins').delete().eq('id', c.id);
  if (error) throw new Error(error.message);
}

export async function leaveGroup(groupId: string, userId: string) {
  await removeMyPhotos(groupId, userId);
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  if (error) throw new Error(error.message);
}

export async function deleteMyAccount(groupId: string | null, userId: string) {
  if (groupId) await removeMyPhotos(groupId, userId);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  // 계정이 이미 지워졌으니 서버 로그아웃은 403이 난다 → 이 브라우저의 로그인 정보만 지운다
  await supabase.auth.signOut({ scope: 'local' });
}
