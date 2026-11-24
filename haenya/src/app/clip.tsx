import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Notice } from '../components/Form';
import { useCache } from '../lib/cache';
import { buildClipInput, ClipHandle, mountClip, saveClip } from '../lib/clip';
import { checkDate } from '../lib/dates';
import { displayName, nextRoute, profileComplete, useSession } from '../lib/session';
import { loadMyTab, MyTab, myKey } from '../lib/tabData';
import { useScreenFocused } from '../lib/useScreenFocused';
import { color, layout, space, type } from '../theme';

/** 내 영상 — 올해 인증샷을 한 번에. 보면서 녹화되고, 다 보면 저장 (사용자 요청 2026-11-24) */
export default function Clip() {
  const s = useSession();
  const focused = useScreenFocused();
  const group = s.membership?.group;
  const uid = s.session?.user.id;
  const data = useCache<MyTab>(group && uid ? myKey(group.id, uid) : null);
  const box = useRef<unknown>(null);
  const handle = useRef<ClipHandle | null>(null);
  const [state, setState] = useState<'loading' | 'playing' | 'done'>('loading');
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [blob, setBlob] = useState<Blob | null | undefined>(undefined); // undefined = 아직 녹화 중
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group && uid) loadMyTab(group.id, uid).catch(() => undefined);
  }, [group, uid]);

  const input = useMemo(() => {
    if (!data || !group) return null;
    return buildClipInput({
      name: displayName(s.profile),
      groupName: group.name,
      year: data.stats?.season_year ?? Number(checkDate().slice(0, 4)),
      total: data.stats?.season_count ?? 0,
      goal: data.stats?.season_goal ?? s.membership?.season_goal ?? null,
      photos: data.photos,
      urls: data.urls,
    });
    // 사진 목록이 바뀔 때만 다시 만든다 (뒤에서 새로 받아도 재생이 끊기지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data, group?.id]);

  useEffect(() => {
    if (!input || !input.photos.length || !box.current) return;
    handle.current = mountClip(box.current, input, {
      state: setState,
      progress: (a, b) => setProgress([a, b]),
      recorded: setBlob,
    });
    return () => handle.current?.destroy();
  }, [input]);

  if (focused && !s.loading && (!s.session || !profileComplete(s) || !group)) return <Redirect href={nextRoute(s) as never} />;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const save = async () => {
    if (!blob || !input) return;
    setSaving(true);
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const r = await saveClip(blob, `haenya-${input.year}.${ext}`).catch(() => 'cancelled' as const);
    setSaving(false);
    if (r === 'kakao') setNotice('카톡 안에서는 영상 저장이 안 된다. 오른쪽 아래 ⋯ → 다른 브라우저로 열기(사파리)에서 해줘.');
    else if (r === 'downloaded') setNotice('저장했다.');
    else if (r === 'shared') setNotice('보냈다. 인스타 스토리에 올려.');
  };

  const empty = data && input && !input.photos.length;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.top}>
          <Text style={[type.label, { color: color.black }]}>내 영상 · {input?.year ?? ''}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" hitSlop={12} onPress={close} style={styles.x}>
            <Text style={[type.sentence, { color: color.black }]}>✕</Text>
          </Pressable>
        </View>

        {empty ? (
          <View style={styles.empty}>
            <Text style={[type.progress, { color: color.black }]}>0장.</Text>
            <Text style={[type.sentence, { color: color.black }]}>올해 사진이 아직 없다. 인증부터.</Text>
            <Button label="인증샷 올리기" onPress={() => router.replace('/checkin')} />
          </View>
        ) : (
          <>
            <View style={styles.stage}>
              <View ref={box as never} style={styles.video} />
            </View>
            <View style={styles.bottom}>
              {Platform.OS !== 'web' ? (
                <Text style={[type.sentence, { color: color.black }]}>영상은 지금 웹에서만 된다.</Text>
              ) : state === 'loading' ? (
                <Text style={[type.sentence, { color: color.black }]}>
                  사진 모으는 중. {progress[0]}/{progress[1] || input?.photos.length || 0}
                </Text>
              ) : state === 'playing' ? (
                <Text style={[type.sentence, { color: color.black }]}>
                  {input ? `${input.photos.length}장. 끝까지 보면 저장할 수 있다.` : ''}
                </Text>
              ) : (
                <>
                  {blob !== null ? (
                    <Button label="영상 저장" onPress={save} busy={saving || blob === undefined} />
                  ) : (
                    <Text style={[type.sentence, { color: color.black }]}>이 브라우저는 영상 저장이 안 된다. 보기만.</Text>
                  )}
                  <Button label="다시 보기" variant="secondary" arrow={false} onPress={() => handle.current?.replay()} />
                </>
              )}
              {notice ? <Notice>{notice}</Notice> : null}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.cream },
  column: { flex: 1, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingHorizontal: layout.gutter },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: layout.minTouch },
  x: { minWidth: layout.minTouch, minHeight: layout.minTouch, alignItems: 'flex-end', justifyContent: 'center' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  video: { height: '100%', maxWidth: '100%', aspectRatio: 9 / 16, backgroundColor: color.black },
  bottom: { gap: space(2), paddingTop: space(3), paddingBottom: space(3), minHeight: 120, justifyContent: 'flex-end' },
  empty: { flex: 1, justifyContent: 'center', gap: space(4) },
});
