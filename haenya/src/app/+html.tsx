import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * 웹 정적 HTML의 뼈대 (웹에서만 쓰임).
 * 글꼴은 Google Fonts에서 불러온다: 한글을 잘게 나눠 화면에 쓰인 글자만 받으므로
 * 폰트 파일(약 7MB)을 통째로 받는 것보다 훨씬 빠르다 (카톡 인앱 첫 화면 2초 목표).
 *
 * 주의(Expo SDK 58): headNodes·bodyNodes 를 꼭 넣어야 한다. 빠지면 JS·스타일이 HTML에 안 들어가 화면이 깨진다.
 */
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Gothic+A1:wght@400;600;800&display=swap"
        />
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
