/** 지금 어디서 열렸나 (웹) — 홈 화면 추가 안내를 기기·브라우저별로 다르게 보여주려고 */
export type Where = 'kakao-ios' | 'kakao-android' | 'ios-safari' | 'ios-other' | 'android-chrome' | 'android-other' | 'standalone' | 'desktop';

export function where(): Where {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const standalone =
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return 'standalone';
  if (/KAKAOTALK/i.test(ua)) return ios ? 'kakao-ios' : android ? 'kakao-android' : 'desktop';
  if (ios) return /CriOS|FxiOS|EdgiOS|NAVER|Instagram|FBAN|Line/i.test(ua) ? 'ios-other' : 'ios-safari';
  if (android) return /Chrome/i.test(ua) && !/SamsungBrowser|NAVER|Instagram|FBAN|Line|wv\)/i.test(ua) ? 'android-chrome' : 'android-other';
  return 'desktop';
}

/** 카톡 인앱 브라우저에서 기본 브라우저(Safari·크롬)로 주소 열기 */
export function openInExternalBrowser(url: string) {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
}

/** 홈 화면 앱 설정 파일의 시작 주소 바꾸기 (아이폰: 추가하는 순간의 설정을 쓴다) */
export function setManifestStart(start: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = `/api/manifest?start=${encodeURIComponent(start)}`;
}

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallPrompt | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
  });
}

/** 안드로이드 크롬: 설치 창을 띄울 수 있으면 true */
export const canPromptInstall = () => !!deferred;
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const r = await deferred.userChoice;
  deferred = null;
  return r.outcome === 'accepted';
}
