import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { color, layout, space, type } from '../theme';

type Variant = 'primary' | 'secondary' | 'poke' | 'text';

/**
 * primary: 검정 블록 + 크림 글자. 화면당 1개.
 * secondary: 검정 테두리.
 * poke: 빨강 블록 + 검정 글자. 무소식 친구 옆에만.
 * text: 밑줄 글자 링크 ("나중에, 홈으로" 같은 작은 선택지)
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  arrow = variant === 'primary' || variant === 'secondary',
  disabled,
  busy,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  arrow?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  if (variant === 'text') {
    return (
      <Pressable accessibilityRole="link" onPress={onPress} disabled={disabled} style={styles.textBtn}>
        <Text style={[type.caption, styles.textLabel]}>{label}</Text>
      </Pressable>
    );
  }
  const v = variants[variant];
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={onPress}
      disabled={off}
      style={[styles.base, v.box, disabled && styles.disabled]}
    >
      <Text style={[type.button, { color: v.text }]}>{label}</Text>
      {busy ? <ActivityIndicator color={v.text} /> : arrow ? <Text style={[type.button, { color: v.text }]}>→</Text> : null}
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
  disabled: { opacity: 0.35 },
  textBtn: { minHeight: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  textLabel: { color: color.black, textDecorationLine: 'underline' },
});
