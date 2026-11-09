import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { color, font, layout, line, space, type } from '../theme';

/** 섹션 라벨: Gothic A1 800 · 12px · 자간 2px */
export function Label({ children }: { children: ReactNode }) {
  return <Text style={[type.label, { color: color.black }]}>{children}</Text>;
}

/** 글자 입력: 상자 대신 아래 검정 선 */
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.block}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={color.gray}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

/** 숫자 고르기: − 큰 숫자 + */
export function Stepper({
  label, value, onChange, min, max, step = 1, unit,
}: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View style={styles.block}>
      <Label>{label}</Label>
      <View style={styles.stepRow}>
        <StepButton label="−" onPress={() => onChange(clamp(value - step))} disabled={value <= min} />
        <Text style={styles.stepValue}>
          {value}
          {unit ? <Text style={styles.stepUnit}>{unit}</Text> : null}
        </Text>
        <StepButton label="+" onPress={() => onChange(clamp(value + step))} disabled={value >= max} />
      </View>
    </View>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.stepBtn, disabled && { borderColor: color.gray }]}
    >
      <Text style={[styles.stepBtnText, disabled && { color: color.gray }]}>{label}</Text>
    </Pressable>
  );
}

/** 체크 줄: 네모 체크 + 문장 + (선택) 오른쪽 링크 */
export function Check({
  checked, onToggle, children, right,
}: { checked: boolean; onToggle: () => void; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.checkRow}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={onToggle}
        style={styles.checkTouch}
      >
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked ? <Text style={styles.tick}>✓</Text> : null}
        </View>
        <Text style={[type.sentence, { color: color.black, flexShrink: 1 }]}>{children}</Text>
      </Pressable>
      {right}
    </View>
  );
}

/** 결과·오류 한 줄. tone=error 는 작은 빨간 글자(#C4250F) */
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  if (!children) return null;
  return (
    <Text style={[type.sentence, { color: tone === 'error' ? color.textRed : color.black }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  block: { gap: space(2) },
  input: {
    fontFamily: font.bodyBold,
    fontSize: 22,
    color: color.black,
    paddingVertical: space(2),
    borderBottomWidth: line.row,
    borderBottomColor: color.black,
    outlineStyle: 'none',
  } as object,
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: layout.minTouch + space(2),
    height: layout.minTouch + space(2),
    borderWidth: 2,
    borderColor: color.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontFamily: font.display, fontSize: 28, color: color.black },
  stepValue: { fontFamily: font.display, fontSize: 64, lineHeight: 70, color: color.black },
  stepUnit: { fontFamily: font.display, fontSize: 28, color: color.gray },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space(3), minHeight: layout.minTouch },
  checkTouch: { flexDirection: 'row', alignItems: 'center', gap: space(3), flex: 1, minHeight: layout.minTouch },
  box: { width: 24, height: 24, borderWidth: 2, borderColor: color.black, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.black },
  tick: { color: color.cream, fontFamily: font.bodyBold, fontSize: 15, lineHeight: 18 },
});
