import { View } from 'react-native';
import { color, line } from '../theme';

/** 검정 구분선. section(6px)은 머리와 몸, row(1.5px)는 순위 행 */
export function Rule({ weight = 'section' }: { weight?: keyof typeof line }) {
  return <View style={{ height: line[weight], backgroundColor: color.black }} />;
}
