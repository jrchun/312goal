import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anonKey) {
  console.warn('Supabase 설정 없음: haenya/.env.local 에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 를 넣어줘.');
}

// 정적 HTML을 만드는 동안(서버)에는 브라우저 저장소가 없으므로 세션을 저장하지 않는다.
export const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient(url || 'http://localhost', anonKey || 'missing', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage, // 웹은 기본 localStorage
    persistSession: !isServer,
    autoRefreshToken: !isServer,
    // 카카오 로그인 후 돌아오면 /auth/callback 화면이 직접 code를 세션으로 바꾼다
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

/** 사진 버킷. 경로는 {group_id}/{user_id}/{uuid}.jpg */
export const CHECKIN_BUCKET = 'checkins';
