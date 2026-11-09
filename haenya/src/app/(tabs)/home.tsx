import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Label, Notice } from '../../components/Form';
import { RankRow } from '../../components/RankRow';
import { Rule } from '../../components/Rule';
import { Screen } from '../../components/Screen';
import { TopBar } from '../../components/TopBar';
import { checkDate, countWord, isoWeek, weekdayLabel } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { makeNudgeCard, makeWeeklyCard } from '../../lib/cards';
import { shareImage } from '../../lib/share';
import { SaveImageSheet } from '../../components/SaveImageSheet';
import { siteUrl } from '../../lib/invite';
import { shareCardToKakao } from '../../lib/kakao';
import { callName } from '../../lib/korean';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import type { BoardRow, WeekSummary } from '../../lib/types';
import { color, space, type } from '../../theme';

/** 홈 — "오늘 했냐?"에 답하는 화면. 이번 주 n/목표 + 인증 버튼 + 이번 주 순위 + 무소식 찌르기 */
export default function Home() {
  const { membership } = useSession();
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [poked, setPoked] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);
  const group = membership?.group;
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [cardBusy, setCardBusy] = useState(false);

  const load = useCallback(async () => {
    if (!group) return;
    const { data, error } = await supabase.rpc('group_week_board', { p_group_id: group.id });
    if (error) {
      setNotice({ text: errorMessage(error), tone: 'error' });
      return;
    }
    setRows((data as BoardRow[]) ?? []);
    // 월요일에는 지난주 결산
    if (new Date(`${checkDate()}T00:00:00Z`).getUTCDay() === 1) {
      const sm = await supabase.rpc('group_week_summary', { p_group_id: group.id }).maybeSingle();
      setSummary((sm.data as WeekSummary | null) ?? null);
    } else setSummary(null);
  }, [group]);

  // 인증하고 돌아올 때마다 다시 읽는다
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = checkDate();
  const me = rows?.find((r) => r.is_me);
  const doneToday = me?.last_check_date === today;
  const goal = me?.weekly_goal ?? group?.weekly_goal ?? 3;
  const count = me?.week_count ?? 0;
  const left = Math.max(0, goal - count);
  const weekly = [...(rows ?? [])].sort((a, b) => b.week_count - a.week_count || a.nickname.localeCompare(b.nickname, 'ko'));

  const poke = async (r: BoardRow) => {
    if (!group) return;
    setNotice(null);
    const { error } = await supabase.rpc('send_nudge', { p_group_id: group.id, p_to_user: r.user_id });
    if (error && error.message !== 'ALREADY_NUDGED') {
      setNotice({ text: errorMessage(error), tone: 'error' });
      return;
    }
    setPoked((p) => ({ ...p, [r.user_id]: true }));
    if (error) {
      setNotice({ text: errorMessage(error), tone: 'info' });
      return;
    }
    // 재촉 카드(빨강, "○○야 했냐?")를 카톡으로. 안 되면 문장 + 링크 공유
    const days = r.days_silent;
    try {
      const image = await makeNudgeCard({
        groupName: group.name,
        weekLabel: `W${String(isoWeek(today)).padStart(2, '0')} · ${weekdayLabel()}`,
        callName: callName(r.nickname),
        weekCount: r.week_count,
        weeklyGoal: r.weekly_goal,
        daysSilent: days,
      });
      await shareCardToKakao({
        image,
        title: `${callName(r.nickname)} 했냐?`,
        description: days > 0 ? `${days}일째 무소식. 다들 기다리는 중.` : '다들 기다리는 중.',
        link: `${siteUrl()}/home`,
        buttonTitle: '눌러서 인증하기',
      });
      setNotice({ text: `${r.nickname} 찔렀다.`, tone: 'info' });
      return;
    } catch (e) {
      console.warn('nudge card share failed', e);
    }
    const text = `${callName(r.nickname)} 했냐? 다들 기다리는 중. ${siteUrl()}/home`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ text });
      } else if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
        setNotice({ text: '찔렀다. 단톡방에 붙여넣어.', tone: 'info' });
        return;
      } else {
        await Share.share({ message: text });
      }
      setNotice({ text: `${r.nickname} 찔렀다.`, tone: 'info' });
    } catch {
      setNotice({ text: `${r.nickname} 찔렀다.`, tone: 'info' });
    }
  };

  const weeklyCard = async () => {
    if (!summary || !group) return;
    setCardBusy(true);
    try {
      const blob = await makeWeeklyCard({
        groupName: group.name,
        weekLabel: `${summary.week.slice(0, 4)} · W${String(isoWeek(summary.week)).padStart(2, '0')} 결산`,
        groupTotal: summary.group_total,
        groupTarget: summary.group_target,
        achievedMembers: summary.achieved_members,
        nudgeCount: summary.nudge_count,
      });
      if ((await shareImage(blob, 'haenya-weekly.jpg')) === 'manual') setSheet(URL.createObjectURL(blob));
    } catch {
      setNotice({ text: '카드를 못 만들었다. 다시 해봐.', tone: 'error' });
    }
    setCardBusy(false);
  };

  return (
    <Screen>
      {summary && summary.member_count > 0 ? (
        <View style={styles.summary}>
          <Text style={[type.label, { color: color.cream }]}>지난주 결산</Text>
          <Text style={[type.sentence, { color: color.cream }]}>
            그룹 {summary.group_total}/{summary.group_target}회 · {summary.achieved_members}명 달성 · {summary.nudge_count}번 찔렀다.
          </Text>
          <Button variant="poke" label="주간 결산 카드" arrow onPress={weeklyCard} busy={cardBusy} />
        </View>
      ) : null}
      <TopBar left={group?.name ?? ''} right={`${today.slice(0, 4)} 시즌 · W${String(isoWeek(today)).padStart(2, '0')}`} />
      <Text style={[type.headline, styles.headline]} adjustsFontSizeToFit numberOfLines={1}>
        {doneToday ? '했다.' : '했냐?'}
      </Text>
      <Rule />

      <View style={styles.progressRow}>
        <Text style={[type.progress, { color: color.black }]}>
          {rows ? count : ' '}
          <Text style={{ color: color.gray }}>/{goal}</Text>
        </Text>
        <Text style={[type.sentence, styles.sentence]}>
          {me ? `${me.nickname}.\n이번 주\n${left > 0 ? `아직 ${countWord(left)} 번.` : '끝. 더 해도 된다.'}` : ''}
        </Text>
      </View>
      <Text style={type.caption}>
        {me ? `시즌 누적 ${me.season_count} / ${me.season_goal} · 최근 4주 달성 ${me.rank_weeks}주` : ' '}
      </Text>

      <View style={styles.cta}>
        <Button
          label={doneToday ? '한 장 더 올리기' : '인증샷 올리기'}
          variant={doneToday ? 'secondary' : 'primary'}
          onPress={() => router.push('/checkin')}
        />
      </View>

      <View style={styles.sectionHead}>
        <Label>이번 주 순위</Label>
        <Button variant="text" label="전체 보기" onPress={() => router.push('/group')} />
      </View>
      <View style={styles.list}>
        {weekly.map((r) => (
          <RankRow
            key={r.user_id}
            name={r.nickname}
            value={String(r.week_count)}
            isMe={r.is_me}
            daysSilent={r.days_silent}
            onPoke={() => poke(r)}
            poked={poked[r.user_id]}
            compact
          />
        ))}
        <Rule weight="row" />
      </View>
      {weekly.length === 1 ? (
        <Text style={[type.caption, styles.alone]}>아직 혼자다. 친구부터 끌어들이자.</Text>
      ) : null}
      <View style={styles.notice}>
        {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      </View>
      <SaveImageSheet uri={sheet} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { color: color.red, paddingTop: space(2), paddingBottom: space(2) },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingTop: space(3) },
  sentence: { color: color.black, flexShrink: 1 },
  cta: { paddingVertical: space(5) },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { paddingTop: space(1) },
  alone: { paddingTop: space(3) },
  notice: { paddingVertical: space(4) },
  summary: { backgroundColor: color.black, padding: space(4), gap: space(2), marginTop: space(3) },
});
