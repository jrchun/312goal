import { BlackHanSans_400Regular } from '@expo-google-fonts/black-han-sans';
import { GothicA1_400Regular, GothicA1_600SemiBold, GothicA1_800ExtraBold } from '@expo-google-fonts/gothic-a1';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SessionProvider } from '../lib/session';
import { color } from '../theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    BlackHanSans_400Regular,
    GothicA1_400Regular,
    GothicA1_600SemiBold,
    GothicA1_800ExtraBold,
  });

  // 웹은 정적 HTML이 바로 보이도록 폰트를 기다리지 않는다 (카톡 인앱 첫 화면 2초 목표).
  if (!loaded && Platform.OS !== 'web') return null;

  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.cream } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
      </Stack>
    </SessionProvider>
  );
}
