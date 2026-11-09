import { Redirect, router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { lastCheckin } from '../lib/checkin';
import { countWord, stickerTime } from '../lib/dates';
import { useSession } from '../lib/session';
import { color, font, space, type } from '../theme';

/**
 * 인증 완료 — 사진 + 스티커 미리보기와 결과 한 문장.
 * 공유 카드(이미지 저장, 카톡 던지기, 스토리)는 STAGE 5.
 */
export default function CheckinDone() {
  const r = lastCheckin();
  const { profile } = useSession();
  if (!r) return <Redirect href="/home" />;

  const left = Math.max(0, r.weekly_goal - r.week_count);
  const title = r.counted ? '했다.' : '이미 했다.';
  const sentence = r.counted
    ? left > 0 ? `${countWord(left)} 번 남았다.` : '이번 주 끝.'
    : '오늘은 이미 했다. 사진만 저장할게.';

  return (
    <Screen>
      <View style={styles.photoBox}>
        <Image source={{ uri: r.previewUrl }} style={styles.photo} resizeMode="cover" />
        {/* 스티커 미리보기 (STAGE 5에서 공유 카드로 완성) */}
        <View style={[styles.sticker, styles.logo]}>
          <Text style={{ ...font.display, fontSize: 20, color: color.black }}>했냐?</Text>
        </View>
        {r.counted ? (
          <View style={[styles.sticker, styles.did]}>
            <Text style={{ ...font.display, fontSize: 64, lineHeight: 70, color: color.black }}>했다.</Text>
          </View>
        ) : null}
        <View style={[styles.sticker, styles.count]}>
          <Text style={{ ...font.display, fontSize: 36, lineHeight: 40, color: color.cream }}>
            {r.week_count}
            <Text style={{ color: color.gray }}>/{r.weekly_goal}</Text>
          </Text>
        </View>
        <View style={[styles.sticker, styles.time]}>
          <Text style={{ ...font.bodyBold, fontSize: 12, color: color.black }}>
            {r.takenAt ? stickerTime(r.takenAt) : '날짜 미확인'}
          </Text>
        </View>
      </View>

      <Text style={[type.rankName, styles.title]}>{title}</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>
        {profile?.nickname ? `${profile.nickname}. ` : ''}
        {sentence}
      </Text>
      {!r.date_verified ? <Text style={[type.caption, styles.caption]}>촬영 날짜가 없는 사진이라 "날짜 미확인"으로 남는다. 판단은 친구들 몫.</Text> : null}

      <View style={styles.actions}>
        <Button label="홈으로" onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoBox: { marginTop: space(4), backgroundColor: color.black, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 3 / 4 },
  sticker: { position: 'absolute', paddingHorizontal: space(3), paddingVertical: space(1) },
  logo: { top: space(4), left: space(4), backgroundColor: color.cream, transform: [{ rotate: '-3deg' }] },
  did: { left: space(4), bottom: '30%', backgroundColor: color.red, transform: [{ rotate: '-5deg' }], minWidth: '60%' },
  count: { left: space(4), bottom: '14%', backgroundColor: color.black },
  time: { left: space(4), bottom: space(4), backgroundColor: color.cream },
  title: { fontSize: 56, lineHeight: 60, color: color.black, paddingTop: space(5), paddingBottom: space(2) },
  sentence: { color: color.black, paddingTop: space(3) },
  caption: { paddingTop: space(2) },
  actions: { marginTop: 'auto', gap: space(3), paddingVertical: space(6) },
});
