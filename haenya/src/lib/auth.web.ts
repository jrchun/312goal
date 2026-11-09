import { supabase } from './supabase';

/** 이메일 없이 닉네임·프로필 사진만 요청 */
export const KAKAO_SCOPES = 'profile_nickname profile_image';

/**
 * 카카오 로그인 (웹): 카카오 화면으로 이동했다가 /auth/callback?next=... 으로 돌아온다.
 * next: 로그인 후 보낼 경로 (예: 초대 링크 /join/ABCD2345)
 */
export async function signInWithKakao(next = '/'): Promise<void> {
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo, scopes: KAKAO_SCOPES },
  });
  if (error) throw error;
}
