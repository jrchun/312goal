import { Platform, Share } from 'react-native';

/** 배포 주소. 웹에서는 지금 열린 주소를 쓰고, 앱에서는 EXPO_PUBLIC_SITE_URL */
export function siteUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return process.env.EXPO_PUBLIC_SITE_URL ?? 'http://localhost:8081';
}

export function inviteUrl(code: string): string {
  return `${siteUrl()}/join/${code}`;
}

/** 초대 링크 복사(웹) 또는 공유 시트(앱). 카톡 공유 카드는 STAGE 5 */
export async function copyOrShareInvite(code: string): Promise<'copied' | 'shared' | 'failed'> {
  const url = inviteUrl(code);
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
    await Share.share({ message: `너도 했냐? ${url}` });
    return 'shared';
  } catch {
    return 'failed';
  }
}
