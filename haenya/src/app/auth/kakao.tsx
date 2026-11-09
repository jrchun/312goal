import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Placeholder } from '../../components/Placeholder';
import { completeKakaoSignIn } from '../../lib/auth';
import { nextRoute, useSession } from '../../lib/session';

/** 카카오 로그인 후 돌아오는 곳: 인가 코드 → ID 토큰 → Supabase 로그인 → 갈 곳으로 */
export default function KakaoCallback() {
  const { code, state, error } = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const { refresh } = useSession();
  // 사용자가 동의 화면에서 취소하면 error=access_denied 로 돌아온다
  const [failed, setFailed] = useState(!!error);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || error) return;
    started.current = true;
    (async () => {
      try {
        const next = await completeKakaoSignIn({ code, state });
        const s = await refresh();
        if (!s.session) throw new Error('NO_SESSION');
        router.replace(nextRoute(s, next) as never);
      } catch (e) {
        console.warn('kakao login failed', e);
        setFailed(true);
      }
    })();
  }, [code, state, error, refresh]);

  if (failed) {
    return (
      <Placeholder title="안 됐다." sentence={error === 'access_denied' ? '로그인을 취소했다.' : '로그인이 안 됐다. 다시 해봐.'}>
        <Button label="처음으로" onPress={() => router.replace('/')} />
      </Placeholder>
    );
  }
  return <Placeholder title="들어가는 중." sentence="잠깐만." />;
}
