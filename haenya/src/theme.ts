/**
 * 했냐 디자인 토큰 — 디자인 가이드라인 v0.1 (2026.11) 기준.
 * 모든 화면은 여기 정의된 값만 쓴다. 새 색·크기가 필요하면 먼저 여기에 추가한다.
 *
 * 원칙: 크림 70 · 검정 20 · 빨강 10. 빨강은 화면에서 가장 중요한 한 곳에만.
 * 모서리 0, 그림자 0, 그라데이션 0. 구분은 검정 선, 강조는 블록.
 */

import { Platform } from 'react-native';

export const color = {
  // 주 색
  cream: '#F1EDE4', // 모든 화면의 바탕. 순백(#FFF) 대신 항상 이 색
  black: '#141414', // 본문, 굵은 구분선, 주 버튼, 하단 메뉴
  red: '#E0361C', // 워드마크, "했다." 띠지, 찌르기, 재촉 카드 바탕. 크림 위 글자로는 24px 이상만

  // 보조 색
  gray: '#9A948A', // 큰 숫자의 남은 부분(/3), 취소선 이름. 24px 이상에서만
  bodyGray: '#5E5950', // 작은 보조 문구 (크림 위 대비 6:1 이상)
  textRed: '#C4250F', // 작은 빨간 글자 ("5일째 무소식")
  highlight: '#F3C8BE', // 순위표의 "나" 줄 밑줄 하이라이트
  scrim: 'rgba(20,20,20,0.6)', // 아래에서 올라오는 창 뒤 어두운 막 (검정 60%)
} as const;

const web = Platform.OS === 'web';

/** Gothic A1: 웹은 Google Fonts 한 가족 + 굵기, 앱은 굵기마다 다른 폰트 파일 이름 */
const gothic = (nativeName: string, weight: '400' | '600' | '800') =>
  web ? { fontFamily: "'Gothic A1', sans-serif", fontWeight: weight } : { fontFamily: nativeName };

/**
 * 글꼴. 스타일에 펼쳐서 쓴다: { ...font.display, fontSize: 32 }
 *  웹: Google Fonts (src/app/+html.tsx 에서 불러옴, 한글을 잘게 나눠 필요한 글자만 받음)
 *  앱: @expo-google-fonts 폰트 파일 (src/lib/fonts.native.ts)
 */
export const font = {
  /** 제목·숫자·버튼. 굵기 1종뿐이라 fontWeight를 주지 않는다. */
  display: web ? { fontFamily: "'Black Han Sans', sans-serif" } : { fontFamily: 'BlackHanSans_400Regular' },
  /** 본문·UI */
  body: gothic('GothicA1_400Regular', '400'),
  bodySemi: gothic('GothicA1_600SemiBold', '600'),
  bodyBold: gothic('GothicA1_800ExtraBold', '800'),
} as const;

/**
 * 글자 크기 (모바일 390px 기준).
 * 한 화면에서 가장 큰 글자와 가장 작은 글자는 10배 이상 차이 나게 한다.
 */
export const type = {
  headline: { ...font.display, fontSize: 150, lineHeight: 150 * 0.85, letterSpacing: -6 },
  progress: { ...font.display, fontSize: 92, lineHeight: 92 },
  rankName: { ...font.display, fontSize: 32, lineHeight: 38 },
  button: { ...font.display, fontSize: 21, lineHeight: 26 },
  sentence: { ...font.bodyBold, fontSize: 15, lineHeight: 15 * 1.35 },
  label: { ...font.bodyBold, fontSize: 12, letterSpacing: 2 },
  caption: { ...font.bodySemi, fontSize: 12, color: color.bodyGray },
} as const;

/** 요소 간격은 4의 배수 */
export const space = (n: number) => n * 4;

export const layout = {
  /** 설계 기준 폭. 웹/데스크톱에서는 이 폭으로 가운데 정렬, 양옆은 크림 여백 */
  maxWidth: 390,
  gutter: 20,
  /** 터치 영역 최소 */
  minTouch: 44,
} as const;

export const line = {
  /** 큰 구획 (머리와 몸 구분) */
  section: 6,
  /** 순위 행 */
  row: 1.5,
} as const;

/** 스티커 기울기 범위 (-6° ~ +3°), 한 카드에 스티커 7개 이하 */
export const sticker = {
  minRotate: -6,
  maxRotate: 3,
  maxCount: 7,
} as const;
