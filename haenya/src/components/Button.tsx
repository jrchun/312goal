import { Pressable, StyleSheet, Text } from 'react-native';
import { color, layout, space, type } from '../theme';

type Variant = 'primary' | 'secondary' | 'poke';

/**
 * primary: 검정 블록 + 크림 글자. 화면당 1개.
 * secondary: 검정 테두리.
 * poke: 빨강 블록 + 검정 글자. 무소식 친구 옆에만.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  arrow = variant !== 'poke',
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  arrow?: boolean;
}) {
  const v = variants[variant];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.base, v.box]}>
      <Text style={[type.button, { color: v.text }]}>{label}</Text>
      {arrow && <Text style={[type.button, { color: v.text }]}>→</Text>}
    </Pressable>
  );
}

const variants = {
  primary: { box: { backgroundColor: color.black }, text: color.cream },
  secondary: { box: { borderWidth: 2, borderColor: color.black }, text: color.black },
  poke: { box: { backgroundColor: color.red, alignSelf: 'flex-start' as const }, text: color.black },
};

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouch + space(2),
    paddingHorizontal: space(5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(4),
  },
});
