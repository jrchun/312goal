import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { where } from '../lib/env';
import { color, layout, line, space, type } from '../theme';

const KEY = 'haenya.installHint.dismissed';

/** 홈 화면 앱으로 열지 않았으면 true (휴대폰 브라우저에서 열었을 때) */
export function useCanInstall(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const w = where();
    setOk(w !== 'standalone' && w !== 'desktop');
  }, []);
  return ok;
}

/**
 * 홈에 보이는 한 줄 안내: "홈 화면에 넣으면 바로 열린다 →"
 * ✕ 누르면 이 브라우저에서는 다시 안 보인다(브라우저 저장소, 못 쓰면 그냥 매번 보임).
 */
export function InstallHint() {
  const can = useCanInstall();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === '1');
    } catch {
      setHidden(false);
    }
  }, []);

  if (!can || hidden) return null;
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="link" style={styles.main} onPress={() => router.push('/onboarding?step=install' as never)}>
        <Text style={[type.sentence, styles.text]}>홈 화면에 넣으면 바로 열린다 →</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="안내 닫기"
        style={styles.close}
        onPress={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, '1');
          } catch {
            /* 저장 못 하면 이번만 숨김 */
          }
        }}
      >
        <Text style={[type.sentence, styles.text]}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: line.row, borderColor: color.black, minHeight: layout.minTouch },
  main: { flex: 1, paddingHorizontal: space(3), paddingVertical: space(2) },
  close: { width: layout.minTouch, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderLeftWidth: line.row, borderLeftColor: color.black },
  text: { color: color.black },
});
