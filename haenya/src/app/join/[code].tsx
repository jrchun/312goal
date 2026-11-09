import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Notice } from '../../components/Form';
import { Rule } from '../../components/Rule';
import { Screen } from '../../components/Screen';
import { Wordmark } from '../../components/Wordmark';
import { signInWithKakao } from '../../lib/auth';
import { errorMessage } from '../../lib/errors';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import type { InvitePreview } from '../../lib/types';
import { color, line, space, type } from '../../theme';

/**
 * 초대 랜딩 (/join/[code]) — "너도 했냐?" 한 문장과 참여 버튼만.
 * 로그인돼 있고 그룹이 없으면 자동으로 합류하고 /joined 로 간다.
 */
export default function Join() {
  const { code: rawCode } = useLocalSearchParams<{ code: string }>();
  const code = (rawCode ?? '').toUpperCase();
  const s = useSession();
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined); // undefined = 불러오는 중
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const joining = useRef(false);

  useEffect(() => {
    if (!code || code === '[CODE]') return;
    supabase
      .rpc('get_invite_preview', { p_code: code })
      .maybeSingle()
      .then(({ data }) => setPreview((data as InvitePreview | null) ?? null));
  }, [code]);

  const loggedIn = !s.loading && !!s.session;
  const agreed = !!s.profile?.terms_agreed_at;
  const alreadyHere = s.membership?.group.invite_code === code;
  const otherGroup = !!s.membership && !alreadyHere;
  const canAutoJoin = loggedIn && agreed && !s.membership && !!preview && !preview.is_full;

  useEffect(() => {
    if (!canAutoJoin || joining.current) return;
    joining.current = true;
    (async () => {
      setBusy(true);
      const { error: e } = await supabase.rpc('join_group', { p_code: code });
      if (e) {
        setBusy(false);
        setError(errorMessage(e));
        return;
      }
      await s.refresh();
      router.replace('/joined');
    })();
  }, [canAutoJoin, code, s]);

  if (loggedIn && !agreed) return <Redirect href={`/login?next=${encodeURIComponent(`/join/${code}`)}` as never} />;

  const join = async () => {
    setError('');
    try {
      await signInWithKakao(`/join/${code}`);
    } catch {
      setError('카카오 로그인이 안 열렸다. 다시 해봐.');
    }
  };

  const invalid = preview === null;
  const inviter = preview?.owner_nickname;
  const pct = preview && preview.week_target > 0 ? Math.min(1, preview.week_total / preview.week_target) : 0;

  return (
    <Screen>
      <View style={styles.top}>
        <Wordmark size={22} tone="black" />
        {inviter ? <Text style={[type.caption, { color: color.black }]}>{inviter}의 초대</Text> : null}
      </View>
      <Text style={[type.headline, styles.headline, invalid && styles.headlineSmall]} adjustsFontSizeToFit numberOfLines={2}>
        {invalid ? '없는\n링크다.' : '너도\n했냐?'}
      </Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>
        {invalid
          ? '초대 링크가 틀렸거나 그룹이 없어졌다.'
          : '친구끼리 운동 인증.\n사진 한 장이면 끝.\n안 하면 단톡방에서 찔린다.'}
      </Text>

      {preview ? (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={[type.rankName, styles.groupName]} numberOfLines={1}>{preview.group_name}</Text>
            <Text style={[type.caption, { color: color.black }]}>
              주 {preview.weekly_goal}회 · {preview.season_year} 시즌
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[type.caption, { color: color.black }]}>이번 주 그룹 합계 · {preview.member_count}명</Text>
            <Text style={[type.button, { color: color.black }]}>
              {preview.week_total} / {preview.week_target}회
            </Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Notice tone="error">
          {error ||
            (preview?.is_full && !alreadyHere ? errorMessage({ message: 'GROUP_FULL' }) : '') ||
            (otherGroup ? errorMessage({ message: 'ALREADY_IN_GROUP' }) : '')}
        </Notice>
        {invalid || otherGroup ? (
          <Button label={otherGroup ? '내 그룹으로' : '처음으로'} onPress={() => router.replace(otherGroup ? '/home' : '/')} />
        ) : alreadyHere ? (
          <>
            <Notice>이미 이 그룹이다.</Notice>
            <Button label="홈으로" onPress={() => router.replace('/home')} />
          </>
        ) : (
          <Button
            label="카카오 계정으로 참여"
            onPress={join}
            busy={busy || preview === undefined || (loggedIn && canAutoJoin)}
            disabled={!!preview?.is_full}
          />
        )}
        {!loggedIn && !invalid ? (
          <Button variant="text" label="우리 그룹 새로 만들기" onPress={() => router.push('/')} />
        ) : null}
        <Text style={[type.caption, styles.center]}>앱 설치 없이 웹에서 바로 시작</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space(4) },
  headline: { color: color.red, paddingTop: space(4), paddingBottom: space(2) },
  headlineSmall: { fontSize: 96, lineHeight: 96 * 0.9, letterSpacing: -4 },
  sentence: { color: color.black, paddingTop: space(4) },
  card: { marginTop: space(6), borderWidth: 2, borderColor: color.black, padding: space(4), gap: space(3) },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space(3) },
  groupName: { color: color.black, fontSize: 24, lineHeight: 30, flexShrink: 1 },
  bar: { height: line.section, backgroundColor: color.cream, borderWidth: 1, borderColor: color.black },
  barFill: { height: '100%', backgroundColor: color.black },
  actions: { marginTop: 'auto', gap: space(2), paddingVertical: space(6) },
  center: { textAlign: 'center' },
});
