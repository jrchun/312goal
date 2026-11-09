import { router } from 'expo-router';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space, type } from '../theme';
import { Button } from './Button';
import { Label } from './Form';
import { Rule } from './Rule';
import { Screen } from './Screen';

/** 약관·방침처럼 글이 긴 화면: 큰 제목 + 6px 선 + 섹션(라벨 + 문장) */
export function Doc({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>
      <Rule />
      <Text style={[type.caption, styles.updated]}>{updated}</Text>
      <View style={styles.body}>{children}</View>
      <View style={styles.actions}>
        <Button variant="secondary" label="돌아가기" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    </Screen>
  );
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Label>{label}</Label>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 56, lineHeight: 60, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  updated: { paddingTop: space(3) },
  body: { gap: space(6), paddingTop: space(6) },
  section: { gap: space(2) },
  text: { ...type.sentence, fontSize: 14, lineHeight: 21, color: color.black },
  actions: { paddingVertical: space(8) },
});
