import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Placeholder } from '../../components/Placeholder';

export default function My() {
  return (
    <Placeholder title="5/150" sentence="시즌 누적, 연말 예측, 52주 기록. (STAGE 6)">
      <Button variant="secondary" label="설정" onPress={() => router.push('/settings')} />
    </Placeholder>
  );
}
