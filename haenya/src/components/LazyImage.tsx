import { useState } from 'react';
import { Image, StyleSheet } from 'react-native';

/** 격자용 사진 (앱). 작은 사진이 없거나 깨지면 큰 사진으로. 웹은 LazyImage.web.tsx */
export function LazyImage({ src, fallback }: { src?: string; fallback?: string }) {
  const [broken, setBroken] = useState(false);
  const url = !broken && src ? src : fallback;
  if (!url) return null;
  return <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBroken(true)} />;
}
