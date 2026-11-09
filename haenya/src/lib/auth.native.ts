/**
 * 카카오 로그인 (앱) — 2단계(iOS·안드로이드 출시) 때 구현.
 * 웹과 같은 방식(카카오 OpenID Connect → /api/kakao-token → signInWithIdToken)을
 * expo-web-browser 로 열 예정. 지금은 웹만 지원한다.
 */
export async function signInWithKakao(_next = '/'): Promise<void> {
  throw new Error('앱 로그인은 2단계에서 지원');
}

export async function completeKakaoSignIn(_params: { code?: string; state?: string }): Promise<string> {
  throw new Error('앱 로그인은 2단계에서 지원');
}
