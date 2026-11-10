/**
 * 카카오톡 공유 (웹) — Kakao JavaScript SDK 2.8.4.
 * 카드 이미지를 카카오 서버에 올리고(uploadImage, 최대 100일 보관) 피드 메시지로 보낸다(sendDefault, 검수 불필요).
 * 카카오 콘솔 필요 설정: JavaScript SDK 도메인 + 제품 링크 관리의 웹 도메인에 사이트 주소.
 */
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js';
const SDK_INTEGRITY = 'sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w';
const JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

type KakaoSDK = {
  isInitialized(): boolean;
  init(key: string): void;
  Share: {
    uploadImage(o: { file: File[] }): Promise<{ infos: { original: { url: string; width: number; height: number } } }>;
    sendDefault(o: unknown): void;
  };
};
declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

let loading: Promise<KakaoSDK> | null = null;

export function loadKakao(): Promise<KakaoSDK> {
  if (!JS_KEY) return Promise.reject(new Error('NO_KAKAO_JS_KEY'));
  if (loading) return loading;
  loading = new Promise<KakaoSDK>((resolve, reject) => {
    const ready = () => {
      const K = window.Kakao;
      if (!K) return reject(new Error('KAKAO_SDK_MISSING'));
      if (!K.isInitialized()) K.init(JS_KEY);
      resolve(K);
    };
    if (window.Kakao) return ready();
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.integrity = SDK_INTEGRITY;
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = ready;
    s.onerror = () => {
      loading = null;
      reject(new Error('KAKAO_SDK_LOAD_FAILED'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// ── 카톡 열기 버튼 (사파리 등 카톡 밖 브라우저용) ─────────────────────────────
// 아이폰 사파리는 "사람이 직접 누른 순간"에 이동해야 카톡 앱이 바로 열린다.
// 카드 그리기·이미지 올리기를 기다린 뒤에 sendDefault를 부르면 그 순간이 지나서
// talk-apps.kakao.com의 "카카오톡이 실행되지 않나요?" 화면이 뜬다.
// → 준비가 끝나면 "카톡으로 보내기" 버튼을 한 번 더 보여주고, 그 버튼을 누르는 순간 바로 보낸다.
// 카톡 안 브라우저에서는 이 문제가 없어서 바로 보낸다.
export type KakaoPending = { preview: string; send: () => void; cancel: () => void };
let pending: KakaoPending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const kakaoPendingStore = {
  get: () => pending,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

const inKakaoTalk = () => typeof navigator !== 'undefined' && /KAKAOTALK/i.test(navigator.userAgent);

/** 카드 이미지와 함께 카카오톡 공유 창을 연다. 사람이 취소하면 Error('CANCELLED') */
export async function shareCardToKakao(o: {
  image: Blob;
  title: string;
  description: string;
  link: string;
  buttonTitle: string;
}): Promise<void> {
  const K = await loadKakao();
  const file = new File([o.image], 'haenya.jpg', { type: 'image/jpeg' });
  const up = await K.Share.uploadImage({ file: [file] });
  const img = up.infos.original;
  const link = { mobileWebUrl: o.link, webUrl: o.link };
  const send = () =>
    K.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: o.title,
        description: o.description,
        imageUrl: img.url,
        imageWidth: img.width,
        imageHeight: img.height,
        link,
      },
      buttons: [{ title: o.buttonTitle, link }],
    });
  if (inKakaoTalk()) return send();
  const preview = URL.createObjectURL(o.image);
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      pending = null;
      URL.revokeObjectURL(preview);
      emit();
    };
    pending = {
      preview,
      send: () => {
        send(); // 누른 순간 그대로 (await 없이)
        done();
        resolve();
      },
      cancel: () => {
        done();
        reject(new Error('CANCELLED'));
      },
    };
    emit();
  });
}
