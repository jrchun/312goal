import { StyleSheet, Text, View } from 'react-native';
import { color, font, layout, line, space, type } from '../theme';
import { Button } from './Button';

/** 무소식으로 보는 기준 (일) */
export const SILENT_DAYS = 3;

/**
 * 순위 행 3가지 상태 (가이드라인 05)
 *  기본 / 나 — 형광펜 밑줄 / 무소식 3일 이상 — 회색 취소선 + "N일째 무소식" + 찌르기
 */
export function RankRow({
  name, value, isMe, daysSilent, onPoke, poked, compact, rank, sub,
}: {
  name: string;
  value: string;
  /** 순위 번호 (그룹 화면). 1등은 빨강 */
  rank?: number;
  /** 오른쪽 작은 글씨 (예: "7 / 150") */
  sub?: string;
  isMe?: boolean;
  daysSilent?: number;
  onPoke?: () => void;
  poked?: boolean;
  compact?: boolean;
}) {
  const silent = !isMe && (daysSilent ?? 0) >= SILENT_DAYS;
  const size = compact ? 24 : type.rankName.fontSize;
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {isMe ? <View style={styles.highlight} /> : null}
      <View style={styles.left}>
        {rank !== undefined ? (
          <Text numberOfLines={1} style={{ ...font.display, fontSize: 22, width: 34, color: rank === 1 ? color.red : color.black }}>{rank}</Text>
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            { ...font.display, fontSize: size, lineHeight: size * 1.2, color: silent ? color.gray : color.black },
            silent && styles.strike,
          ]}
        >
          {name}
        </Text>
        {silent ? <Text style={styles.silent}>{daysSilent}일째 무소식</Text> : null}
      </View>
      {silent && onPoke ? (
        <Button variant="poke" label={poked ? '찔렀다' : '찌르기'} onPress={onPoke} disabled={poked} />
      ) : (
        <View style={styles.right}>
          <Text style={{ ...font.display, fontSize: compact ? size : 22, lineHeight: size * 1.2, color: color.black }}>{value}</Text>
          {sub ? <Text style={[type.caption, styles.sub]}>{sub}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(3),
    minHeight: 52,
    borderTopWidth: line.row,
    borderTopColor: color.black,
    paddingVertical: space(1),
  },
  rowCompact: { minHeight: 36, paddingVertical: 0 },
  // 형광펜: 글자 아래쪽 절반에 깔리는 띠
  highlight: { position: 'absolute', left: 0, right: 0, bottom: space(1), height: 12, backgroundColor: color.highlight },
  left: { flexDirection: 'row', alignItems: 'center', gap: space(2), flexShrink: 1 },
  strike: { textDecorationLine: 'line-through', textDecorationColor: color.red },
  silent: { ...font.bodyBold, fontSize: 12, color: color.textRed },
  right: { flexDirection: 'row', alignItems: 'baseline', gap: space(3) },
  sub: { minWidth: 56, textAlign: 'right' },
});
