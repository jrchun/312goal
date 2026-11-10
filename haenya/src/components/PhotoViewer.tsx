import { useEffect, useRef, useState } from 'react';
import {
  Image, Modal, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text,
  useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LazyImage } from './LazyImage';
import { color, font, layout, space, type } from '../theme';

export type ViewerPhoto = {
  id: string;
  url?: string;
  /** 아래 작은 줄용 작은 사진 (없으면 url) */
  thumb?: string;
  title: string; // 위 가운데 굵게: "민지" 또는 "11월 9일"
  subtitle?: string; // 그 아래 작게: "11월 9일 · 날짜 미확인"
  canDelete?: boolean;
};

const THUMB_W = 36;
const THUMB_H = 48;
const THUMB_GAP = 2;
/** 지금 사진 앞뒤 몇 장까지 실제 이미지를 그릴지 (나머지는 빈 칸 — 많아도 가볍게) */
const NEAR = 2;

/**
 * 사진 크게 보기 (사진 앨범처럼, 사용자 요청 2026-11-11)
 *  위: 가운데 이름·날짜 작게, 오른쪽 작은 ✕
 *  가운데: 사진 전체(검정 바탕, 잘리지 않게). 좌우로 밀면 앞뒤 사진 — 브라우저 기본 "스크롤 딱 맞춤"이라 손가락 따라 부드럽다
 *  아래: 같은 목록의 다른 사진 작은 줄. 누르면 그 사진으로
 *  내 사진이면 줄 위에 작은 글자 "이 인증 지우기"(두 번 눌러야 지움)
 */
export function PhotoViewer({
  photos, startId, onClose, onDelete,
}: {
  photos: ViewerPhoto[];
  /** 처음 열 사진. null이면 닫힘 */
  startId: string | null;
  onClose: () => void;
  onDelete?: (photo: ViewerPhoto) => Promise<void>;
}) {
  const { width: w } = useWindowDimensions();
  const pager = useRef<ScrollViewInstance>(null);
  const strip = useRef<ScrollViewInstance>(null);
  const placed = useRef(false);
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const visible = startId != null && photos.length > 0;

  // 열 때: 누른 사진 위치로 (그리기 전에 정해서, 처음부터 그 자리에 뜨게)
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (startId !== openedFor) {
    setOpenedFor(startId);
    if (startId != null) setIndex(Math.max(0, photos.findIndex((p) => p.id === startId)));
    else placed.current = false;
  }
  const indexRef = useRef(index);
  indexRef.current = index;

  // 지운 뒤 등으로 목록이 줄면 범위 안으로
  useEffect(() => {
    if (startId == null) return;
    if (!photos.length) return onClose(); // 마지막 한 장까지 지웠으면 닫는다
    if (index > photos.length - 1) {
      const i = photos.length - 1;
      setIndex(i);
      pager.current?.scrollTo({ x: i * w, animated: false });
    }
  }, [photos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 지금 사진이 바뀌면: 지우기 확인 취소 + 아래 줄에서 지금 사진을 가운데로
  useEffect(() => {
    setConfirm(false);
    setError('');
    const x = layout.gutter + index * (THUMB_W + THUMB_GAP) - (Math.min(w, layout.maxWidth) - THUMB_W) / 2;
    strip.current?.scrollTo({ x: Math.max(0, x), animated: placed.current });
  }, [index, w]);

  // 창 크기가 바뀌면 (가로 돌림 등) 지금 사진 위치 다시 맞춤
  useEffect(() => {
    if (placed.current) pager.current?.scrollTo({ x: index * w, animated: false });
  }, [w]); // eslint-disable-line react-hooks/exhaustive-deps

  // 컴퓨터: 좌우 화살표·Esc
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const go = (i: number) => {
    if (i < 0 || i >= photos.length) return;
    pager.current?.scrollTo({ x: i * w, animated: true });
    setIndex(i);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!placed.current || !w) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / w);
    if (i >= 0 && i < photos.length && i !== index) setIndex(i);
  };

  const close = () => {
    setConfirm(false);
    setError('');
    onClose();
  };

  const photo = photos[Math.min(index, photos.length - 1)];

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <View style={styles.side} />
          <View style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={1}>{photo?.title}</Text>
            {photo?.subtitle ? <Text style={[type.caption, styles.light]} numberOfLines={1}>{photo.subtitle}</Text> : null}
          </View>
          <View style={[styles.side, styles.sideRight]}>
            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={close} style={styles.close} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onLayout={() => {
            if (placed.current) return;
            pager.current?.scrollTo({ x: indexRef.current * w, animated: false });
            placed.current = true;
          }}
          style={styles.pager}
          contentContainerStyle={{ height: '100%' }}
        >
          {photos.map((p, i) => (
            <View key={p.id} style={{ width: w, height: '100%' }}>
              {Math.abs(i - index) <= NEAR && p.url ? (
                <Image source={{ uri: p.url }} style={styles.photo} resizeMode="contain" />
              ) : null}
            </View>
          ))}
        </ScrollView>

        <View style={styles.bottom}>
          {photo?.canDelete && onDelete ? (
            <View style={styles.deleteBox}>
              {error ? <Text style={[type.caption, { color: color.highlight }]}>{error}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={async () => {
                  if (!confirm) return setConfirm(true);
                  setBusy(true);
                  try {
                    await onDelete(photo);
                    setConfirm(false);
                  } catch {
                    setError('안 지워졌다. 다시 해봐.');
                  }
                  setBusy(false);
                }}
                style={styles.deleteTouch}
              >
                <Text style={[type.caption, styles.light, styles.underline]}>
                  {busy ? '지우는 중.' : confirm ? '한 번 더 누르면 지운다' : '이 인증 지우기'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {photos.length > 1 ? (
            <ScrollView
              ref={strip}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.strip}
              contentContainerStyle={styles.stripInner}
            >
              {photos.map((p, i) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.title} ${p.subtitle ?? ''}`}
                  onPress={() => go(i)}
                  style={[styles.thumb, i === index && styles.thumbOn]}
                >
                  <LazyImage key={p.thumb ?? p.url} src={p.thumb} fallback={p.url} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.black },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(2), paddingTop: space(1), width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  side: { width: layout.minTouch },
  sideRight: { alignItems: 'flex-end' },
  titleBox: { flex: 1, alignItems: 'center', gap: 2 },
  title: { ...font.bodyBold, fontSize: 15, color: color.cream },
  light: { color: color.cream },
  close: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  closeText: { ...font.bodyBold, fontSize: 20, color: color.cream },
  pager: { flex: 1 },
  photo: { width: '100%', height: '100%' },
  bottom: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingBottom: space(2) },
  deleteBox: { alignItems: 'center', gap: space(1) },
  deleteTouch: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space(4) },
  underline: { textDecorationLine: 'underline' },
  strip: { flexGrow: 0, paddingTop: space(2) },
  stripInner: { gap: THUMB_GAP, paddingHorizontal: layout.gutter },
  thumb: { overflow: 'hidden', width: THUMB_W, height: THUMB_H, backgroundColor: color.bodyGray, opacity: 0.6 },
  thumbOn: { opacity: 1, borderWidth: 2, borderColor: color.cream },
});
