import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * 웹 정적 HTML의 뼈대 (웹에서만 쓰임).
 * 본문 글꼴(Gothic A1)은 Google Fonts: 한글을 잘게 나눠 화면에 쓰인 글자만 받는다.
 *
 * 주의(Expo SDK 58): headNodes·bodyNodes 를 꼭 넣어야 한다. 빠지면 JS·스타일이 HTML에 안 들어가 화면이 깨진다.
 */
const FONTS = 'https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;600;800&display=swap';
/**
 * 제목·숫자 글꼴(Black Han Sans)은 직접 올린 파일 하나(한글 전체, 185KB, public/fonts)를 HTML과 동시에 받기 시작한다(preload).
 * 예전엔 Google Fonts로 받아서, 받기 전까지 휴대폰 기본 글꼴(얇은 글씨)로 보였다가 굵게 바뀌었다(사용자 제보 2026-11-10).
 * font-display: block → 받는 동안 잠깐 글자를 숨기고, 받으면 바로 굵게 (최대 3초 뒤엔 기본 글꼴).
 * 파일을 바꾸면 이름도 바꿀 것(1년 캐시). 다시 만들기: pyftsubset …BlackHanSans_400Regular.ttf (한글 음절·자모·ASCII) --flavor=woff2
 */
const DISPLAY_FONT = '/fonts/black-han-sans.woff2';
const DISPLAY_FACE = `@font-face{font-family:'Black Han Sans';src:url(${DISPLAY_FONT}) format('woff2');font-weight:400;font-style:normal;font-display:block}`;

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, headNodes, bodyAttributes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="ko" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#F1EDE4" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/api/manifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="했냐" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="description" content="친구끼리 운동 인증. 사진 한 장이면 끝. 안 하면 단톡방에서 찔린다." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="했냐" />
        <meta property="og:title" content="너도 했냐?" />
        <meta property="og:description" content="친구끼리 운동 인증. 사진 한 장이면 끝. 안 하면 단톡방에서 찔린다." />
        <meta property="og:image" content="https://haenya.pages.dev/og.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        {/* DB 서버에 미리 연결해 두면 초대 화면의 그룹 정보가 빨리 뜬다 */}
        <link rel="preconnect" href="https://hfnwadutbowgxrosnypz.supabase.co" crossOrigin="" />
        <link rel="preload" href={DISPLAY_FONT} as="font" type="font/woff2" crossOrigin="" />
        <style dangerouslySetInnerHTML={{ __html: DISPLAY_FACE }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* 글꼴 CSS가 첫 화면을 막지 않게: print로 받아 두었다가 다 받으면 all로 바꾼다 */}
        <link id="hf" rel="stylesheet" href={FONTS} media="print" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.getElementById('hf');function on(){l.media='all'}if(l.sheet){on()}else{l.addEventListener('load',on)}})();",
          }}
        />
        <noscript>
          <link rel="stylesheet" href={FONTS} />
        </noscript>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background-color:#F1EDE4;}' }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
