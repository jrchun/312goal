import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { Placeholder } from '../../components/Placeholder';
import { nextRoute, useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';

/** 카카오 로그인 후 돌아오는 곳: code → 세션, 그다음 갈 곳으로 */
export default function AuthCallback() {
  const { code, next, error_description } = useLocalSearchParams<{
    code?: string; next?: string; error_description?: string;
  }>();
  const { refresh } = useSession();
  const [failed, setFailed] = useState(!!error_description);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || error_description) return;
    started.current = true;
    (async () => {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const state = await refresh();
        if (!state.session) throw new Error('no session');
        router.replace(nextRoute(state, next) as never);
      } catch (e) {
        console.warn('login failed', e);
        setFailed(true);
      }
    })();
  }, [code, next, error_description, refresh]);

  if (failed) {
    return (
      <Placeholder title="안 됐다." sentence="로그인이 안 됐다. 다시 해봐.">
        <Button label="처음으로" onPress={() => router.replace('/')} />
      </Placeholder>
    );
  }
  return <Placeholder title="들어가는 중." sentence="잠깐만." />;
}
