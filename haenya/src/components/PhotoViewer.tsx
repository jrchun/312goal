import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { REACTIONS } from '../lib/photos';
import type { ReactionKey } from '../lib/types';
import { color, font, layout, space, type } from '../theme';
import { Button } from './Button';
import { Notice } from './Form';

export type ViewerPhoto = {
  id: string;
  url?: string;
  title: string; // "민지 · 11월 9일"
  unverified?: boolean;
  counts: Partial<Record<ReactionKey, number>>;
  mine: Partial<Record<ReactionKey, boolean>>;
  canDelete?: boolean;
};

/** 사진 크게 보기 + 이모지 반응 4종(누르면 켜고 끔) + 내 사진이면 지우기 */
export function PhotoViewer({
  photo, onClose, onReact, onDelete,
}: {
  photo: ViewerPhoto | null;
  onClose: () => void;
  onReact?: (key: ReactionKey) => void;
  onDelete?: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => {
    setConfirm(false);
    setError('');
    onClose();
  };
  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        {photo ? (
          <View style={styles.box}>
            <View style={styles.head}>
              <Text style={[type.sentence, { color: color.cream, flexShrink: 1 }]} numberOfLines={1}>{photo.title}</Text>
              {photo.unverified ? <Text style={styles.unverified}>날짜 미확인</Text> : null}
            </View>
            <View style={styles.imgBox}>
              {photo.url ? <Image source={{ uri: photo.url }} style={styles.img} resizeMode="contain" /> : null}
            </View>
            <View style={styles.reactions}>
              {REACTIONS.map((r) => {
                const on = !!photo.mine[r.key];
                return (
                  <Pressable
                    key={r.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => onReact?.(r.key)}
                    style={[styles.reaction, on && styles.reactionOn]}
                  >
                    <Text style={styles.emoji}>{r.label}</Text>
                    <Text style={[styles.count, { color: on ? color.black : color.cream }]}>{photo.counts[r.key] ?? 0}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Notice tone="error">{error}</Notice>
            {photo.canDelete && onDelete ? (
              confirm ? (
                <Button
                  variant="poke"
                  label="정말 지운다"
                  busy={busy}
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await onDelete();
                      setConfirm(false);
                    } catch {
                      setError('안 지워졌다. 다시 해봐.');
                    }
                    setBusy(false);
                  }}
                />
              ) : (
                <Button variant="text" label="이 인증 지우기" onPress={() => setConfirm(true)} />
              )
            ) : null}
            <Button variant="secondary" label="닫기" arrow={false} onPress={close} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: color.black, alignItems: 'center', justifyContent: 'center', padding: space(5) },
  box: { width: '100%', maxWidth: layout.maxWidth, gap: space(3) },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(2) },
  unverified: { ...font.bodyBold, fontSize: 12, color: color.black, backgroundColor: color.cream, paddingHorizontal: space(2) },
  imgBox: { width: '100%', aspectRatio: 3 / 4, backgroundColor: color.black },
  img: { width: '100%', height: '100%' },
  reactions: { flexDirection: 'row', gap: space(2) },
  reaction: {
    flex: 1, minHeight: layout.minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(1),
    borderWidth: 2, borderColor: color.cream,
  },
  reactionOn: { backgroundColor: color.cream },
  emoji: { fontSize: 20 },
  count: { ...font.display, fontSize: 18 },
});
