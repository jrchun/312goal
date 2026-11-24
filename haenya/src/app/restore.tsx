import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Field, Notice, PinField } from '../components/Form';
import { MemberCircles } from '../components/MemberCircles';
import { NameCircle } from '../components/NameCircle';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { signInWithKakao } from '../lib/auth';
import { claimAccount, restoreWithPin } from '../lib/device-auth';
import { errorMessage } from '../lib/errors';
import { nextRoute, useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import type { RestoreCandidate } from '../lib/types';
import { useScreenFocused } from '../lib/useScreenFocused';
import { color, layout, line, space, type } from '../theme';

// 안내 문구용 대표 주소(빌드 때 들어가는 EXPO_PUBLIC_SITE_URL). 새 주소로 옮기면 그 값만 바꾼다.
const SITE_HOST = (process.env.EXPO_PUBLIC_SITE_URL || 'https://haenya.pages.dev').replace(/^https?:\/\//, '').replace(/\/+$/, '');

type GroupItem = { group_id: string; name: string; member_count: number };

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
  const params = useLocalSearchParams<{ code?: string; user?: string }>();
  const s = useSession();
  // 정적 HTML(서버)과 첫 화면을 맞추려고 빈 값으로 시작해서, 화면이 뜬 뒤 주소의 코드를 읽는다
  const [code, setCode] = useState('');
  useEffect(() => {
    if (params.code) setCode(parseCode(params.code));
  }, [params.code]);
  const [codeInput, setCodeInput] = useState('');
  // 초대 코드 없이: 그룹 목록에서 고르기 (사용자 결정 2026-11-24). 목록에서는 되찾기만 — 새 가입은 초대 링크로
  const [groups, setGroups] = useState<GroupItem[] | null>(null);
  const [groupId, setGroupId] = useState('');
  const [byCode, setByCode] = useState(false);
  useEffect(() => {
    if (params.code || groups) return;
    supabase.rpc('restore_groups').then(({ data, error }) => (error ? setError('그룹 목록을 못 불러왔다. 새로고침해.') : setGroups((data as GroupItem[]) ?? [])));
  }, [params.code, groups]);
  const [list, setList] = useState<RestoreCandidate[] | null>(null);
  const [picked, setPicked] = useState<RestoreCandidate | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code && !groupId) return;
    setList(null);
    const q = code
      ? supabase.rpc('restore_candidates', { p_code: code })
      : supabase.rpc('restore_candidates_by_group', { p_group: groupId });
    q.then(({ data }) => {
      const rows = (data as RestoreCandidate[]) ?? [];
      setList(rows);
      // 초대 화면에서 동그라미를 누르고 왔으면 바로 숫자 입력
      const pre = rows.find((r) => r.user_id === params.user);
      if (pre) setPicked(pre);
    });
  }, [code, groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const found = !!code || !!groupId;
  const after = code ? `/join/${code}` : '/home';

  const focused = useScreenFocused();
  if (focused && !s.loading && s.session) return <Redirect href={nextRoute(s) as never} />;

  const go = async (value = pin) => {
    if (!picked || value.length !== 4 || busy) return;
    setBusy(true);
    setError('');
    try {
      await restoreWithPin(picked.user_id, value);
      const state = await s.refresh();
      router.replace(nextRoute(state, after) as never);
    } catch (e) {
      setError(errorMessage(e));
      setPin('');
      setBusy(false);
    }
  };

  // 미리 만들어 둔 내 자리(숫자 아직 없음): 들어가서 숫자·약관을 정한다
  const claim = async () => {
    if (!picked || busy) return;
    setBusy(true);
    setError('');
    try {
      await claimAccount(picked.user_id, code);
      const state = await s.refresh();
      router.replace(nextRoute(state, `/join/${code}`) as never);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{picked ? `${picked.given_name ?? picked.display_name}?` : '너 누구?'}</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>
        {picked ? (picked.claimable ? '처음 왔다. 너 맞으면 들어가서 숫자 4자리 정하자.' : picked.can_pin ? '숫자 4자리 누르면 바로 들어간다.' : '카카오로 가입한 계정이다.') : found ? '우리 그룹에서 너를 눌러.' : byCode ? '우리 그룹 초대 링크나 코드를 넣어.' : '우리 그룹 골라.'}
      </Text>

      {!found && !byCode ? (
        <View style={styles.groups}>
          {groups === null && !error ? <Notice>찾는 중.</Notice> : null}
          {groups?.map((g) => (
            <Pressable
              key={g.group_id}
              accessibilityRole="button"
              accessibilityLabel={`${g.name} 그룹`}
              onPress={() => {
                setGroupId(g.group_id);
                setError('');
              }}
              style={styles.groupRow}
            >
              <Text style={[type.rankName, styles.groupName]} numberOfLines={1}>{g.name}</Text>
              <Text style={[type.sentence, { color: color.black }]}>{g.member_count}명 →</Text>
            </Pressable>
          ))}
          <View style={styles.byCode}>
            <Button variant="text" label="초대 링크·코드로 찾기" onPress={() => setByCode(true)} />
          </View>
        </View>
      ) : !found ? (
        <View style={styles.form}>
          <Field label="초대 링크 또는 코드" value={codeInput} onChangeText={setCodeInput} autoCapitalize="characters" placeholder={`${SITE_HOST}/join/ABCD2345`} />
          <Notice tone="error">{codeInput && !parseCode(codeInput) ? '코드는 8자리다.' : ''}</Notice>
          <Button variant="secondary" label="찾기" disabled={!parseCode(codeInput)} onPress={() => setCode(parseCode(codeInput))} />
        </View>
      ) : picked ? (
        <View style={styles.form}>
          <NameCircle name={picked.given_name ?? picked.display_name} caption={picked.display_name} kakao={!picked.can_pin && !picked.claimable} size={112} />
          {picked.can_pin ? (
            <PinField
              label="숫자 4자리"
              value={pin}
              autoFocus
              onChange={(v) => {
                setPin(v);
                if (v.length === 4) go(v);
              }}
              onSubmit={() => go()}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.list}>
          {list === null ? <Notice>찾는 중.</Notice> : null}
          {list?.length === 0 ? <Notice tone="error">없는 그룹이다. 링크를 다시 확인해.</Notice> : null}
          {list?.length ? (
            <MemberCircles
              members={list}
              onPick={(c) => {
                setPicked(c);
                setError('');
              }}
            />
          ) : null}
        </View>
      )}

      <View style={styles.actions}>
        <Notice tone="error">{error}</Notice>
        {picked ? (
          picked.claimable ? (
            <Button label="나 맞다" onPress={claim} busy={busy} />
          ) : picked.can_pin ? (
            <>
              {busy ? <Notice>들어가는 중.</Notice> : null}
              <Text style={[type.caption, styles.center]}>숫자를 잊었으면 그룹장한테 초기화해달라고 해.</Text>
            </>
          ) : (
            <>
              <Text style={[type.sentence, { color: color.black }]}>카카오로 가입한 계정이다. 카카오로 이어가자.</Text>
              <Button label="카카오로 이어가기" onPress={() => signInWithKakao(after).catch(() => setError('카카오 로그인이 안 열렸다.'))} />
            </>
          )
        ) : null}
        {picked ? (
          <Button variant="text" label="다른 이름 고르기" onPress={() => { setPicked(null); setPin(''); setError(''); }} />
        ) : groupId ? (
          <Button variant="text" label="다른 그룹 고르기" onPress={() => { setGroupId(''); setList(null); setError(''); }} />
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
  form: { gap: space(6), paddingTop: space(7), alignItems: 'stretch' },
  list: { paddingTop: space(8) },
  groups: { paddingTop: space(6) },
  groupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(3), minHeight: layout.minTouch + space(4), borderBottomWidth: line.row, borderBottomColor: color.black },
  groupName: { color: color.black, flexShrink: 1 },
  byCode: { paddingTop: space(4), alignItems: 'flex-start' },
  actions: { marginTop: 'auto', gap: space(2), paddingVertical: space(6) },
  center: { textAlign: 'center' },
});
