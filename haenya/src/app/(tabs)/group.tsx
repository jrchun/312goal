import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { getCache, setCache, useCache } from '../../lib/cache';
import { GroupTab, groupKey, loadGroupTab } from '../../lib/tabData';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import type { ReactionKey } from '../../lib/types';
import { color, space, type } from '../../theme';

/** 그룹 — 최근 4주 달성 순위 + 이번 주 인증샷 모음(반응) + 초대 링크 */
export default function Group() {
  const { membership, session } = useSession();
  const group = membership?.group;
  const me = session?.user.id;
  const key = group ? groupKey(group.id) : null;
  const data = useCache<GroupTab>(key);
  const board = data?.board ?? [];
  const photos = data?.checkins ?? [];
  const urls = data?.urls ?? {};
  const reactions = data?.reactions ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

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

  const viewer: ViewerPhoto | null = useMemo(() => {
    const p = photos.find((x) => x.id === open);
    if (!p) return null;
    const mine: Partial<Record<ReactionKey, boolean>> = {};
    const counts: Partial<Record<ReactionKey, number>> = {};
    for (const r of reactions.filter((x) => x.checkin_id === p.id)) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      if (r.user_id === me) mine[r.emoji] = true;
    }
    const [, m, d] = p.check_date.split('-');
    return {
      id: p.id,
      url: urls[p.photo_path],
      title: `${names[p.user_id] ?? ''} · ${Number(m)}월 ${Number(d)}일`,
      unverified: !p.date_verified,
      counts,
      mine,
    };
  }, [open, photos, reactions, urls, names, me]);

  const react = async (emoji: ReactionKey) => {
    if (!viewer || !me || !key) return;
    const on = !!viewer.mine[emoji];
    const cur = getCache<GroupTab>(key);
    if (cur) {
      // 화면 먼저 바꾸고 서버에 반영
      setCache<GroupTab>(key, {
        ...cur,
        reactions: on
          ? cur.reactions.filter((r) => !(r.checkin_id === viewer.id && r.user_id === me && r.emoji === emoji))
          : [...cur.reactions, { checkin_id: viewer.id, user_id: me, emoji }],
      });
    }
    const res = on
      ? await supabase.from('reactions').delete().match({ checkin_id: viewer.id, user_id: me, emoji })
      : await supabase.from('reactions').insert({ checkin_id: viewer.id, user_id: me, emoji });
    if (res.error) load();
  };

  const invite = async () => {
    if (!group) return;
    const r = await copyOrShareInvite(group.invite_code);
    setNotice(r === 'copied' ? '초대 링크 복사했다. 단톡방에 붙여넣어.' : r === 'failed' ? '복사가 안 됐다.' : '');
  };

  const year = checkDate().slice(0, 4);
  return (
    <Screen>
      <TopBar left={`${year} 시즌 · ${board.length || ''}명`} right={group ? `주 ${group.weekly_goal}회 · 연 ${group.season_goal}회` : ''} />
      <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>{group?.name ?? ''}</Text>
      <Rule />

      {!data ? <Text style={[type.caption, styles.loading]}>불러오는 중.</Text> : null}
      {data ? (
      <>
      <View style={styles.section}>
        <Label>최근 4주 달성 순위</Label>
        <View style={styles.list}>
          {ranked.map((r) => (
            <RankRow
              key={r.user_id}
              rank={r.rank}
              name={r.nickname}
              value={`${r.rank_weeks}주`}
              sub={`${r.season_count} / ${r.season_goal}`}
              isMe={r.is_me}
              compact
            />
          ))}
          <Rule weight="row" />
        </View>
        <Text style={type.caption}>끝난 4주 중 주 {group?.weekly_goal ?? 3}회를 채운 주. 같으면 시즌 누적 순.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Label>이번 주 인증샷</Label>
          <Text style={type.caption}>{photos.length}장</Text>
        </View>
        {photos.length ? (
          <PhotoGrid
            cols={3}
            items={photos.map((p) => ({
              id: p.id,
              url: urls[p.photo_path],
              label: names[p.user_id],
              isMe: p.user_id === me,
              unverified: !p.date_verified,
            }))}
            onPress={setOpen}
          />
        ) : (
          <Text style={[type.sentence, { color: color.black }]}>이번 주는 아직 아무도 안 했다.</Text>
        )}
      </View>

      </>
      ) : null}

      <View style={styles.actions}>
        <Notice>{notice}</Notice>
        <Button variant="secondary" label="친구 더 끌어들이기" onPress={invite} />
      </View>
      <PhotoViewer photo={viewer} onClose={() => setOpen(null)} onReact={react} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 64, lineHeight: 66, color: color.black, paddingTop: space(2), paddingBottom: space(3) },
  section: { gap: space(2), paddingTop: space(5) },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { paddingTop: space(1) },
  actions: { gap: space(3), paddingVertical: space(6) },
  loading: { paddingTop: space(5) },
});
