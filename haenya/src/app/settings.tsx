import { router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Field, Label, Notice, Stepper } from '../components/Form';
import { Rule } from '../components/Rule';
import { Screen } from '../components/Screen';
import { deleteMyAccount, leaveGroup } from '../lib/account';
import { errorMessage } from '../lib/errors';
import { copyOrShareInvite } from '../lib/invite';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { color, line, space, type } from '../theme';

type Msg = { text: string; tone: 'info' | 'error' } | null;

/** 설정 — 닉네임, 내 올해 목표, (그룹장) 그룹 설정, 초대 링크, 로그아웃, 그룹 나가기, 회원 탈퇴 */
export default function Settings() {
  const s = useSession();
  const m = s.membership;
  const g = m?.group;
  const uid = s.session?.user.id;
  const isOwner = !!g && g.owner_id === uid;

  const [nickname, setNickname] = useState(s.profile?.nickname ?? '');
  const [myGoal, setMyGoal] = useState(m?.season_goal ?? 150);
  const [gName, setGName] = useState(g?.name ?? '');
  const [gWeekly, setGWeekly] = useState(g?.weekly_goal ?? 3);
  const [gSeason, setGSeason] = useState(g?.season_goal ?? 150);
  const [msg, setMsg] = useState<Record<string, Msg>>({});
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (s.profile) setNickname(s.profile.nickname);
    if (m) setMyGoal(m.season_goal);
    if (g) {
      setGName(g.name);
      setGWeekly(g.weekly_goal);
      setGSeason(g.season_goal);
    }
  }, [s.profile, m, g]);

  const say = (key: string, text: string, tone: 'info' | 'error' = 'info') => setMsg((x) => ({ ...x, [key]: { text, tone } }));

  const run = async (key: string, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(key);
    const { error } = await fn();
    setBusy(null);
    if (error) return say(key, errorMessage(error), 'error');
    await s.refresh();
    say(key, ok);
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));

  return (
    <Screen>
      <View style={styles.top}>
        <Button variant="text" label="← 돌아가기" onPress={back} />
      </View>
      <Text style={styles.title}>설정.</Text>
      <Rule />

      <Section>
        <Field label="닉네임" value={nickname} onChangeText={setNickname} maxLength={20} />
        <Notice tone={msg.nick?.tone}>{msg.nick?.text}</Notice>
        <Button
          variant="secondary"
          label="닉네임 저장"
          busy={busy === 'nick'}
          disabled={!nickname.trim() || nickname.trim() === s.profile?.nickname}
          onPress={() => run('nick', () => supabase.from('profiles').update({ nickname: nickname.trim() }).eq('id', uid!), '바꿨다.')}
        />
      </Section>

      {m && g ? (
        <Section>
          <Stepper label="내 올해 목표" value={myGoal} onChange={setMyGoal} min={10} max={366} step={10} unit="회" />
          <Notice tone={msg.goal?.tone}>{msg.goal?.text}</Notice>
          <Button
            variant="secondary"
            label="목표 저장"
            busy={busy === 'goal'}
            disabled={myGoal === m.season_goal}
            onPress={() =>
              run('goal', () => supabase.from('group_members').update({ season_goal: myGoal }).eq('group_id', g.id).eq('user_id', uid!), '바꿨다.')
            }
          />
        </Section>
      ) : null}

      {isOwner && g ? (
        <Section>
          <Label>그룹 설정 · 그룹장만</Label>
          <Field label="그룹 이름" value={gName} onChangeText={setGName} maxLength={20} />
          <Stepper label="주간 목표 (모두 같이)" value={gWeekly} onChange={setGWeekly} min={1} max={7} unit="회" />
          <Stepper label="새 멤버 기본 올해 목표" value={gSeason} onChange={setGSeason} min={10} max={366} step={10} unit="회" />
          <Notice tone={msg.group?.tone}>{msg.group?.text}</Notice>
          <Button
            variant="secondary"
            label="그룹 설정 저장"
            busy={busy === 'group'}
            disabled={!gName.trim() || (gName.trim() === g.name && gWeekly === g.weekly_goal && gSeason === g.season_goal)}
            onPress={() =>
              run(
                'group',
                () => supabase.from('groups').update({ name: gName.trim(), weekly_goal: gWeekly, season_goal: gSeason }).eq('id', g.id),
                '바꿨다.',
              )
            }
          />
        </Section>
      ) : null}

      {g ? (
        <Section>
          <Label>초대 링크</Label>
          <Notice tone={msg.invite?.tone}>{msg.invite?.text}</Notice>
          <Button
            variant="secondary"
            label="초대 링크 복사"
            onPress={async () => {
              const r = await copyOrShareInvite(g.invite_code);
              if (r === 'copied') say('invite', '복사했다.');
            }}
          />
        </Section>
      ) : null}

      <Section>
        <Label>내 인증 지우기</Label>
        <Text style={[type.sentence, { color: color.black }]}>마이 화면에서 사진을 누르면 지울 수 있다.</Text>
      </Section>

      <Section>
        <Button
          variant="secondary"
          label="로그아웃"
          arrow={false}
          onPress={async () => {
            await s.signOut();
            router.replace('/');
          }}
        />
      </Section>

      <Section>
        <Label>위험</Label>
        <Notice tone={msg.danger?.tone}>{msg.danger?.text}</Notice>
        {g ? (
          confirm === 'leave' ? (
            <>
              <Text style={[type.sentence, styles.warn]}>
                나가면 이 그룹의 내 인증 기록과 사진이 지워진다.{isOwner ? ' 그룹장은 다음 멤버에게 넘어간다. 혼자면 그룹이 없어진다.' : ''}
              </Text>
              <Button
                variant="poke"
                label="정말 나간다"
                busy={busy === 'leave'}
                onPress={async () => {
                  setBusy('leave');
                  try {
                    await leaveGroup(g.id, uid!);
                    await s.refresh();
                    router.replace('/create-group');
                  } catch (e) {
                    say('danger', errorMessage(e), 'error');
                  }
                  setBusy(null);
                }}
              />
              <Button variant="text" label="취소" onPress={() => setConfirm(null)} />
            </>
          ) : (
            <Button variant="text" label="그룹 나가기" onPress={() => setConfirm('leave')} />
          )
        ) : null}
        {confirm === 'delete' ? (
          <>
            <Text style={[type.sentence, styles.warn]}>탈퇴하면 프로필·인증 기록·사진이 바로 지워지고 되돌릴 수 없다.</Text>
            <Button
              variant="poke"
              label="정말 탈퇴한다"
              busy={busy === 'delete'}
              onPress={async () => {
                setBusy('delete');
                try {
                  await deleteMyAccount(g?.id ?? null, uid!);
                  await s.refresh();
                  router.replace('/');
                } catch (e) {
                  say('danger', errorMessage(e), 'error');
                }
                setBusy(null);
              }}
            />
            <Button variant="text" label="취소" onPress={() => setConfirm(null)} />
          </>
        ) : (
          <Button variant="text" label="회원 탈퇴" onPress={() => setConfirm('delete')} />
        )}
      </Section>
      <View style={{ height: space(10) }} />
    </Screen>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', paddingTop: space(2) },
  title: { ...type.rankName, fontSize: 56, lineHeight: 60, color: color.black, paddingBottom: space(3) },
  section: { gap: space(3), paddingTop: space(6), borderBottomWidth: line.row, borderBottomColor: color.black, paddingBottom: space(6) },
  warn: { color: color.textRed },
});
