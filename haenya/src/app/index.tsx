import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Form';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { signInWithKakao } from '../lib/auth';
import { nextRoute, useSession } from '../lib/session';
import { color, space, type } from '../theme';

/** 일반 랜딩 (/): 한 줄 소개 + 우리 그룹 만들기. 이미 로그인했으면 갈 곳으로 보낸다. */
export default function Landing() {
  const s = useSession();
  const [error, setError] = useState('');

  if (!s.loading && s.session) return <Redirect href={nextRoute(s) as never} />;

  const start = async () => {
    setError('');
    try {
      await signInWithKakao('/create-group');
    } catch {
      setError('카카오 로그인이 안 열렸다. 다시 해봐.');
    }
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={[type.caption, { color: color.black }]}>HAENYA</Text>
      </View>
      <Text style={[type.headline, styles.headline]} adjustsFontSizeToFit numberOfLines={1}>
        했냐?
      </Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>
        친구끼리 운동 인증.{'\n'}사진 한 장이면 끝.{'\n'}안 하면 단톡방에서 찔린다.
      </Text>
      <View style={styles.actions}>
        <Notice tone="error">{error}</Notice>
        <Button label="우리 그룹 만들기" onPress={start} />
        <Button variant="text" label="이미 계정 있어? 로그인" onPress={() => router.push('/login')} />
        <Text style={[type.caption, styles.center]}>앱 설치 없이 웹에서 바로 시작</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: space(4) },
  headline: { color: color.red, paddingTop: space(4), paddingBottom: space(2) },
  sentence: { color: color.black, paddingTop: space(4) },
  actions: { marginTop: 'auto', gap: space(2), paddingVertical: space(6) },
  center: { textAlign: 'center' },
});
