import { router, useFocusEffect } from 'expo-router';
import { useCache } from '../../lib/cache';
import { boardKey, loadBoard, loadGroupTab, loadMyTab } from '../../lib/tabData';
import { useCallback, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Label, Notice } from '../../components/Form';
import { PokePicker } from '../../components/PokePicker';
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
import { askFeedView, FeedEvent, feedKey, feedText, feedTime, loadFeed } from '../../lib/feed';
import { isAnnual, paceSentence, seasonPace } from '../../lib/season';
import { supabase } from '../../lib/supabase';
import type { BoardRow, WeekSummary } from '../../lib/types';
import { color, space, type } from '../../theme';

/** 홈 — "오늘 했냐?"에 답하는 화면. 이번 주 n/목표 + 인증 버튼 + 이번 주 순위 + 무소식 찌르기 */
export default function Home() {
  const { membership, session } = useSession();
  const [poked, setPoked] = useState<Record<string, boolean>>({});
  const [pokedAll, setPokedAll] = useState(false);
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);
  const group = membership?.group;
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [cardBusy, setCardBusy] = useState(false);

  const rows = useCache<BoardRow[]>(group ? boardKey(group.id) : null) ?? null;
  const feed = useCache<FeedEvent[]>(group ? feedKey(group.id) : null);
  // 홈에는 최신 소식 2줄만 (사용자 결정 2026-11-10). 누르면 그룹 탭 소식으로
  const news = (feed ?? []).flatMap((e) => { const t = feedText(e); return t ? [{ e, ...t }] : []; }).slice(0, 2);

  const load = useCallback(async () => {
    if (!group) return;
    try {
      await loadBoard(group.id);
    } catch (e) {
      setNotice({ text: errorMessage(e), tone: 'error' });
      return;
    }
    // 그룹·마이 탭을 미리: 화면 코드와 데이터를 뒤에서 받아 둔다 → 탭을 누르면 바로 뜬다
    router.prefetch('/group');
    router.prefetch('/my');
    loadFeed(group.id).catch(() => undefined);
    loadGroupTab(group.id).catch(() => undefined);
    if (session) loadMyTab(group.id, session.user.id).catch(() => undefined);
    // 월요일에는 지난주 결산
    if (new Date(`${checkDate()}T00:00:00Z`).getUTCDay() === 1) {
      const sm = await supabase.rpc('group_week_summary', { p_group_id: group.id }).maybeSingle();
      setSummary((sm.data as WeekSummary | null) ?? null);
    } else setSummary(null);
  }, [group, session]);

  // 인증하고 돌아올 때마다 다시 읽는다
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = checkDate();
  const me = rows?.find((r) => r.is_me);
  const doneToday = me?.last_check_date === today;
  // 연간 목표만인 그룹(주간 목표 없음): 큰 숫자는 올해 누적/목표, 순위는 목표 대비 % (DB rank)
  const annual = isAnnual(me ? me.weekly_goal : group?.weekly_goal);
  const goal = me?.weekly_goal ?? group?.weekly_goal ?? 3;
  const count = me?.week_count ?? 0;
  const left = Math.max(0, goal - count);
  const pace = me ? seasonPace(me.season_count, me.season_goal, today) : null;
  const weekly = [...(rows ?? [])].sort(
    annual
      ? (a, b) => a.rank - b.rank || a.nickname.localeCompare(b.nickname, 'ko')
      : (a, b) => b.week_count - a.week_count || a.nickname.localeCompare(b.nickname, 'ko'),
  );
  // 순위는 최대 4줄. 내가 4등 밖이면 상위 3명 + 나 (내 자리는 항상 보이게)
  const meIdx = weekly.findIndex((r) => r.is_me);
  // "더 보기"는 그룹 탭(4주 기준)으로 가지 않고 여기서 펼친다 → 같은 이번 주 기준 순위 (사용자 확정 2026-11-10)
  const top = meIdx >= 4 ? [...weekly.slice(0, 3), weekly[meIdx]] : weekly.slice(0, 4);
  const shown = expanded ? weekly : top;
  const hiddenCount = weekly.length - top.length;
  // 찌를 수 있는 사람: 오늘 아직 인증 안 한 멤버 (내가 직접 고른다)
  const notToday = weekly.filter((r) => !r.is_me && r.last_check_date !== today);

  // 오늘 내가 이미 찌른 사람 (DB 기준이라 새로고침해도 "찔렀다"가 유지된다)
  const loadPoked = useCallback(async () => {
    if (!group) return;
    const { data } = await supabase.rpc('my_nudges_today', { p_group_id: group.id });
    const d = data as { to: string[]; all: boolean } | null;
    if (!d) return;
    setPoked(Object.fromEntries(d.to.map((id) => [id, true])));
    setPokedAll(d.all);
  }, [group]);

  const canPoke = weekly.length > 1 && notToday.length > 0 && doneToday;
  // 찌르기는 오늘 내가 인증해야 열린다 (DB CHECKIN_FIRST, 사용자 결정 2026-11-10)
  const pokeLine = weekly.length < 2 || !rows ? null
    : !notToday.length ? '오늘은 다 했다.'
    : !doneToday ? `오늘 안 한 사람 ${notToday.length}명. 너부터 인증하면 찌를 수 있다.` : null;

  const openPicker = () => {
    setPicker(true);
    loadPoked();
  };

  const weekLabel = () => `W${String(isoWeek(today)).padStart(2, '0')} · ${weekdayLabel()}`;

  // 공유 링크는 그룹 초대 주소: 받은 사람이 이 그룹 계정이면 바로 홈, 다른 그룹 계정(카톡 브라우저에 예전 계정 등)이면 내 자리 고르기
  const groupLink = () => (group ? `${siteUrl()}/join/${group.invite_code}` : `${siteUrl()}/home`);

  /**
   * 재촉 카드를 카톡으로 보내고, **실제로 보냈을 때만** 찌르기를 기록한다(record).
   * 카톡 창을 취소하거나 공유 창을 닫으면 기록 안 함 (사용자 제보 2026-11-10: 안 보냈는데 찔렀다고 남음).
   * 안 되면 문장 + 링크 공유.
   */
  const shareNudge = async (
    card: Parameters<typeof makeNudgeCard>[0], title: string, description: string, done: string,
    record: () => Promise<boolean>,
  ) => {
    setPicker(false); // 찌르기 창을 먼저 닫아야 "카드 준비됐다" 창이 그 뒤에 숨지 않는다
    const link = groupLink();
    const finish = async () => {
      if (await record()) {
        setNotice({ text: done, tone: 'info' });
        if (group) loadFeed(group.id).catch(() => undefined); // 방금 찌른 게 소식에 바로 보이게
      }
    };
    try {
      const image = await makeNudgeCard(card);
      await shareCardToKakao({ image, title, description, link, buttonTitle: '눌러서 인증하기' });
      await finish();
      return;
    } catch (e) {
      if (e instanceof Error && e.message === 'CANCELLED') {
        setNotice({ text: '안 보냈다. 안 찔렀다.', tone: 'info' });
        return;
      }
      console.warn('nudge card share failed', e);
    }
    const text = `${title} ${description} ${link}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ text });
      } else if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
        if (await record()) setNotice({ text: '찔렀다. 단톡방에 붙여넣어.', tone: 'info' });
        return;
      } else {
        const r = await Share.share({ message: text });
        if (r.action === Share.dismissedAction) throw new Error('CANCELLED');
      }
    } catch {
      setNotice({ text: '안 보냈다. 안 찔렀다.', tone: 'info' });
      return;
    }
    await finish();
  };

  // 한 사람 찌르기: 같은 사람에게 하루 1번 (DB send_nudge). 다른 사람은 따로 찌를 수 있다
  const poke = async (r: BoardRow) => {
    if (!group || poked[r.user_id]) return;
    setNotice(null);
    const days = r.days_silent;
    await shareNudge(
      {
        groupName: group.name,
        weekLabel: weekLabel(),
        callName: callName(r.nickname),
        // 연간 목표만이면 카드 숫자는 올해 누적/목표
        weekCount: r.weekly_goal == null ? r.season_count : r.week_count,
        weeklyGoal: r.weekly_goal ?? r.season_goal,
        daysSilent: days,
      },
      `${callName(r.nickname)} 했냐?`,
      days > 0 ? `${days}일째 무소식. 다들 기다리는 중.` : '다들 기다리는 중.',
      `${r.nickname} 찔렀다.`,
      async () => {
        const { error } = await supabase.rpc('send_nudge', { p_group_id: group.id, p_to_user: r.user_id });
        if (error && error.message !== 'ALREADY_NUDGED') {
          setNotice({ text: errorMessage(error), tone: 'error' });
          return false;
        }
        setPoked((p) => ({ ...p, [r.user_id]: true }));
        return true;
      },
    );
  };

  // 다 같이 찌르기 ("얘들아 했냐?"): 단톡방용, 하루 1번 (DB send_group_nudge). 이름은 화면의 "오늘 안 한 사람"
  const pokeAll = async () => {
    if (!group || pokedAll) return;
    setNotice(null);
    const names = notToday.map((x) => x.nickname);
    if (!names.length) return;
    await shareNudge(
      { groupName: group.name, weekLabel: weekLabel(), callName: '얘들아', weekCount: 0, weeklyGoal: 0, daysSilent: 0, group: { names } },
      '얘들아 했냐?',
      `오늘 아직 ${names.length}명. ${names.join(', ')}. 다들 기다리는 중.`,
      '다 같이 찔렀다.',
      async () => {
        const { error } = await supabase.rpc('send_group_nudge', { p_group_id: group.id });
        if (error && error.message !== 'ALREADY_NUDGED') {
          setNotice({ text: errorMessage(error), tone: 'error' });
          return false;
        }
        setPokedAll(true);
        return true;
      },
    );
  };

  const weeklyCard = async () => {
    if (!summary || !group) return;
    setCardBusy(true);
    try {
      const blob = await makeWeeklyCard({
        groupName: group.name,
        weekLabel: `${summary.week.slice(0, 4)} · W${String(isoWeek(summary.week)).padStart(2, '0')} 결산`,
        groupTotal: summary.group_total,
        groupTarget: summary.group_target ?? 0,
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
            {summary.group_target == null
              ? `그룹 ${summary.group_total}회 · ${summary.achieved_members}명 운동 · ${summary.nudge_count}번 찔렀다.`
              : `그룹 ${summary.group_total}/${summary.group_target}회 · ${summary.achieved_members}명 달성 · ${summary.nudge_count}번 찔렀다.`}
          </Text>
          {summary.group_target != null ? <Button variant="poke" label="주간 결산 카드" arrow onPress={weeklyCard} busy={cardBusy} /> : null}
        </View>
      ) : null}
      <TopBar left={group?.name ?? ''} right={`${today.slice(0, 4)} 시즌 · W${String(isoWeek(today)).padStart(2, '0')}`} />
      <Text style={[type.headline, styles.headline]} adjustsFontSizeToFit numberOfLines={1}>
        {doneToday ? '했다.' : '했냐?'}
      </Text>
      <Rule />

      {/* 연간 목표만이면 숫자가 세 자리라 문장을 아래로 (한 줄에 다 안 들어감) */}
      <View style={[styles.progressRow, annual && styles.progressCol]}>
        <Text style={[type.progress, styles.progress, { color: color.black }]}>
          {rows ? (annual ? me?.season_count ?? 0 : count) : ' '}
          <Text style={{ color: color.gray, ...(annual ? { fontSize: 46 } : null) }}>/{annual ? me?.season_goal ?? '' : goal}</Text>
        </Text>
        <Text style={[type.sentence, styles.sentence]}>
          {me && annual && pace
            ? `${me.nickname}. 연도 대비 ${paceSentence(pace.diff)}`
            : me ? `${me.nickname}.\n이번 주\n${left > 0 ? `아직 ${countWord(left)} 번.` : '끝. 더 해도 된다.'}` : ''}
        </Text>
      </View>
      <Text style={type.caption}>
        {me && annual && pace
          ? `올해 목표의 ${pace.pct}% · 이번 주 ${me.week_count}회`
          : me ? `시즌 누적 ${me.season_count} / ${me.season_goal} · 최근 4주 달성 ${me.rank_weeks}주` : ' '}
      </Text>

      <View style={styles.cta}>
        {canPoke ? (
          // 인증한 날: 한 장 더 / 찌르기를 한 줄에 (빨강은 찌르기 하나)
          <View style={styles.ctaPair}>
            <View style={styles.ctaHalf}><Button label="한 장 더" variant="secondary" arrow={false} onPress={() => router.push('/checkin')} /></View>
            <View style={styles.ctaHalf}><Button variant="poke" fill label={`찌르기 · ${notToday.length}명`} onPress={openPicker} /></View>
          </View>
        ) : (
          <Button
            label={doneToday ? '한 장 더 올리기' : '인증샷 올리기'}
            variant={doneToday ? 'secondary' : 'primary'}
            onPress={() => router.push('/checkin')}
          />
        )}
        {/* 찌르기 안내는 인증 버튼에 딸린 말 → 버튼 바로 아래 (순위·소식 사이에 두면 구분이 흐려진다) */}
        {pokeLine ? <Text style={[type.caption, styles.pokeLine]}>{pokeLine}</Text> : null}
      </View>

      {/* 구획마다 6px 검정 선 + 제목 줄: 순위 / 소식 (사용자 확정 2026-11-11) */}
      <Rule />
      <View style={styles.sectionHead}>
        <Label>{annual ? '올해 순위 · 목표 대비' : '이번 주 순위'}</Label>
        {hiddenCount > 0 ? (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => setExpanded((v) => !v)}>
            <Text style={[type.caption, styles.under]}>{expanded ? '접기' : `외 ${hiddenCount}명 더 보기`}</Text>
          </Pressable>
        ) : null}
      </View>
      <View>
        {shown.map((r) => (
          <RankRow
            key={r.user_id}
            name={r.nickname}
            value={annual ? `${seasonPace(r.season_count, r.season_goal, today).pct}%` : String(r.week_count)}
            isMe={r.is_me}
            daysSilent={r.days_silent}
            compact
          />
        ))}
        {news.length ? null : <Rule weight="row" />}
      </View>
      {weekly.length === 1 ? (
        <Text style={[type.caption, styles.alone]}>아직 혼자다. 친구부터 끌어들이자.</Text>
      ) : null}
      {notice ? (
        <View style={styles.notice}>
          <Notice tone={notice.tone}>{notice.text}</Notice>
        </View>
      ) : null}
      {news.length ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="그룹 소식 전체 보기"
          onPress={() => {
            askFeedView();
            router.navigate('/group');
          }}
          style={styles.news}
        >
          <Rule />
          <View style={styles.sectionHead}>
            <Label>소식</Label>
            <Text style={[type.caption, { color: color.black }]}>전체 →</Text>
          </View>
          {news.map((n) => (
            <View key={n.e.id} style={styles.newsRow}>
              <Text style={[type.caption, styles.newsText, { color: n.warn ? color.textRed : color.black }]} numberOfLines={1}>{n.text}</Text>
              <Text style={type.caption}>{feedTime(n.e.created_at)}</Text>
            </View>
          ))}
        </Pressable>
      ) : null}
      <SaveImageSheet uri={sheet} onClose={() => setSheet(null)} />
      <PokePicker
        visible={picker}
        members={notToday}
        poked={poked}
        pokedAll={pokedAll}
        onPoke={poke}
        onPokeAll={pokeAll}
        onClose={() => setPicker(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 웹은 주소창·아래 막대만큼 화면이 짧다(아이폰 Safari 약 690px) → 홈은 제목·숫자를 조금 줄여 한 화면에 맞춘다
  headline: { color: color.red, fontSize: 124, lineHeight: 124 * 0.85, paddingBottom: space(1) },
  progress: { fontSize: 76, lineHeight: 76 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingTop: space(2) },
  progressCol: { flexDirection: 'column', alignItems: 'flex-start', gap: 0 },
  sentence: { color: color.black, flexShrink: 1 },
  cta: { paddingTop: space(2), paddingBottom: space(2), gap: space(1) },
  ctaPair: { flexDirection: 'row', gap: space(2) },
  ctaHalf: { flex: 1 },
  pokeLine: { color: color.black },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: space(6) },
  under: { textDecorationLine: 'underline' },
  alone: { paddingTop: space(3) },
  notice: { paddingTop: space(2) },
  news: { paddingTop: space(2), paddingBottom: space(1), gap: 2 },
  newsRow: { flexDirection: 'row', gap: space(3), alignItems: 'baseline' },
  newsText: { flex: 1 },
  summary: { backgroundColor: color.black, padding: space(4), gap: space(2), marginTop: space(3) },
});
