import { BlackHanSans_400Regular } from '@expo-google-fonts/black-han-sans';
import { GothicA1_400Regular, GothicA1_600SemiBold, GothicA1_800ExtraBold } from '@expo-google-fonts/gothic-a1';
import { useFonts } from 'expo-font';

/** 앱: 폰트 파일을 불러온다. 다 불러오면 true */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    BlackHanSans_400Regular,
    GothicA1_400Regular,
    GothicA1_600SemiBold,
    GothicA1_800ExtraBold,
  });
  return loaded;
}
