import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice, Stepper } from '../components/Form';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { TopBar } from '../components/TopBar';
import { displayName, useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { color, space, type } from '../theme';

/** 그룹 합류 확인: 그룹 정보 + 내 올해 목표 */
export default function Joined() {
  const s = useSession();
  const m = s.membership;
  const [goal, setGoal] = useState(m?.season_goal ?? 150);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (m) setGoal(m.season_goal);
  }, [m?.season_goal]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s.loading && !m) return <Redirect href="/" />;
  if (!m) return <Screen>{null}</Screen>;

  const save = async () => {
    setBusy(true);
    setError('');
    if (goal !== m.season_goal) {
      const { error: e } = await supabase
        .from('group_members')
        .update({ season_goal: goal })
        .eq('group_id', m.group.id)
        .eq('user_id', s.session!.user.id);
      if (e) {
        setBusy(false);
        setError('저장이 안 됐다. 다시 해봐.');
        return;
      }
      await s.refresh();
    }
    router.replace('/home');
  };

  return (
    <Screen>
      <TopBar left={m.group.name} right={`주 ${m.group.weekly_goal}회`} />
      <Text style={styles.title} adjustsFontSizeToFit numberOfLines={2}>들어왔다.</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>
        {displayName(s.profile)}. 이제 {m.group.name} 멤버다.{'\n'}내 올해 목표만 정하자.
      </Text>
      <View style={styles.form}>
        <Stepper label="내 올해 목표" value={goal} onChange={setGoal} min={10} max={366} step={10} unit="회" />
        <Text style={type.caption}>그룹 기본은 {m.group.season_goal}회. 나한테 맞게 바꿔도 된다.</Text>
      </View>
      <View style={styles.actions}>
        <Notice tone="error">{error}</Notice>
        <Button label="확인" onPress={save} busy={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 72, lineHeight: 76, color: color.black, paddingTop: space(4), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(4) },
  form: { gap: space(4), paddingTop: space(8) },
  actions: { marginTop: 'auto', gap: space(3), paddingVertical: space(6) },
});
