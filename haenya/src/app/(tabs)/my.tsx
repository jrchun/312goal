import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Label } from '../../components/Form';
import { PhotoGrid } from '../../components/PhotoGrid';
import { PhotoViewer, ViewerPhoto } from '../../components/PhotoViewer';
import { Rule } from '../../components/Rule';
import { Screen } from '../../components/Screen';
import { deleteCheckin } from '../../lib/account';
import { checkDate, weekStart } from '../../lib/dates';
import { useCache } from '../../lib/cache';
import { thumbOf } from '../../lib/photos';
import { loadMyTab, MyTab, myKey } from '../../lib/tabData';
import { displayName, useSession } from '../../lib/session';
import { color, font, line, space, type } from '../../theme';

/** 마이 — 시즌 누적을 가장 크게, 연말 예측으로 압박. 52주 칸, 찌른·찔린 횟수, 내 인증샷 */
export default function My() {
  const { membership, profile, session } = useSession();
  const group = membership?.group;
  const key = group && session ? myKey(group.id, session.user.id) : null;
  const data = useCache<MyTab>(key);
  const stats = data?.stats ?? null;
  const weeks = data?.weeks ?? [];
  const photos = data?.photos ?? [];
  const urls = data?.urls ?? {};
  const [open, setOpen] = useState<string | null>(null);

  // 저장된 게 있으면 바로 보여주고, 탭에 올 때마다 뒤에서 새로 받는다 (요청 1번)
  const load = useCallback(async () => {
    if (!group || !session) return;
    await loadMyTab(group.id, session.user.id).catch(() => undefined);
  }, [group, session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // 52칸: 올해 주 + 남은 주(빈칸). 가입 전 주는 흐리게
  const cells = useMemo(() => {
    const joinedWeek = membership ? weekStart(checkDate(new Date(membership.joined_at))) : '';
    const out: { key: string; state: 'done' | 'miss' | 'current' | 'before' | 'future' }[] = weeks.map((w) => ({
      key: w.week,
      state: w.is_current ? 'current' : w.week < joinedWeek ? 'before' : w.achieved ? 'done' : 'miss',
    }));
    while (out.length < 52) out.push({ key: `f${out.length}`, state: 'future' });
    return out.slice(0, 53);
  }, [weeks, membership]);

  const goal = stats?.season_goal ?? membership?.season_goal ?? 150;
  const count = stats?.season_count ?? 0;
  const projected = stats?.projected ?? 0;
  const short = goal - projected;

  const viewerPhotos: ViewerPhoto[] = useMemo(
    () =>
      photos.map((p) => {
        const [, m, d] = p.check_date.split('-');
        const notes = [p.counted ? '' : '사진만 저장', p.date_verified ? '' : '날짜 미확인'].filter(Boolean);
        return {
          id: p.id,
          url: urls[p.photo_path],
          thumb: urls[thumbOf(p.photo_path)],
          title: `${Number(m)}월 ${Number(d)}일`,
          subtitle: notes.join(' · ') || undefined,
          canDelete: true,
          // 그날 인정된 단 한 장이면 지울 때 "횟수도 뺄까?"를 묻는다
          askCount: p.counted && !photos.some((o) => o.id !== p.id && o.check_date === p.check_date),
        };
      }),
    [photos, urls],
  );

  return (
    <Screen>
      <View style={styles.top}>
        <Text style={[type.caption, { color: color.black }]} numberOfLines={1}>
          {displayName(profile)} · {group?.name}
        </Text>
        <View style={styles.links}>
          <Button variant="text" label="설정" onPress={() => router.push('/settings')} />
        </View>
      </View>
      {!data ? <Text style={[type.caption, styles.loading]}>불러오는 중.</Text> : null}
      {data ? (
      <>
      <Label>{stats?.season_year ?? checkDate().slice(0, 4)} 시즌 누적</Label>
      <Text style={[type.progress, styles.big]}>
        {count}
        <Text style={{ color: color.gray, fontSize: 56 }}>/{goal}</Text>
      </Text>
      <Text style={[type.sentence, { color: color.black }]}>
        이 속도면 연말에 <Text style={{ color: color.textRed }}>{projected}회</Text>.{' '}
        {short > 0 ? `${short}회 모자람.` : '목표 넘긴다.'}
      </Text>
      <View style={styles.gapRule}><Rule /></View>

      <View style={styles.sectionHead}>
        <Label>52주 기록</Label>
        <Text style={type.caption}>■ 달성 · □ 미달 · 빨강 이번 주</Text>
      </View>
      <View style={styles.weeks}>
        {cells.map((c) => (
          <View
            key={c.key}
            style={[
              styles.cell,
              c.state === 'done' && { backgroundColor: color.black },
              c.state === 'current' && { borderColor: color.red, backgroundColor: color.highlight },
              (c.state === 'before' || c.state === 'future') && { borderColor: color.gray },
            ]}
          />
        ))}
      </View>

      <View style={styles.stats}>
        <Stat value={`${stats?.streak_weeks ?? 0}주`} label="연속 달성" />
        <Stat value={`${stats?.nudges_sent ?? 0}번`} label="찌른 횟수" />
        <Stat value={`${stats?.nudges_received ?? 0}번`} label="찔린 횟수" />
      </View>
      <Rule weight="row" />

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Label>내 인증샷</Label>
          <Text style={type.caption}>눌러서 크게 보기·지우기</Text>
        </View>
        {photos.length ? (
          <PhotoGrid
            cols={4}
            items={photos.map((p) => ({ id: p.id, url: urls[p.photo_path], thumb: urls[thumbOf(p.photo_path)], unverified: !p.date_verified }))}
            onPress={setOpen}
          />
        ) : (
          <Text style={[type.sentence, { color: color.black }]}>아직 한 장도 없다.</Text>
        )}
      </View>
      </>
      ) : null}
      <PhotoViewer
        photos={viewerPhotos}
        startId={open}
        onClose={() => setOpen(null)}
        onDelete={async (v, keepCount) => {
          const p = photos.find((x) => x.id === v.id);
          if (!p) return;
          await deleteCheckin(p, keepCount);
          // 지운 뒤에도 보기는 그대로 — 다음 사진이 그 자리에 온다. 마지막 한 장이었으면 저절로 닫힌다
          await load();
        }}
      />
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ ...font.display, fontSize: 32, lineHeight: 38, color: color.black }}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space(2) },
  links: { flexDirection: 'row', gap: space(4) },
  big: { color: color.black, paddingTop: space(1) },
  gapRule: { paddingVertical: space(4) },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: space(2) },
  weeks: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: `${(100 - (12 * 4 * 100) / 350) / 13}%`, aspectRatio: 1, borderWidth: line.row, borderColor: color.black },
  stats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space(5) },
  stat: { gap: 2 },
  section: { gap: space(1), paddingTop: space(5), paddingBottom: space(6) },
  loading: { paddingTop: space(5) },
});
