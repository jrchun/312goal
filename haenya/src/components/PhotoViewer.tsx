import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, font, layout, space, type } from '../theme';

export type ViewerPhoto = {
  id: string;
  url?: string;
  title: string; // "민지 · 11월 9일"
  unverified?: boolean;
  canDelete?: boolean;
};

/**
 * 사진 크게 보기 — 화면 전체(검정 바탕)에 사진만. 왼쪽 위 이름·날짜, 오른쪽 위 작은 ✕.
 * 내 사진이면 아래 작은 글자로 "이 인증 지우기"(두 번 눌러야 지움).
 * (이모지 반응은 사용자 결정 2026-11-11로 화면에서 뺐다. DB reactions 표는 남아 있음)
 */
export function PhotoViewer({
  photo, onClose, onDelete,
}: {
  photo: ViewerPhoto | null;
  onClose: () => void;
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
    <Modal visible={!!photo} animationType="fade" onRequestClose={close}>
      <View style={styles.root}>
        {photo?.url ? <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : null}
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <View style={styles.top}>
            <View style={styles.titleBox}>
              <Text style={[type.caption, styles.light]} numberOfLines={1}>{photo?.title}</Text>
              {photo?.unverified ? <Text style={[type.caption, styles.light]}>날짜 미확인</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={close} style={styles.close} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          {photo?.canDelete && onDelete ? (
            <View style={styles.bottom}>
              {error ? <Text style={[type.caption, { color: color.highlight }]}>{error}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={async () => {
                  if (!confirm) return setConfirm(true);
                  setBusy(true);
                  try {
                    await onDelete();
                    setConfirm(false);
                  } catch {
                    setError('안 지워졌다. 다시 해봐.');
                  }
                  setBusy(false);
                }}
                style={styles.deleteTouch}
              >
                <Text style={[type.caption, styles.light, styles.underline]}>
                  {busy ? '지우는 중.' : confirm ? '한 번 더 누르면 지운다' : '이 인증 지우기'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.black },
  overlay: { flex: 1, justifyContent: 'space-between', width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: space(4), paddingTop: space(2) },
  titleBox: { flexShrink: 1, gap: 2, paddingTop: space(3) },
  light: { color: color.cream },
  close: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  closeText: { ...font.bodyBold, fontSize: 20, color: color.cream },
  bottom: { alignItems: 'center', gap: space(1), paddingBottom: space(4) },
  deleteTouch: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space(4) },
  underline: { textDecorationLine: 'underline' },
});
