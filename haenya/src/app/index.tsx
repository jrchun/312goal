import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Placeholder } from '../components/Placeholder';

/** 일반 랜딩 (/) — STAGE 7에서 완성 */
export default function Landing() {
  return (
    <Placeholder title="했냐?" sentence="친구끼리 운동 인증. 사진 한 장이면 끝. 안 하면 단톡방에서 찔린다.">
      <Button label="우리 그룹 만들기" onPress={() => router.push('/login')} />
      <Button variant="secondary" label="(개발용) 홈 보기" onPress={() => router.push('/home')} />
    </Placeholder>
  );
}
