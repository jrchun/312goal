import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Placeholder } from '../components/Placeholder';

/** 이용약관 — 정식 초안은 STAGE 8 */
export default function Terms() {
  return (
    <Placeholder title="이용약관" sentence="정식 약관은 오픈 전에 채운다. (STAGE 8)">
      <Button variant="secondary" label="돌아가기" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Placeholder>
  );
}
