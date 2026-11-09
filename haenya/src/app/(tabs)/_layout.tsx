import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';
import { nextRoute, profileComplete, useSession } from '../../lib/session';
import { color, font } from '../../theme';

/** 하단 메뉴: 검정 바, 홈 · 그룹 · 마이. 아이콘 없이 글자만. 로그인·그룹이 없으면 들어올 수 없다. */
export default function TabsLayout() {
  const s = useSession();
  if (s.loading) return <View style={{ flex: 1, backgroundColor: color.cream }} />;
  if (!s.loading && (!s.session || !profileComplete(s) || !s.membership)) {
    return <Redirect href={nextRoute(s) as never} />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarIconStyle: { display: 'none' },
        tabBarStyle: { backgroundColor: color.black, borderTopWidth: 0, elevation: 0, shadowOpacity: 0 },
        tabBarActiveTintColor: color.cream,
        tabBarInactiveTintColor: color.gray,
        tabBarLabelStyle: { ...font.bodyBold, fontSize: 13 },
        tabBarLabelPosition: 'beside-icon',
      }}
    >
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="group" options={{ title: '그룹' }} />
      <Tabs.Screen name="my" options={{ title: '마이' }} />
    </Tabs>
  );
}
