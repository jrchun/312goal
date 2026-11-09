/** 앱(native)에서는 홈 화면 추가가 필요 없다 */
export type Where = 'kakao-ios' | 'kakao-android' | 'ios-safari' | 'ios-other' | 'android-chrome' | 'android-other' | 'standalone' | 'desktop';
export const where = (): Where => 'standalone';
export const openInExternalBrowser = (_url: string) => undefined;
export const setManifestStart = (_start: string) => undefined;
export const canPromptInstall = () => false;
export const promptInstall = async () => false;
