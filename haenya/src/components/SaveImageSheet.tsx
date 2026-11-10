import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { color, space, type } from '../theme';
import { Button } from './Button';

/** 공유 시트를 못 쓰는 브라우저(카톡 인앱 등)에서: 카드 이미지를 크게 띄우고 길게 눌러 저장하게 안내 */
export function SaveImageSheet({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          {uri ? <Image source={{ uri }} style={styles.img} resizeMode="contain" /> : null}
          <Text style={[type.sentence, styles.text]}>이미지를 길게 눌러서 사진에 저장해.{'\n'}그다음 인스타 스토리에 올리면 된다.</Text>
          <Button variant="secondary" label="닫기" arrow={false} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: color.black, alignItems: 'center', justifyContent: 'center', padding: space(5) },
  box: { width: '100%', maxWidth: 390, gap: space(4), backgroundColor: color.cream, padding: space(5) },
  img: { width: '100%', aspectRatio: 9 / 16, maxHeight: 520 },
  text: { color: color.black },
});
