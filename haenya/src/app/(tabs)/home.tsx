import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Label, Notice } from '../../components/Form';
import { RankRow } from '../../components/RankRow';
import { Rule } from '../../components/Rule';
import { Screen } from '../../components/Screen';
import { TopBar } from '../../components/TopBar';
import { checkDate, countWord, isoWeek } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { inviteUrl } from '../../lib/invite';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import type { BoardRow } from '../../lib/types';
import { color, space, type } from '../../theme';

/** 홈 — "오늘 했냐?"에 답하는 화면. 이번 주 n/목표 + 인증 버튼 + 이번 주 순위 + 무소식 찌르기 */
export default function Home() {
  const { membership } = useSession();
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [poked, setPoked] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);
  const group = membership?.group;

  const load = useCallback(async () => {
    if (!group) return;
    const { data, error } = await supabase.rpc('group_week_board', { p_group_id: group.id });
    if (error) {
      setNotice({ text: errorMessage(error), tone: 'error' });
      return;
    }
    setRows((data as BoardRow[]) ?? []);
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
    // 재촉 카드 이미지는 STAGE 5. 지금은 문장 + 링크를 공유한다
    const text = `${r.nickname}야 했냐? 다들 기다리는 중. ${inviteUrl(group.invite_code)}`;
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

  return (
    <Screen>
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
});
