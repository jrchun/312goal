import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { Placeholder } from '../components/Placeholder';
import { signInWithTransferToken } from '../lib/device-auth';
import { nextRoute, useSession } from '../lib/session';

/** 1회용 이어가기 열쇠로 들어오는 곳 (카톡 → 크롬 등). /continue?t=...&next=... */
export default function Continue() {
  const { t, next, code } = useLocalSearchParams<{ t?: string; next?: string; code?: string }>();
  const s = useSession();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (s.loading || started.current) return;
    started.current = true;
    (async () => {
      if (s.session) return router.replace((next || nextRoute(s)) as never);
      try {
        if (!t) throw new Error('NO_TOKEN');
        await signInWithTransferToken(t);
        const state = await s.refresh();
        router.replace((next && state.membership ? next : nextRoute(state)) as never);
      } catch {
        setFailed(true);
      }
    })();
  }, [s, t, next]);

  if (failed) {
    return (
      <Placeholder title="만료됐다." sentence="이어가기 링크는 10분, 한 번만 된다. 이름이랑 숫자로 찾자.">
        <Button label="내 기록 찾기" onPress={() => router.replace((code ? `/restore?code=${code}` : '/restore') as never)} />
      </Placeholder>
    );
  }
  return <Placeholder title="이어가는 중." sentence="잠깐만." />;
}
