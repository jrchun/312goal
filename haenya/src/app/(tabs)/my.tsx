import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Placeholder } from '../../components/Placeholder';
import { useSession } from '../../lib/session';

export default function My() {
  const { signOut } = useSession();
  return (
    <Placeholder title="5/150" sentence="시즌 누적, 연말 예측, 52주 기록. (STAGE 6)">
      <Button variant="secondary" label="설정" onPress={() => router.push('/settings')} />
      <Button variant="text" label="로그아웃" onPress={async () => { await signOut(); router.replace('/'); }} />
    </Placeholder>
  );
}
