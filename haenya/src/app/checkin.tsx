import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Form';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { submitCheckin } from '../lib/checkin';
import { errorMessage } from '../lib/errors';
import { pickPhoto, preparePhoto } from '../lib/photo';
import { nextRoute, useSession } from '../lib/session';
import { useScreenFocused } from '../lib/useScreenFocused';
import { color, space, type } from '../theme';

/** 인증샷 올리기: 지금 찍기(기본) / 앨범에서 고르기 → 날짜 판정 → 인증 완료 화면 */
export default function Checkin() {
  const s = useSession();
  const { membership, session } = s;
  const focused = useScreenFocused();
  const [busy, setBusy] = useState<'camera' | 'album' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  // 로그인·그룹 없이 주소로 바로 들어오면 갈 곳으로 보낸다 (버튼이 아무 반응 없던 문제)
  if (focused && !s.loading && (!session || !membership)) return <Redirect href={nextRoute(s) as never} />;

  const go = async (mode: 'camera' | 'album') => {
    if (!membership || !session) return;
    setError('');
    let file: File | null = null;
    try {
      file = await pickPhoto(mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : errorMessage(null));
      return;
    }
    if (!file) return; // 고르기 취소
    setBusy(mode);
    try {
      const photo = await preparePhoto(file, mode).catch(() => {
        throw new Error('PHOTO_UNREADABLE');
      });
      setPreview(photo.previewUrl);
      await submitCheckin(membership.group.id, session.user.id, photo);
      router.replace('/checkin-done');
    } catch (e) {
      setError(errorMessage(e));
      setPreview(null); // 거절된 사진은 내린다
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>인증샷.</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>오늘 찍은 사진만 된다.</Text>
      {preview ? (
        <View style={styles.previewBox}>
          <Image source={{ uri: preview }} style={styles.preview} resizeMode="cover" />
        </View>
      ) : null}
      <View style={styles.actions}>
        <Notice tone="error">{error}</Notice>
        {busy ? <Notice>올리는 중.</Notice> : null}
        <Button label="지금 찍기" onPress={() => go('camera')} busy={busy === 'camera'} disabled={!!busy} />
        <Button variant="secondary" label="앨범에서 고르기" onPress={() => go('album')} busy={busy === 'album'} disabled={!!busy} />
        <Button variant="text" label="닫기" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 72, lineHeight: 76, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(4) },
  previewBox: { marginTop: space(5), borderWidth: 2, borderColor: color.black },
  preview: { width: '100%', aspectRatio: 3 / 4 },
  actions: { marginTop: 'auto', gap: space(3), paddingVertical: space(6) },
});
