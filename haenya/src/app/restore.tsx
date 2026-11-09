import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Field, Label, Notice, PinField } from '../components/Form';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { signInWithKakao } from '../lib/auth';
import { restoreWithPin } from '../lib/device-auth';
import { errorMessage } from '../lib/errors';
import { nextRoute, useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import type { RestoreCandidate } from '../lib/types';
import { color, font, layout, line, space, type } from '../theme';

/** 링크나 코드에서 초대 코드 8자리만 뽑기 */
function parseCode(input: string): string {
  const m = input.trim().toUpperCase().match(/([23456789A-HJ-NP-Z]{8})\/?$/);
  return m ? m[1] : '';
}

/**
 * 나 이미 있어 — 다른 폰·홈 화면 아이콘·다른 브라우저에서 내 기록 되찾기.
 * 그룹 멤버 목록에서 내 이름을 고르고 숫자 4자리. (5번 틀리면 15분 잠금)
 */
export default function Restore() {
  const params = useLocalSearchParams<{ code?: string }>();
  const s = useSession();
  // 정적 HTML(서버)과 첫 화면을 맞추려고 빈 값으로 시작해서, 화면이 뜬 뒤 주소의 코드를 읽는다
  const [code, setCode] = useState('');
  useEffect(() => {
    if (params.code) setCode(parseCode(params.code));
  }, [params.code]);
  const [codeInput, setCodeInput] = useState('');
  const [list, setList] = useState<RestoreCandidate[] | null>(null);
  const [picked, setPicked] = useState<RestoreCandidate | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    setList(null);
    supabase.rpc('restore_candidates', { p_code: code }).then(({ data }) => setList((data as RestoreCandidate[]) ?? []));
  }, [code]);

  if (!s.loading && s.session) return <Redirect href={nextRoute(s) as never} />;

  const go = async () => {
    if (!picked || pin.length !== 4) return;
    setBusy(true);
    setError('');
    try {
      await restoreWithPin(picked.user_id, pin);
      const state = await s.refresh();
      router.replace(nextRoute(state, `/join/${code}`) as never);
    } catch (e) {
      setError(errorMessage(e));
      setPin('');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{picked ? `${picked.given_name ?? picked.display_name}?` : '나 찾기.'}</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>
        {picked ? '내 숫자 4자리.' : code ? '우리 그룹에서 내 이름을 골라.' : '우리 그룹 초대 링크나 코드를 넣어.'}
      </Text>

      {!code ? (
        <View style={styles.form}>
          <Field label="초대 링크 또는 코드" value={codeInput} onChangeText={setCodeInput} autoCapitalize="characters" placeholder="haenya.pages.dev/join/ABCD2345" />
          <Notice tone="error">{codeInput && !parseCode(codeInput) ? '코드는 8자리다.' : ''}</Notice>
          <Button variant="secondary" label="찾기" disabled={!parseCode(codeInput)} onPress={() => setCode(parseCode(codeInput))} />
        </View>
      ) : picked ? (
        <View style={styles.form}>
          <PinField label="숫자 4자리" value={pin} onChange={setPin} autoFocus onSubmit={go} />
        </View>
      ) : (
        <View style={styles.list}>
          {list === null ? <Notice>찾는 중.</Notice> : null}
          {list?.length === 0 ? <Notice tone="error">없는 그룹이다. 링크를 다시 확인해.</Notice> : null}
          {list?.map((c) => (
            <Pressable
              key={c.user_id}
              accessibilityRole="button"
              onPress={() => {
                setPicked(c);
                setError('');
              }}
              style={styles.row}
            >
              <Text style={{ ...font.display, fontSize: 28, color: color.black }}>{c.display_name}</Text>
              <Text style={type.caption}>{c.can_pin ? '이거 나 →' : '카카오 계정'}</Text>
            </Pressable>
          ))}
          {list?.length ? <Rule weight="row" /> : null}
        </View>
      )}

      <View style={styles.actions}>
        <Notice tone="error">{error}</Notice>
        {picked ? (
          picked.can_pin ? (
            <>
              <Button label="들어가기" onPress={go} disabled={pin.length !== 4} busy={busy} />
              <Text style={[type.caption, styles.center]}>숫자를 잊었으면 그룹장한테 초기화해달라고 해.</Text>
            </>
          ) : (
            <>
              <Text style={[type.sentence, { color: color.black }]}>카카오로 가입한 계정이다. 카카오로 이어가자.</Text>
              <Button label="카카오로 이어가기" onPress={() => signInWithKakao(`/join/${code}`).catch(() => setError('카카오 로그인이 안 열렸다.'))} />
            </>
          )
        ) : null}
        {picked ? (
          <Button variant="text" label="다른 이름 고르기" onPress={() => { setPicked(null); setPin(''); setError(''); }} />
        ) : (
          <Button variant="text" label="처음이야. 새로 시작" onPress={() => router.replace((code ? `/login?next=/join/${code}` : '/login') as never)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 64, lineHeight: 68, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(4) },
  form: { gap: space(4), paddingTop: space(7) },
  list: { paddingTop: space(6) },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    minHeight: layout.minTouch + space(4), borderTopWidth: line.row, borderTopColor: color.black,
  },
  actions: { marginTop: 'auto', gap: space(2), paddingVertical: space(6) },
  center: { textAlign: 'center' },
});
