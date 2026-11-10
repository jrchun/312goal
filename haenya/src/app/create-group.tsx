import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Field, Label, Notice, Stepper } from '../components/Form';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { errorMessage } from '../lib/errors';
import { copyOrShareInvite, inviteUrl } from '../lib/invite';
import { profileComplete, useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import type { Group } from '../lib/types';
import { useScreenFocused } from '../lib/useScreenFocused';
import { color, space, type } from '../theme';

/** 그룹 만들기: 이름 · 주간 목표(기본 3) · 연간 목표(기본 150) → 초대 링크 */
export default function CreateGroup() {
  const s = useSession();
  const [name, setName] = useState('');
  const [weekly, setWeekly] = useState(3);
  const [season, setSeason] = useState(150);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Group | null>(null);

  const focused = useScreenFocused();
  if (created) return <Created group={created} />;
  if (focused && !s.loading && !s.session) return <Redirect href="/login?next=/create-group" />;
  if (focused && !s.loading && s.session && !profileComplete(s)) return <Redirect href="/login?next=/create-group" />;
  if (focused && !s.loading && s.membership) return <Redirect href="/home" />;

  const submit = async () => {
    setBusy(true);
    setError('');
    const { data, error: e } = await supabase
      .rpc('create_group', { p_name: name.trim(), p_weekly_goal: weekly, p_season_goal: season })
      .single();
    setBusy(false);
    if (e || !data) {
      setError(errorMessage(e));
      return;
    }
    setCreated(data as Group);
    s.refresh();
  };

  return (
    <Screen>
      <Text style={styles.title}>그룹{'\n'}만들기.</Text>
      <Rule />
      <View style={styles.form}>
        <Field label="그룹 이름" value={name} onChangeText={setName} maxLength={20} placeholder="운동 4인방" />
        <Stepper label="주간 목표" value={weekly} onChange={setWeekly} min={1} max={7} unit="회" />
        <Stepper label="올해 목표" value={season} onChange={setSeason} min={10} max={366} step={10} unit="회" />
        <Text style={type.caption}>올해 목표는 멤버마다 나중에 바꿀 수 있다.</Text>
      </View>
      <View style={styles.actions}>
        <Notice tone="error">{error}</Notice>
        <Button label="그룹 만들기" onPress={submit} disabled={!name.trim()} busy={busy} />
      </View>
    </Screen>
  );
}

function Created({ group }: { group: Group }) {
  const [msg, setMsg] = useState('');
  const share = async () => {
    const r = await copyOrShareInvite(group.invite_code);
    setMsg(r === 'copied' ? '복사했다. 단톡방에 붙여넣어.' : r === 'failed' ? '복사가 안 됐다. 주소를 길게 눌러 복사해.' : '');
  };
  return (
    <Screen>
      <Text style={styles.title}>만들었다.</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>
        {group.name}. 이제 친구들 끌어들일 차례.
      </Text>
      <View style={styles.form}>
        <Label>초대 링크</Label>
        <Text selectable style={styles.link}>{inviteUrl(group.invite_code)}</Text>
      </View>
      <View style={styles.actions}>
        <Notice>{msg}</Notice>
        <Button label="초대 링크 복사" onPress={share} />
        <Button variant="secondary" label="다음" onPress={() => router.replace('/onboarding')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 72, lineHeight: 76, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(4) },
  form: { gap: space(6), paddingTop: space(6) },
  link: { ...type.sentence, fontSize: 18, lineHeight: 24, color: color.black, paddingTop: space(1) },
  actions: { marginTop: 'auto', gap: space(3), paddingVertical: space(6) },
});
