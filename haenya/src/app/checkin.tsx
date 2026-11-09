import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Placeholder } from '../components/Placeholder';

export default function Checkin() {
  return (
    <Placeholder title="인증샷" sentence="오늘 찍은 사진만 된다. (STAGE 4)">
      <Button label="지금 찍기" onPress={() => router.replace('/checkin-done')} />
      <Button variant="secondary" label="앨범에서 고르기" />
    </Placeholder>
  );
}
