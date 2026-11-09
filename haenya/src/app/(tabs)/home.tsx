import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Rule } from '../../components/Rule';
import { Screen } from '../../components/Screen';
import { TopBar } from '../../components/TopBar';
import { useSession } from '../../lib/session';
import { color, space, type } from '../../theme';

/** 홈 — STAGE 4에서 실제 데이터로 교체. 지금은 숫자만 목업. */
export default function Home() {
  const { profile, membership } = useSession();
  const name = profile?.nickname ?? '';
  return (
    <Screen>
      <TopBar left={membership?.group.name ?? ''} right="2027 시즌 · W02" />
      <Text style={[type.headline, styles.headline]} adjustsFontSizeToFit numberOfLines={1}>
        했냐?
      </Text>
      <Rule />
      <View style={styles.progressRow}>
        <Text style={[type.progress, { color: color.black }]}>
          1<Text style={{ color: color.gray }}>/3</Text>
        </Text>
        <Text style={[type.sentence, styles.sentence]}>{name}.{'\n'}이번 주{'\n'}아직 두 번.</Text>
      </View>
      <Text style={type.caption}>시즌 누적 4 / 150 · 연속 달성 1주</Text>
      <View style={styles.cta}>
        <Button label="인증샷 올리기" onPress={() => router.push('/checkin')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { color: color.red, paddingTop: space(2), paddingBottom: space(2) },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingTop: space(3) },
  sentence: { color: color.black },
  cta: { paddingVertical: space(5) },
});
