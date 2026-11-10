/**
 * 화면 데이터 임시 저장(메모리). 탭을 다시 열면 저장된 걸 바로 보여주고, 뒤에서 새로 받아 바꾼다.
 * 키에 그룹 id를 넣어 쓴다. 로그아웃·탈퇴하면 clearCache()로 비운다.
 */
import { useSyncExternalStore } from 'react';

const store = new Map<string, unknown>();
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<unknown>>();
const emit = () => listeners.forEach((l) => l());

export function getCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function setCache<T>(key: string, value: T) {
  store.set(key, value);
  emit();
}

export function clearCache() {
  store.clear();
  inflight.clear();
  emit();
}

/** 같은 키를 동시에 여러 번 받지 않게 묶어서 받고 저장한다 */
export function fetchInto<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const p = fn()
    .then((v) => {
      setCache(key, v);
      return v;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** 저장된 값을 읽는 훅 (값이 바뀌면 다시 그림) */
export function useCache<T>(key: string | null): T | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (key ? (store.get(key) as T | undefined) : undefined),
    () => undefined,
  );
}
