import { Tabs } from 'expo-router';
import { color, font } from '../../theme';

/** 하단 메뉴: 검정 바, 홈 · 그룹 · 마이. 아이콘 없이 글자만, 선택된 탭은 밑줄 대신 크림 글자. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarIconStyle: { display: 'none' },
        tabBarStyle: { backgroundColor: color.black, borderTopWidth: 0, elevation: 0, shadowOpacity: 0 },
        tabBarActiveTintColor: color.cream,
        tabBarInactiveTintColor: color.gray,
        tabBarLabelStyle: { fontFamily: font.bodyBold, fontSize: 13 },
        tabBarLabelPosition: 'beside-icon',
      }}
    >
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="group" options={{ title: '그룹' }} />
      <Tabs.Screen name="my" options={{ title: '마이' }} />
    </Tabs>
  );
}
