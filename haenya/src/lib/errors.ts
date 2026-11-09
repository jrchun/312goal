/**
 * DB 함수가 던지는 오류 코드 → 화면 문구 (가이드라인 09 · 말투: 반말, 짧게, 마침표).
 * 코드는 docs/schema.sql 의 raise exception 과 짝을 맞춘다.
 */
const messages: Record<string, string> = {
  PHOTO_NOT_TODAY: '오늘 찍은 사진만 된다.',
  ALREADY_NUDGED: '오늘은 이미 찔렀다.',
  CANNOT_NUDGE_SELF: '자기는 못 찌른다.',
  TARGET_NOT_IN_GROUP: '우리 그룹 사람이 아니다.',
  GROUP_FULL: '꽉 찼다. 한 그룹은 12명까지.',
  ALREADY_IN_GROUP: '이미 다른 그룹에 있다.',
  INVALID_CODE: '없는 초대 링크다.',
  NOT_A_MEMBER: '이 그룹 멤버가 아니다.',
  NOT_LOGGED_IN: '로그인부터 하자.',
  BAD_PHOTO_PATH: '사진을 다시 올려줘.',
  UPLOAD_FAILED: '사진이 안 올라갔다. 다시 해봐.',
  PHOTO_UNREADABLE: '이 사진은 못 읽는다. 다른 사진으로 해봐.',
  PHOTO_DELETE_FAILED: '사진이 안 지워졌다. 다시 해봐.',
  BAD_PIN: '숫자 4자리로 해줘.',
  WRONG: '숫자가 틀렸다.',
  LOCKED: '너무 많이 틀렸다. 15분 뒤에 다시 해봐.',
  NO_PIN: '숫자를 안 정한 계정이다. 그룹장한테 초기화해달라고 해.',
  NOT_OWNER: '그룹장만 할 수 있다.',
  REGISTER_FAILED: '가입이 안 됐다. 잠깐 뒤에 다시 해봐.',
  RESTORE_FAILED: '되찾기가 안 됐다. 다시 해봐.',
};

export function errorMessage(error: unknown): string {
  const code = (error as { message?: string } | null)?.message?.trim() ?? '';
  return messages[code] ?? '잠깐 문제가 생겼다. 다시 해봐.';
}
