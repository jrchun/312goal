import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * 지금 보이는 화면이면 true.
 * 스택 아래에 깔린(안 보이는) 화면이 로그인 상태 변화에 반응해 혼자 다른 곳으로 보내는 것을 막을 때 쓴다.
 * (예: 첫 화면 → 시작하기에서 가입하는 순간, 아래 깔린 첫 화면이 /login 으로 보내 버리던 문제)
 */
export function useScreenFocused(): boolean {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}
