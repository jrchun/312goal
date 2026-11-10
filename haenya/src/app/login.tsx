import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Check, Field, Notice, PinField } from '../components/Form';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { registerDevice } from '../lib/device-auth';
import { errorMessage } from '../lib/errors';
import { nextRoute, profileComplete, useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { useScreenFocused } from '../lib/useScreenFocused';
import { color, space, type } from '../theme';

/**
 * 시작하기 (기본 로그인) — 성·이름·숫자 4자리·약관을 한 화면에서.
 *  로그인 전: 이 기기를 등록(새 계정) → 다음부터 자동 로그인
 *  로그인했지만 프로필 미완성(카카오로 들어온 예전 계정, 임시 숫자 등): 빈 칸만 채운다
 * 다른 폰·홈 화면 아이콘에서는 "나 이미 있어"(/restore)로 이름 + 4자리를 넣어 되찾는다.
 */
export default function Start() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const s = useSession();
  const [family, setFamily] = useState('');
  const [given, setGiven] = useState('');
  const [pin, setPin] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (s.profile?.family_name && !family) setFamily(s.profile.family_name);
    if (s.profile?.given_name && !given) setGiven(s.profile.given_name);
  }, [s.profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const focused = useScreenFocused();
  if (focused && !s.loading && s.session && profileComplete(s)) return <Redirect href={nextRoute(s, next) as never} />;

  const loggedIn = !!s.session;
  const agreedBefore = !!s.profile?.terms_agreed_at;
  const needPin = !s.pin?.has_pin || !!s.pin?.is_temp;
  const tempPin = !!s.pin?.is_temp;
  const allChecked = terms && privacy && age;
  const f = family.trim();
  const g = given.trim();
  const ready = f.length >= 1 && f.length <= 5 && g.length >= 1 && g.length <= 10 && (!needPin || pin.length === 4) && (agreedBefore || allChecked);
  const code = next?.startsWith('/join/') ? next.slice(6).split('?')[0] : '';

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      if (!loggedIn) await registerDevice({ family: f, given: g });
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error('REGISTER_FAILED');
      const fields = {
        family_name: f,
        given_name: g,
        nickname: `${f}${g}`,
        ...(agreedBefore ? {} : { terms_agreed_at: new Date().toISOString() }),
      };
      const { error: e1 } = await supabase.from('profiles').update(fields).eq('id', uid);
      if (e1) throw new Error('SAVE_FAILED');
      if (needPin) {
        const { error: e2 } = await supabase.rpc('set_my_pin', { p_pin: pin });
        if (e2) throw new Error(e2.message);
      }
      const state = await s.refresh();
      router.replace(nextRoute(state, next) as never);
    } catch (e) {
      setError(e instanceof Error && e.message === 'SAVE_FAILED' ? '저장이 안 됐다. 다시 해봐.' : errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{tempPin ? '새 숫자.' : loggedIn ? '거의 다 됐다.' : '시작하자.'}</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>
        {tempPin
          ? '임시 숫자로 들어왔다. 내 숫자 4자리를 새로 정하자.'
          : '이름이랑 숫자 4자리면 끝. 숫자는 다른 폰이나 홈 화면 아이콘에서 내 기록 찾을 때 쓴다.'}
      </Text>
      <View style={styles.form}>
        <View style={styles.nameRow}>
          <View style={styles.family}>
            <Field label="성" value={family} onChangeText={setFamily} maxLength={5} placeholder="천" />
          </View>
          <View style={styles.given}>
            <Field label="이름" value={given} onChangeText={setGiven} maxLength={10} placeholder="성우" />
          </View>
        </View>
        {needPin ? <PinField label={tempPin ? '새 숫자 4자리' : '숫자 4자리 (잊지 말 것)'} value={pin} onChange={setPin} onSubmit={submit} /> : null}
        {!agreedBefore ? (
          <View>
            <Check
              checked={allChecked}
              onToggle={() => {
                const v = !allChecked;
                setTerms(v);
                setPrivacy(v);
                setAge(v);
              }}
            >
              모두 동의
            </Check>
            <Rule weight="row" />
            <Check checked={terms} onToggle={() => setTerms(!terms)}
              right={<Button variant="text" label="보기" onPress={() => router.push('/terms')} />}>
              이용약관 (필수)
            </Check>
            <Check checked={privacy} onToggle={() => setPrivacy(!privacy)}
              right={<Button variant="text" label="보기" onPress={() => router.push('/privacy')} />}>
              개인정보 수집·이용 (필수)
            </Check>
            <Check checked={age} onToggle={() => setAge(!age)}>
              만 14세 이상이다 (필수)
            </Check>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Notice tone="error">{error}</Notice>
        <Button label={loggedIn ? '저장하고 시작' : code ? '참여하기' : '시작하기'} onPress={submit} disabled={!ready} busy={busy || s.loading} />
        {!loggedIn ? (
          <Button
            variant="text"
            label="나 이미 있어. 내 기록 찾기"
            onPress={() => router.push((code ? `/restore?code=${code}` : '/restore') as never)}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 64, lineHeight: 68, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(4) },
  form: { gap: space(7), paddingTop: space(7) },
  nameRow: { flexDirection: 'row', gap: space(4) },
  family: { width: 96 },
  given: { flex: 1 },
  actions: { marginTop: 'auto', gap: space(2), paddingVertical: space(6) },
});
