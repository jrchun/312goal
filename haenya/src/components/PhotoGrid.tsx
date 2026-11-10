import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LazyImage } from './LazyImage';
import { color, font, space } from '../theme';

export type GridItem = { id: string; url?: string; thumb?: string; label?: string; isMe?: boolean; unverified?: boolean };

/** 정사각 사진 격자. 이름표는 왼쪽 아래 검정 스티커(나는 빨강), 날짜 미확인은 오른쪽 위 작은 표시 */
export function PhotoGrid({ items, cols, onPress }: { items: GridItem[]; cols: number; onPress?: (id: string) => void }) {
  const gap = 4;
  return (
    <View style={[styles.wrap, { gap }]}>
      {items.map((it) => (
        <Pressable
          key={it.id}
          onPress={() => onPress?.(it.id)}
          style={{ overflow: 'hidden', width: `${(100 - ((cols - 1) * gap * 100) / 350) / cols}%`, aspectRatio: 1, backgroundColor: color.gray }}
        >
          <LazyImage key={it.thumb ?? it.url} src={it.thumb} fallback={it.url} />
          {it.label ? (
            <View style={[styles.tag, { backgroundColor: it.isMe ? color.red : color.black }]}>
              <Text style={[styles.tagText, { color: it.isMe ? color.black : color.cream }]} numberOfLines={1}>{it.label}</Text>
            </View>
          ) : null}
          {it.unverified ? (
            <View style={styles.unverified}><Text style={styles.unverifiedText}>날짜?</Text></View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { position: 'absolute', left: space(1), bottom: space(1), paddingHorizontal: space(1) + 2, paddingVertical: 1, maxWidth: '90%' },
  tagText: { ...font.bodyBold, fontSize: 11 },
  unverified: { position: 'absolute', right: space(1), top: space(1), backgroundColor: color.cream, paddingHorizontal: 4 },
  unverifiedText: { ...font.bodyBold, fontSize: 10, color: color.textRed },
});
