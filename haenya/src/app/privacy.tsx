import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Placeholder } from '../components/Placeholder';

/** 개인정보처리방침 — 정식 초안은 STAGE 8 */
export default function Privacy() {
  return (
    <Placeholder title="개인정보" sentence="모으는 것: 카카오 닉네임, 프로필 사진, 인증 사진. 정식 방침은 오픈 전에 채운다. (STAGE 8)">
      <Button variant="secondary" label="돌아가기" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Placeholder>
  );
}
