import { useSyncExternalStore } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { kakaoPendingStore } from '../lib/kakao';
import { color, font, layout, line, space } from '../theme';
import { Button } from './Button';

/**
 * 카톡 보낼 카드가 준비되면 뜨는 창 (사파리 등 카톡 밖 브라우저에서만).
 * "카톡으로 보내기"를 누르는 순간 카톡 앱이 바로 열린다 — 자세한 이유는 src/lib/kakao.web.ts.
 * 앱 맨 바깥(_layout)에 하나만 둔다.
 */
export function KakaoSendSheet() {
  const p = useSyncExternalStore(kakaoPendingStore.subscribe, kakaoPendingStore.get, kakaoPendingStore.get);
  return (
    <Modal visible={!!p} transparent animationType="fade" onRequestClose={() => p?.cancel()}>
      <Pressable style={styles.backdrop} onPress={() => p?.cancel()}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>카드 준비됐다.</Text>
          <View style={styles.rule} />
          {p ? <Image source={{ uri: p.preview }} style={styles.img} resizeMode="contain" /> : null}
          <Button label="카톡으로 보내기" onPress={() => p?.send()} />
          <Button variant="text" label="취소" onPress={() => p?.cancel()} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: layout.maxWidth, backgroundColor: color.cream, padding: space(5), gap: space(3) },
  title: { ...font.display, fontSize: 40, lineHeight: 44, color: color.black },
  rule: { height: line.section, backgroundColor: color.black },
  img: { width: '100%', height: 220, alignSelf: 'center' },
});
