import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { createTransferToken } from '../lib/device-auth';
import { canPromptInstall, openInExternalBrowser, promptInstall, setManifestStart, where, Where } from '../lib/env';
import { siteUrl } from '../lib/invite';
import { color, font, space, type } from '../theme';
import { Button } from './Button';
import { Notice } from './Form';

/**
 * 홈 화면에 추가 안내 — 기기·브라우저마다 다르게.
 *  카톡 안: 홈 화면 추가가 안 되므로 Safari/크롬으로 연다 (1회용 이어가기 열쇠를 함께 넘겨 숫자 없이 이어짐)
 *  아이폰 Safari: 공유 → 홈 화면에 추가. 아이콘의 시작 주소에 이어가기 열쇠를 넣어 둔다
 *  안드로이드 크롬: 설치 창 (크롬과 홈 화면 앱은 로그인을 같이 쓴다)
 * startOverride: 이미 열쇠가 든 주소(/install?t=...)에서 열렸을 때 그 주소를 그대로 시작 주소로.
 */
export function InstallGuide({ code, loggedIn, startOverride }: { code?: string; loggedIn: boolean; startOverride?: string }) {
  const [w, setW] = useState<Where | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const ww = where();
    setW(ww);
    setInstallable(canPromptInstall());
    const t = setInterval(() => setInstallable(canPromptInstall()), 1000);
    // 아이폰 Safari: 지금 이 순간의 설정으로 아이콘이 만들어진다 → 시작 주소에 이어가기 열쇠를 넣어 둔다
    if (ww === 'ios-safari') {
      if (startOverride) setManifestStart(startOverride);
      else if (loggedIn) {
        createTransferToken(30)
          .then((tok) => {
            const start = `/install?t=${tok}${code ? `&code=${code}` : ''}`;
            setManifestStart(start);
            window.history.replaceState(window.history.state, '', start);
          })
          .catch(() => undefined);
      }
    }
    if (ww === 'android-chrome') setManifestStart('/home');
    return () => clearInterval(t);
  }, [code, loggedIn, startOverride]);

  const toExternal = async (ios: boolean) => {
    setBusy(true);
    setMsg('');
    try {
      const tok = loggedIn ? await createTransferToken(30) : '';
      const path = ios
        ? `/install?${tok ? `t=${tok}&` : ''}${code ? `code=${code}` : ''}`
        : tok ? `/continue?t=${tok}&next=${encodeURIComponent('/onboarding?step=install')}` : '/';
      openInExternalBrowser(`${siteUrl()}${path}`);
    } catch {
      setMsg('잠깐 문제가 생겼다. 다시 해봐.');
    }
    setBusy(false);
  };

  if (!w) return null;

  if (w === 'standalone') return <Text style={[type.sentence, styles.text]}>이미 홈 화면 앱으로 열었다. 끝.</Text>;
  if (w === 'desktop') return <Text style={[type.sentence, styles.text]}>휴대폰에서 열어야 홈 화면에 넣을 수 있다.</Text>;

  if (w === 'kakao-ios' || w === 'kakao-android') {
    const ios = w === 'kakao-ios';
    return (
      <View style={styles.box}>
        <Text style={[type.sentence, styles.text]}>
          카톡 안에서는 홈 화면에 못 넣는다. {ios ? 'Safari' : '크롬'}로 열자. 로그인은 그대로 이어진다.
        </Text>
        <Notice tone="error">{msg}</Notice>
        <Button label={ios ? 'Safari로 열기' : '크롬으로 열기'} onPress={() => toExternal(ios)} busy={busy} />
      </View>
    );
  }

  if (w === 'ios-safari') {
    return (
      <View style={styles.box}>
        <Step n={1} text="화면 아래 가운데 공유 버튼(네모에 위 화살표)을 누른다." />
        <Step n={2} text="목록을 내려서 '홈 화면에 추가'를 누른다." />
        <Step n={3} text="오른쪽 위 '추가'를 누른다." />
        <Text style={type.caption}>홈 화면의 약올리는 얼굴 아이콘으로 열면 바로 이어진다. 30분 안에 처음 열어줘.</Text>
      </View>
    );
  }

  if (w === 'android-chrome') {
    return (
      <View style={styles.box}>
        {installable ? (
          <Button label="홈 화면에 추가" onPress={async () => { if (await promptInstall()) setMsg('추가했다. 홈 화면 아이콘으로 열어.'); }} />
        ) : (
          <>
            <Step n={1} text="오른쪽 위 점 세 개(⋮)를 누른다." />
            <Step n={2} text="'홈 화면에 추가' 또는 '앱 설치'를 누른다." />
          </>
        )}
        <Notice>{msg}</Notice>
      </View>
    );
  }

  // 그 밖의 브라우저(아이폰 크롬, 네이버 앱 등): Safari/크롬으로 옮기라고 안내
  const ios = w === 'ios-other';
  return (
    <View style={styles.box}>
      <Text style={[type.sentence, styles.text]}>여기서는 홈 화면에 못 넣는다. {ios ? 'Safari' : '크롬'}에서 haenya.pages.dev 를 열어줘.</Text>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <Text style={{ ...font.display, fontSize: 32, lineHeight: 36, color: color.black, width: 30 }}>{n}</Text>
      <Text style={[type.sentence, styles.text, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space(4) },
  text: { color: color.black },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: space(3) },
});
