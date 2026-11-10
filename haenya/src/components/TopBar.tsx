import { StyleSheet, Text, View } from 'react-native';
import { color, space, type } from '../theme';

/** 화면 공통 상단 한 줄: 왼쪽 그룹명, 오른쪽 주차 */
export function TopBar({ left, right }: { left: string; right?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[type.caption, styles.text]}>{left}</Text>
      {right ? <Text style={[type.caption, styles.text]}>{right}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space(4), paddingBottom: space(2) },
  text: { color: color.black },
});
