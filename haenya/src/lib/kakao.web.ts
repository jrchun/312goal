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

/** 카드 이미지와 함께 카카오톡 공유 창을 연다 */
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
}
