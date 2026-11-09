import { Text, TextStyle } from 'react-native';
import { color, font } from '../theme';

/**
 * 워드마크 "했냐?" — 물음표까지가 로고. 최소 22px.
 * 자간은 글자 크기의 -4%. 빨강 바탕 위에서는 tone="black"을 쓴다.
 */
export function Wordmark({ size = 22, tone = 'red' }: { size?: number; tone?: 'red' | 'black' | 'cream' }) {
  const style: TextStyle = {
    ...font.display,
    fontSize: Math.max(22, size),
    lineHeight: Math.max(22, size) * 0.95,
    letterSpacing: -0.04 * Math.max(22, size),
    color: color[tone],
  };
  return <Text style={style}>했냐?</Text>;
}
