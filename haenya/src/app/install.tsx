import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { InstallGuide } from '../components/InstallGuide';
import { Placeholder } from '../components/Placeholder';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { signInWithTransferToken } from '../lib/device-auth';
import { where } from '../lib/env';
import { nextRoute, useSession } from '../lib/session';
import { color, space, type } from '../theme';

/**
 * 아이폰 홈 화면 추가용 주소 (/install?t=열쇠&code=초대코드)
 *  Safari 탭에서: 열쇠를 쓰지 않고 "홈 화면에 추가" 안내만 (아이콘이 이 주소로 시작하게)
 *  홈 화면 아이콘으로 처음 열렸을 때: 열쇠로 숫자 없이 로그인 → 홈. 열쇠가 만료됐으면 이름 + 4자리로
 */
export default function Install() {
  const { t, code } = useLocalSearchParams<{ t?: string; code?: string }>();
  const s = useSession();
  const [mode, setMode] = useState<'checking' | 'guide' | 'failed'>('checking');
  const started = useRef(false);

  useEffect(() => {
    if (s.loading || started.current) return;
    started.current = true;
    const standalone = where() === 'standalone';
    (async () => {
      if (s.session) return router.replace(nextRoute(s) as never);
      if (!standalone) return setMode('guide');
      try {
        if (!t) throw new Error('NO_TOKEN');
        await signInWithTransferToken(t);
        const state = await s.refresh();
        router.replace(nextRoute(state) as never);
      } catch {
        setMode('failed');
      }
    })();
  }, [s, t]);

  if (mode === 'failed') {
    return (
      <Placeholder title="한 번만 더." sentence="이어가기 시간이 지났다. 이름이랑 숫자 4자리로 들어오자. 이 아이콘에서는 이번 한 번이면 된다.">
        <Button label="내 기록 찾기" onPress={() => router.replace((code ? `/restore?code=${code}` : '/restore') as never)} />
      </Placeholder>
    );
  }
  if (mode === 'checking') return <Placeholder title="잠깐만." sentence="" />;

  const start = `/install?${t ? `t=${t}&` : ''}${code ? `code=${code}` : ''}`;
  return (
    <Screen>
      <Text style={styles.title}>홈 화면에{'\n'}넣자.</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>여기서 아이콘을 만들면 처음 열 때 바로 이어진다.</Text>
      <View style={styles.body}>
        <InstallGuide code={code} loggedIn={false} startOverride={start} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 64, lineHeight: 66, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(4) },
  body: { paddingTop: space(7) },
});
