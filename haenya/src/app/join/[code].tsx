import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/Button';
import { Placeholder } from '../../components/Placeholder';

/** 초대 랜딩 (/join/[code]) — STAGE 3에서 그룹 정보 조회 + 자동 합류 */
export default function Join() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <Placeholder title={'너도\n했냐?'} sentence={`초대 코드 ${code ?? ''}`}>
      <Button label="카카오 계정으로 참여" onPress={() => router.push('/login')} />
    </Placeholder>
  );
}
