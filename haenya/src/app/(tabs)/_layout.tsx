import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import { nextRoute, profileComplete, useSession } from '../../lib/session';
import { color, font, line } from '../../theme';

/**
 * 하단 메뉴: 홈 · 그룹 · 마이. 아이콘 없이 글자만. 로그인·그룹이 없으면 들어올 수 없다.
 * 색은 휴대폰의 밝게/어둡게 설정을 따른다 (사용자 요청 2026-11-10: 아래 주소창·시스템 바와 어울리게)
 *  밝게: 크림 바 + 위 검정 선, 지금 탭은 검정 블록  /  어둡게: 검정 바 + 크림 글자
 * 웹은 메뉴 아래 빈 띠(사파리 주소창 뒤)도 같은 색으로 칠해 바가 화면 끝까지 이어져 보이게 한다.
 */
export default function TabsLayout() {
  const s = useSession();
  const dark = useColorScheme() === 'dark';
  const barColor = dark ? color.black : color.cream;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const el = document.documentElement;
    el.style.backgroundColor = barColor;
    document.body.style.backgroundColor = barColor;
    return () => {
      el.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, [barColor]);

  if (s.loading) return <View style={{ flex: 1, backgroundColor: color.cream }} />;
  if (!s.loading && (!s.session || !profileComplete(s) || !s.membership)) {
    return <Redirect href={nextRoute(s) as never} />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarIconStyle: { display: 'none' },
        tabBarStyle: {
          backgroundColor: barColor,
          borderTopWidth: dark ? 0 : line.row,
          borderTopColor: color.black,
          elevation: 0,
          shadowOpacity: 0,
        },
        // 밝게일 때 지금 탭은 검정 블록 + 크림 글자 (회색 글자와 확실히 구분)
        tabBarActiveBackgroundColor: dark ? undefined : color.black,
        tabBarActiveTintColor: color.cream,
        tabBarInactiveTintColor: dark ? color.gray : color.bodyGray,
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
