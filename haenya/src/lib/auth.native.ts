import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

export const KAKAO_SCOPES = 'profile_nickname profile_image';

/** 카카오 로그인 (앱, 2단계용): 브라우저 창에서 로그인하고 haenya://auth/callback 으로 돌아온다. */
export async function signInWithKakao(next = '/'): Promise<void> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo, scopes: KAKAO_SCOPES, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;
  const code = new URL(result.url).searchParams.get('code');
  if (!code) return;
  router.replace({ pathname: '/auth/callback', params: { code, next } });
}
