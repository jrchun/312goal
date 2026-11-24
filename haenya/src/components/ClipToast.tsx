import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { checkDate } from '../lib/dates';
import type { MyTab } from '../lib/tabData';
import { color, font, layout, space, type } from '../theme';

const KEY = 'haenya:clip-toast';
const SHOW_MS = 8000;

/**
 * 홈 아래쪽 알림 "내 영상 나왔다." — 형광펜 분홍("나" 표시 색) + 검정 테두리(사용자 확정 2026-11-24). 하루 한 번, 올해 사진이 1장 이상일 때만. 누르면 /clip.
 * 이 기능을 모르는 사람이 많을 테니 들어올 때 알려 준다 (사용자 요청 2026-11-24).
 */
export function ClipToast({ data }: { data: MyTab | undefined | null }) {
  const [show, setShow] = useState(false);
  const year = String(data?.stats?.season_year ?? checkDate().slice(0, 4));
  const count = data?.photos.filter((p) => p.check_date.startsWith(year)).length ?? 0;

  useEffect(() => {
    if (Platform.OS !== 'web' || !count) return;
    const today = checkDate();
    try {
      if (localStorage.getItem(KEY) === today) return;
      localStorage.setItem(KEY, today);
    } catch {
      // 저장소를 못 쓰는 브라우저: 그냥 보여준다
    }
    setShow(true);
    const t = setTimeout(() => setShow(false), SHOW_MS);
    return () => clearTimeout(t);
  }, [count > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.toast}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="내 영상 보기"
          style={styles.body}
          onPress={() => {
            setShow(false);
            router.push('/clip');
          }}
        >
          <Text style={styles.title}>내 영상 나왔다. →</Text>
          <Text style={[type.caption, { color: color.black }]}>올해 인증샷 {count}장을 한 번에. 눌러서 보기.</Text>
          <Text style={[type.caption, { color: color.black }]}>다시 보려면 마이 → 내 영상 보기.</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="알림 닫기" hitSlop={8} onPress={() => setShow(false)} style={styles.x}>
          <Text style={[type.sentence, { color: color.black }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: space(3), alignItems: 'center', paddingHorizontal: layout.gutter },
  toast: { width: '100%', maxWidth: layout.maxWidth - layout.gutter * 2, flexDirection: 'row', alignItems: 'center', backgroundColor: color.highlight, borderWidth: 2, borderColor: color.black },
  body: { flex: 1, paddingVertical: space(3), paddingLeft: space(4), gap: 2 },
  title: { ...font.display, fontSize: 21, lineHeight: 26, color: color.black },
  x: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
});
