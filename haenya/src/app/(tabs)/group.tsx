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
import { useCache } from '../../lib/cache';
import { thumbOf } from '../../lib/photos';
import { GroupTab, groupKey, loadGroupTab } from '../../lib/tabData';
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
  const [view, setView] = useState<'rank' | 'photos'>('rank');

  // 저장된 게 있으면 바로 보여주고, 탭에 올 때마다 뒤에서 새로 받는다 (요청 1번)
  const load = useCallback(async () => {
    if (!group) return;
    try {
      await loadGroupTab(group.id);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }, [group]);

  useFocusEffect(
    useCallback(() => {
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
        };
      }),
    [photos, urls, names],
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
                ['photos', `이번 주 사진 ${photos.length}`],
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
          {view === 'rank' ? rankList : photos.length ? <PhotoGrid cols={4} items={items} onPress={setOpen} /> : empty}
        </>
      ) : null}

      <PhotoViewer photos={viewerPhotos} startId={open} onClose={() => setOpen(null)} />
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
  loading: { paddingTop: space(5) },
});
