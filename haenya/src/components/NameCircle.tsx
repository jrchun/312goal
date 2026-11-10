import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, layout, space, type } from '../theme';

/**
 * 이름 동그라미 (되찾기용 멤버 아이콘). 가이드의 "모서리 0" 원칙에서 사용자가 정한 예외(원형).
 * 안: 이름(성 빼고), 아래: 성+이름. 카카오 계정은 테두리만.
 */
export function NameCircle({
  name, caption, kakao, size = 84, onPress, selected,
}: {
  name: string;
  caption?: string;
  kakao?: boolean;
  size?: number;
  onPress?: () => void;
  selected?: boolean;
}) {
  const fs = Math.round(size * (name.length >= 3 ? 0.26 : 0.32));
  const body = (
    <View style={styles.item}>
      <View
        style={[
          { width: size, height: size, borderRadius: size / 2 },
          styles.circle,
          kakao ? styles.kakao : styles.filled,
          selected && styles.selected,
        ]}
      >
        <Text numberOfLines={1} style={{ ...font.display, fontSize: fs, color: kakao ? color.black : color.cream }}>
          {name}
        </Text>
      </View>
      {caption ? <Text style={[type.caption, styles.caption]} numberOfLines={1}>{caption}</Text> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={caption ?? name} onPress={onPress} style={styles.touch}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: { minWidth: layout.minTouch, minHeight: layout.minTouch },
  item: { alignItems: 'center', gap: space(2) },
  circle: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filled: { backgroundColor: color.black },
  kakao: { borderWidth: 2, borderColor: color.black, backgroundColor: color.cream },
  selected: { backgroundColor: color.red },
  caption: { color: color.black },
});
