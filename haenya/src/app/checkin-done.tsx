import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Form';
import { Rule } from '../components/Rule';
import { SaveImageSheet } from '../components/SaveImageSheet';
import { Screen } from '../components/Screen';
import { DidCardInput, makeDidSquareCard, makeStoryCard } from '../lib/cards';
import { lastCheckin } from '../lib/checkin';
import { countWord, isoWeek, stickerTime } from '../lib/dates';
import { siteUrl } from '../lib/invite';
import { shareCardToKakao } from '../lib/kakao';
import { ordinalWord } from '../lib/korean';
import { displayName, useSession } from '../lib/session';
import { shareImage } from '../lib/share';
import { color, space, type } from '../theme';
import { paceSentence, seasonPace } from '../lib/season';

/**
 * 인증 완료 — 올린 사진이 곧 공유 카드. 바로 아래 카톡 던지기와 스토리 저장. (가이드라인 07 · 인증 완료)
 */
export default function CheckinDone() {
  const r = lastCheckin();
  const { profile, membership } = useSession();
  const [story, setStory] = useState<{ blob: Blob; url: string } | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [busy, setBusy] = useState<'kakao' | 'story' | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);

  const input: DidCardInput | null = useMemo(() => {
    if (!r || !membership) return null;
    return {
      photoUrl: r.previewUrl,
      groupName: membership.group.name,
      weekLabel: `W${String(isoWeek(r.check_date)).padStart(2, '0')}`,
      nickname: displayName(profile),
      // 연간 목표만인 그룹: 스티커 숫자는 올해 누적/목표
      weekCount: r.weekly_goal == null ? r.season_count : r.week_count,
      weeklyGoal: r.weekly_goal ?? r.season_goal,
      memo: r.counted ? (r.weekly_goal == null ? `올해 ${r.season_count}번째` : `이번 주 ${ordinalWord(r.week_count)} 번째`) : '오늘 한 장 더',
      timeLabel: r.takenAt ? stickerTime(r.takenAt) : '날짜 미확인',
    };
  }, [r, membership, profile?.nickname]);

  // 화면에 보여줄 스토리 카드를 미리 만들어 둔다 (보이는 그대로 저장된다)
  useEffect(() => {
    if (!input) return;
    let alive = true;
    makeStoryCard(input)
      .then((blob) => alive && setStory({ blob, url: URL.createObjectURL(blob) }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [input]);

  if (!r) return <Redirect href="/home" />;

  const annual = r.weekly_goal == null;
  const left = annual ? Math.max(0, r.season_goal - r.season_count) : Math.max(0, (r.weekly_goal ?? 0) - r.week_count);
  const title = r.counted ? '했다.' : '이미 했다.';
  const sentence = !r.counted
    ? '오늘은 이미 했다. 사진만 저장할게.'
    : annual
      ? left > 0 ? `올해 ${left}번 남았다. ${paceSentence(seasonPace(r.season_count, r.season_goal, r.check_date).diff)}` : '올해 목표 끝. 더 해도 된다.'
      : left > 0 ? `${countWord(left)} 번 남았다.` : '이번 주 끝.';

  const toKakao = async () => {
    if (!input) return;
    setBusy('kakao');
    setNotice(null);
    try {
      const square = await makeDidSquareCard(input);
      await shareCardToKakao({
        image: square,
        title: `${input.nickname} 했다.`,
        description: `${input.groupName} · ${annual ? '올해' : '이번 주'} ${input.weekCount}/${input.weeklyGoal}`,
        // 그룹 초대 주소: 같은 그룹이면 바로 홈, 아니면 내 자리 고르기
        link: `${siteUrl()}/join/${membership?.group.invite_code ?? ''}`,
        buttonTitle: '나도 인증하러 가기',
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'CANCELLED') {
        setBusy(null);
        return;
      }
      console.warn('kakao share failed', e);
      setNotice({ text: '카톡 공유가 안 열렸다. 카드를 저장해서 직접 보내.', tone: 'error' });
    }
    setBusy(null);
  };

  const toStory = async () => {
    if (!story) return;
    setBusy('story');
    setNotice(null);
    const res = await shareImage(story.blob, 'haenya-story.jpg');
    if (res === 'manual') setSheet(story.url);
    setBusy(null);
  };

  return (
    <Screen>
      <View style={styles.cardBox}>
        <Image source={{ uri: story?.url ?? r.previewUrl }} style={styles.card} resizeMode="cover" />
      </View>

      <Text style={[type.rankName, styles.title]}>{title}</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>
        {displayName(profile) ? `${displayName(profile)}. ` : ''}
        {sentence}
      </Text>
      {!r.date_verified ? (
        <Text style={[type.caption, styles.sentence]}>촬영 날짜가 없는 사진이라 "날짜 미확인"으로 남는다. 판단은 친구들 몫.</Text>
      ) : null}

      <View style={styles.actions}>
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
        <Button label={`단톡방에 "나 했다" 던지기`} onPress={toKakao} busy={busy === 'kakao'} disabled={!input || !!busy} />
        <Button variant="secondary" label="인스타 스토리로 저장" onPress={toStory} busy={busy === 'story'} disabled={!story || !!busy} />
        <Button variant="text" label="나중에, 홈으로" onPress={() => router.replace('/home')} />
      </View>
      <SaveImageSheet uri={sheet} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardBox: { marginTop: space(4), alignSelf: 'center', width: '78%', backgroundColor: color.black },
  card: { width: '100%', aspectRatio: 9 / 16 },
  title: { fontSize: 44, lineHeight: 50, color: color.black, paddingTop: space(4), paddingBottom: space(2) },
  sentence: { color: color.black, paddingTop: space(3) },
  actions: { marginTop: 'auto', gap: space(3), paddingVertical: space(5) },
});
