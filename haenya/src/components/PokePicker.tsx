import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BoardRow } from '../lib/types';
import { color, font, layout, line, space, type } from '../theme';
import { Button } from './Button';

/**
 * 누구 찌를까? — 오늘 아직 인증 안 한 멤버 중에서 직접 고른다 (사용자 결정 2026-11-10: 무소식 기준 대신 직접 선택).
 * 같은 사람은 하루 1번(DB send_nudge). 이미 찌른 사람은 "찔렀다"로 막힌다.
 */
export function PokePicker({
  visible, members, poked, onPoke, onClose,
}: {
  visible: boolean;
  members: BoardRow[];
  poked: Record<string, boolean>;
  onPoke: (r: BoardRow) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>누구 찌를까?</Text>
          <View style={styles.rule} />
          <Text style={[type.caption, styles.caption]}>오늘 아직 안 한 사람. 한 사람에게 하루 한 번.</Text>
          <ScrollView style={styles.list}>
            {members.map((r) => (
              <View key={r.user_id} style={styles.row}>
                <View style={styles.left}>
                  <Text style={{ ...font.display, fontSize: 26, color: color.black }}>{r.nickname}</Text>
                  <Text style={type.caption}>
                    이번 주 {r.week_count}/{r.weekly_goal}
                    {r.days_silent >= 2 ? ` · ${r.days_silent}일째 무소식` : ''}
                  </Text>
                </View>
                <Button variant="poke" label={poked[r.user_id] ? '찔렀다' : '찌르기'} disabled={poked[r.user_id]} onPress={() => onPoke(r)} />
              </View>
            ))}
          </ScrollView>
          <Button variant="secondary" label="닫기" arrow={false} onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: layout.maxWidth, backgroundColor: color.cream, padding: space(5), gap: space(3), maxHeight: '80%' },
  title: { ...font.display, fontSize: 40, lineHeight: 44, color: color.black },
  rule: { height: line.section, backgroundColor: color.black },
  caption: { color: color.bodyGray },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(3),
    minHeight: layout.minTouch + space(4), borderTopWidth: line.row, borderTopColor: color.black,
  },
  left: { gap: 2, flexShrink: 1 },
});
