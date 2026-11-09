import { StyleSheet, View } from 'react-native';
import type { RestoreCandidate } from '../lib/types';
import { space } from '../theme';
import { NameCircle } from './NameCircle';

/** 그룹 멤버 동그라미 격자 (한 줄에 3개) */
export function MemberCircles({ members, onPick, size = 84 }: { members: RestoreCandidate[]; onPick: (m: RestoreCandidate) => void; size?: number }) {
  return (
    <View style={styles.grid}>
      {members.map((m) => (
        <View key={m.user_id} style={styles.cell}>
          <NameCircle
            name={m.given_name ?? m.display_name}
            caption={m.can_pin ? m.display_name : `${m.display_name} · 카카오`}
            kakao={!m.can_pin}
            size={size}
            onPress={() => onPick(m)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space(5) },
  cell: { width: '33.33%', alignItems: 'center' },
});
