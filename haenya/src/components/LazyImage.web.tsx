import { useState } from 'react';

/**
 * 격자용 사진 (웹): 화면에 가까워질 때만 내려받는다(loading="lazy").
 * 작은 사진(src)이 없거나 깨지면 큰 사진(fallback)으로 바꾼다. 사진이 수백 장이어도 탭이 느려지지 않게.
 */
export function LazyImage({ src, fallback }: { src?: string; fallback?: string }) {
  const [broken, setBroken] = useState(false);
  const url = !broken && src ? src : fallback;
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setBroken(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}
