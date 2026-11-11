import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Label, Notice } from '../../components/Form';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer, ViewerPhoto } from '../../components/PhotoViewer';
import { RankRow } from '../../components/RankRow';
import { Rule } from '../../components/Rule';
import { Screen } from '../../components/Screen';
import { TopBar } from '../../components/TopBar';
import { checkDate } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { copyOrShareInvite } from '../../lib/invite';
import { deleteCheckin } from '../../lib/account';
import { useCache } from '../../lib/cache';
import { FeedEvent, feedClock, feedDay, feedKey, feedText, loadFeed, takeFeedView } from '../../lib/feed';
import { thumbOf } from '../../lib/photos';
import { GroupTab, groupKey, loadBoard, loadGroupTab, loadMyTab } from '../../lib/tabData';
import { useSession } from '../../lib/session';
import { isAnnual, seasonPace } from '../../lib/season';
import { supabase } from '../../lib/supabase';
import { color, font, layout, line, space, type } from '../../theme';

/** 그룹 — 최근 4주 달성 순위 + 이번 주 인증샷 모음 + 초대 링크 */
export default function Group() {
  const { membership, session } = useSession();
  const group = membership?.group;
  const me = session?.user.id;
  const key = group ? groupKey(group.id) : null;
  const data = useCache<GroupTab>(key);
  const board = data?.board ?? [];
  const photos = data?.checkins ?? [];
  const urls = data?.urls ?? {};
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<'rank' | 'photos' | 'feed'>('rank');
  const feed = useCache<FeedEvent[]>(group ? feedKey(group.id) : null);

  // 저장된 게 있으면 바로 보여주고, 탭에 올 때마다 뒤에서 새로 받는다 (요청 1번)
  const load = useCallback(async () => {
    if (!group) return;
    try {
      loadFeed(group.id).catch(() => undefined);
      await loadGroupTab(group.id);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }, [group]);

  useFocusEffect(
    useCallback(() => {
      if (takeFeedView()) setView('feed'); // 홈의 "소식"을 누르고 왔으면 소식 칸부터
      load();
    }, [load]),
  );

  const names = useMemo(() => Object.fromEntries(board.map((r) => [r.user_id, r.nickname])), [board]);
  const ranked = [...board].sort((a, b) => a.rank - b.rank || a.nickname.localeCompare(b.nickname, 'ko'));

  // 크게 보기: 이번 주 사진 전체를 넘겨서 좌우로 넘기고 아래 줄에서 고른다
  const viewerPhotos: ViewerPhoto[] = useMemo(
    () =>
      photos.map((p) => {
        const [, m, d] = p.check_date.split('-');
        return {
          id: p.id,
          url: urls[p.photo_path],
          thumb: urls[thumbOf(p.photo_path)],
          title: names[p.user_id] ?? '',
          subtitle: `${Number(m)}월 ${Number(d)}일${p.date_verified ? '' : ' · 날짜 미확인'}`,
          // 내 사진은 여기서도 지울 수 있다(마이 탭과 같은 동작, 사용자 요청 2026-11-11).
          // 이번 주 사진 목록이라 같은 날 내 사진은 다 들어 있다 → 그날 인정된 단 한 장이면 "횟수도 뺄까?"
          canDelete: p.user_id === me,
          askCount: p.user_id === me && p.counted && !photos.some((o) => o.id !== p.id && o.user_id === me && o.check_date === p.check_date),
        };
      }),
    [photos, urls, names, me],
  );

  const invite = async () => {
    if (!group) return;
    const r = await copyOrShareInvite(group.invite_code);
    setNotice(r === 'copied' ? '초대 링크 복사했다. 단톡방에 붙여넣어.' : r === 'failed' ? '복사가 안 됐다.' : '');
  };

  const year = checkDate().slice(0, 4);
  const annual = isAnnual(board.length ? board[0].weekly_goal : group?.weekly_goal);

  const rankList = (
    <View>
      {ranked.map((r) => (
        <RankRow
          key={r.user_id}
          rank={r.rank}
          name={r.nickname}
          value={annual ? `${seasonPace(r.season_count, r.season_goal).pct}%` : `${r.rank_weeks}주`}
          sub={`${r.season_count} / ${r.season_goal}`}
          isMe={r.is_me}
          compact
        />
      ))}
      <Rule weight="row" />
      <Text style={[type.caption, styles.note]}>
        {annual ? '각자 올해 목표 대비. 같으면 누적 순.' : `끝난 4주 중 주 ${group?.weekly_goal ?? 3}회를 채운 주. 같으면 시즌 누적 순.`}
      </Text>
    </View>
  );
  const items = photos.map((p) => ({
    id: p.id,
    url: urls[p.photo_path],
    thumb: urls[thumbOf(p.photo_path)],
    label: names[p.user_id],
    isMe: p.user_id === me,
    unverified: !p.date_verified,
  }));
  // 소식: 날짜별로 묶어 한 줄씩. 숫자 초기화만 빨간 글씨(감시용)
  const lines = (feed ?? []).flatMap((e) => {
    const t = feedText(e);
    return t ? [{ e, ...t }] : [];
  });
  const feedList = (
    <View>
      {!feed ? <Text style={type.caption}>불러오는 중.</Text> : null}
      {feed && !lines.length ? <Text style={[type.sentence, { color: color.black }]}>아직 소식이 없다.</Text> : null}
      {lines.map((l, i) => {
        const day = feedDay(l.e.created_at);
        const first = i === 0 || feedDay(lines[i - 1].e.created_at) !== day;
        return (
          <View key={l.e.id}>
            {first ? <Text style={[type.label, styles.feedDay, i > 0 && styles.feedDayGap]}>{day}</Text> : null}
            <View style={styles.feedRow}>
              <Text style={[type.sentence, styles.feedText, { color: l.warn ? color.textRed : color.black }]}>{l.text}</Text>
              <Text style={type.caption}>{feedClock(l.e.created_at)}</Text>
            </View>
          </View>
        );
      })}
      {lines.length ? <Text style={[type.caption, styles.note]}>그룹에서 일어난 일. 아무도 못 지운다.</Text> : null}
    </View>
  );
  const empty = <Text style={[type.sentence, { color: color.black }]}>이번 주는 아직 아무도 안 했다.</Text>;

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={[type.caption, { color: color.black }]}>{`${year} 시즌 · ${board.length || ''}명 · ${annual ? '연간 목표' : `주 ${group?.weekly_goal ?? 3}회`}`}</Text>
        <Button variant="text" label="초대 →" onPress={invite} />
      </View>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{group?.name ?? ''}</Text>
      <Rule />
      <Notice>{notice}</Notice>

      {!data ? <Text style={[type.caption, styles.loading]}>불러오는 중.</Text> : null}

      {data ? (
        <>
          {/* 순위 / 이번 주 사진 중 하나만 보여서 꽉 찬 그룹(12명)도 한 화면에 들어간다 (사용자 확정 A안) */}
          <View style={styles.seg}>
            {(
              [
                ['rank', '순위'],
                ['photos', `사진 ${photos.length}`],
                ['feed', '소식'],
              ] as const
            ).map(([k, label]) => {
              const on = view === k;
              return (
                <Pressable
                  key={k}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => setView(k)}
                  style={[styles.segItem, on ? styles.segOn : styles.segOff]}
                >
                  <Text style={{ ...font.display, fontSize: 18, color: on ? color.cream : color.black }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          {view === 'rank' ? rankList : view === 'feed' ? feedList : photos.length ? <PhotoGrid cols={4} items={items} onPress={setOpen} /> : empty}
        </>
      ) : null}

      <PhotoViewer
        photos={viewerPhotos}
        startId={open}
        onClose={() => setOpen(null)}
        onDelete={async (v, keepCount) => {
          const p = photos.find((x) => x.id === v.id);
          if (!p || !group) return;
          await deleteCheckin(p, keepCount);
          // 지운 뒤에도 보기는 그대로 — 다음 사진이 그 자리에. 홈 숫자·마이 탭·소식도 새로
          await loadGroupTab(group.id);
          loadBoard(group.id).catch(() => undefined);
          loadFeed(group.id).catch(() => undefined);
          if (me) loadMyTab(group.id, me).catch(() => undefined);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space(2) },
  title: { ...type.rankName, fontSize: 56, lineHeight: 60, color: color.black, paddingBottom: space(2) },
  seg: { flexDirection: 'row', gap: space(2), paddingTop: space(4), paddingBottom: space(3) },
  segItem: { flex: 1, minHeight: layout.minTouch, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: color.black },
  segOn: { backgroundColor: color.black },
  segOff: { backgroundColor: color.cream },
  note: { paddingTop: space(2) },
  feedDay: { color: color.black, paddingBottom: space(1) },
  feedDayGap: { paddingTop: space(4) },
  feedRow: { flexDirection: 'row', alignItems: 'baseline', gap: space(3), paddingVertical: space(2), borderTopWidth: line.row, borderTopColor: color.black },
  feedText: { flex: 1 },
  loading: { paddingTop: space(5) },
});
