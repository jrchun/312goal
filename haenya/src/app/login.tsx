import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Check, Field, Notice } from '../components/Form';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { signInWithKakao } from '../lib/auth';
import { nextRoute, useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { color, space, type } from '../theme';

/**
 * 로그인 + 약관 동의.
 *  로그인 전: 카카오 버튼
 *  로그인 후 약관 미동의: 닉네임 확인 + 필수 동의 2개
 *  다 끝났으면: 갈 곳으로
 */
export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const s = useSession();
  const [error, setError] = useState('');

  if (!s.loading && s.session && s.profile?.terms_agreed_at) {
    return <Redirect href={nextRoute(s, next) as never} />;
  }
  if (!s.loading && s.session) return <Consent next={next} />;

  const start = async () => {
    setError('');
    try {
      await signInWithKakao(next ?? '/');
    } catch {
      setError('카카오 로그인이 안 열렸다. 다시 해봐.');
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>로그인.</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>카카오로 바로. 이메일은 안 받는다.</Text>
      <View style={styles.actions}>
        <Notice tone="error">{error}</Notice>
        <Button label="카카오 계정으로 시작" onPress={start} busy={s.loading} />
      </View>
    </Screen>
  );
}

function Consent({ next }: { next?: string }) {
  const s = useSession();
  const [nickname, setNickname] = useState(s.profile?.nickname ?? '');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (s.profile?.nickname && !nickname) setNickname(s.profile.nickname);
  }, [s.profile?.nickname]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = nickname.trim();
  const ready = name.length >= 1 && name.length <= 20 && terms && privacy;

  const save = async () => {
    if (!s.session || !ready) return;
    setBusy(true);
    setError('');
    const meta = s.session.user.user_metadata ?? {};
    const uid = s.session.user.id;
    const fields = {
      nickname: name,
      avatar_url: s.profile?.avatar_url ?? meta.picture ?? meta.avatar_url ?? null,
      terms_agreed_at: new Date().toISOString(),
    };
    // 프로필은 보통 첫 로그인 때 DB 트리거가 만들어 둔다 → 수정. 없을 때만 새로 만든다.
    // (upsert는 id 칸까지 수정하려 해서 권한 오류가 난다)
    const updated = await supabase.from('profiles').update(fields).eq('id', uid).select('id');
    let e = updated.error;
    if (!e && (updated.data?.length ?? 0) === 0) {
      e = (await supabase.from('profiles').insert({ id: uid, ...fields })).error;
    }
    if (e) {
      setBusy(false);
      setError('저장이 안 됐다. 다시 해봐.');
      return;
    }
    const state = await s.refresh();
    router.replace(nextRoute(state, next) as never);
  };

  return (
    <Screen>
      <Text style={styles.title}>반갑다.</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>이름부터 확인하자. 친구들한테 이렇게 보인다.</Text>
      <View style={styles.form}>
        <Field label="닉네임" value={nickname} onChangeText={setNickname} maxLength={20} placeholder="성우" />
        <View>
          <Check
            checked={terms && privacy}
            onToggle={() => {
              const v = !(terms && privacy);
              setTerms(v);
              setPrivacy(v);
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
        </View>
      </View>
      <View style={styles.actions}>
        <Notice tone="error">{error}</Notice>
        <Button label="시작하기" onPress={save} disabled={!ready} busy={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 72, lineHeight: 76, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(4) },
  form: { gap: space(8), paddingTop: space(8) },
  actions: { marginTop: 'auto', gap: space(3), paddingVertical: space(6) },
});
