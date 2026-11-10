import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KakaoSendSheet } from '../components/KakaoSendSheet';
import { useAppFonts } from '../lib/fonts';
import { SessionProvider } from '../lib/session';
import { color } from '../theme';

export default function RootLayout() {
  const loaded = useAppFonts(); // 웹은 바로 true (Google Fonts), 앱은 폰트 파일을 다 읽을 때까지 기다림
  if (!loaded) return null;

  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.cream } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
      </Stack>
      <KakaoSendSheet />
    </SessionProvider>
  );
}
