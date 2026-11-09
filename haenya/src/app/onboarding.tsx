import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { InstallGuide } from '../components/InstallGuide';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { makeStoryCard } from '../lib/cards';
import { checkDate, isoWeek, stickerTime } from '../lib/dates';
import { siteUrl } from '../lib/invite';
import { displayName, nextRoute, profileComplete, useSession } from '../lib/session';
import { color, space, type } from '../theme';

/**
 * 온보딩 — 합류 직후 두 단계.
 *  1) 0번째 인증: 샘플 사진으로 스티커 카드까지 체험. DB에 기록하지 않는다
 *  2) 홈 화면에 추가 안내 (아이폰 Safari / 갤럭시 크롬 / 카톡 안)
 */
export default function Onboarding() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  const s = useSession();
  const [stage, setStage] = useState<'sample' | 'install'>('sample');
  const [card, setCard] = useState<string | null>(null);
  const g = s.membership?.group;

  useEffect(() => {
    if (step === 'install') setStage('install');
  }, [step]);

  useEffect(() => {
    if (stage !== 'sample' || !g) return;
    let alive = true;
    const today = checkDate();
    makeStoryCard({
      photoUrl: `${siteUrl()}/sample-checkin.jpg`,
      groupName: g.name,
      weekLabel: `W${String(isoWeek(today)).padStart(2, '0')}`,
      nickname: displayName(s.profile),
      weekCount: 0,
      weeklyGoal: g.weekly_goal,
      memo: '0번째 · 연습',
      timeLabel: stickerTime(new Date()),
    })
      .then((b) => alive && setCard(URL.createObjectURL(b)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [stage, g, s.profile]);

  if (!s.loading && (!s.session || !profileComplete(s) || !s.membership)) return <Redirect href={nextRoute(s) as never} />;

  if (stage === 'install') {
    return (
      <Screen>
        <Text style={styles.title}>홈 화면에{'\n'}넣자.</Text>
        <Rule />
        <Text style={[type.sentence, styles.sentence]}>앱처럼 아이콘으로 열면 매번 찾을 필요 없다.</Text>
        <View style={styles.body}>
          <InstallGuide code={g?.invite_code} loggedIn={!!s.session} />
        </View>
        <View style={styles.actions}>
          <Button variant="text" label="나중에, 홈으로" onPress={() => router.replace('/home')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>0번째{'\n'}인증.</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>샘플 사진으로 해본 거다. 기록엔 안 남는다. 진짜는 운동하고 찍으면 이렇게 나온다.</Text>
      <View style={styles.cardBox}>
        {card ? <Image source={{ uri: card }} style={styles.card} resizeMode="cover" /> : <View style={styles.card} />}
      </View>
      <View style={styles.actions}>
        <Button label="다음: 홈 화면에 넣기" onPress={() => setStage('install')} />
        <Button variant="secondary" label="샘플 말고 지금 진짜로 찍기" onPress={() => router.push('/checkin')} />
        <Button variant="text" label="나중에, 홈으로" onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 64, lineHeight: 66, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(4) },
  body: { paddingTop: space(7) },
  cardBox: { marginTop: space(5), alignSelf: 'center', width: '62%', backgroundColor: color.black },
  card: { width: '100%', aspectRatio: 9 / 16 },
  actions: { marginTop: 'auto', gap: space(3), paddingVertical: space(6) },
});
