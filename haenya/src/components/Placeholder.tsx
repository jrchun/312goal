import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, space, type } from '../theme';
import { Rule } from './Rule';
import { Screen } from './Screen';

/** STAGE 1 임시 화면: 큰 제목 + 6px 선 + 한 문장. 각 STAGE에서 실제 화면으로 교체한다. */
export function Placeholder({ title, sentence, children }: { title: string; sentence: string; children?: ReactNode }) {
  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>{sentence}</Text>
      <View style={styles.actions}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 56, lineHeight: 60, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(4) },
  actions: { marginTop: 'auto', gap: space(3), paddingVertical: space(6) },
});
