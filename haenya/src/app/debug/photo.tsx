import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Rule } from '../../components/Rule';
import { Screen } from '../../components/Screen';
import { pickPhoto } from '../../lib/photo';
import { color, font, space, type } from '../../theme';

/**
 * 진단용 숨은 화면 (/debug/photo): 고른 사진 파일 안의 정보를 그대로 보여준다.
 * 서버로 아무것도 보내지 않는다. 실기기에서 촬영 시각(EXIF)이 넘어오는지 확인하려고 만든 화면.
 */
export default function PhotoDebug() {
  const [lines, setLines] = useState<string[]>([]);

  const run = async (mode: 'camera' | 'album') => {
    const file = await pickPhoto(mode);
    if (!file) return;
    const out: string[] = [];
    out.push(`버튼: ${mode === 'camera' ? '지금 찍기' : '앨범'}`);
    out.push(`브라우저: ${typeof navigator !== 'undefined' ? navigator.userAgent : '?'}`);
    out.push(`파일: ${file.name} · ${file.type || '형식 없음'} · ${Math.round(file.size / 1024)}KB`);
    out.push(`lastModified: ${new Date(file.lastModified).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    const head = new Uint8Array(await file.slice(0, 128 * 1024).arrayBuffer());
    const ascii = Array.from(head, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    out.push(`시작 바이트: ${Array.from(head.slice(0, 4), (b) => b.toString(16).padStart(2, '0')).join(' ')}`);
    out.push(`'Exif' 표시 있음: ${ascii.includes('Exif') ? '예' : '아니오'} · 'ftypheic': ${ascii.includes('ftyphei') ? '예' : '아니오'}`);
    const dt = ascii.match(/\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/g);
    out.push(`파일 안 날짜 문자열: ${dt ? Array.from(new Set(dt)).slice(0, 4).join(', ') : '없음'}`);
    try {
      const { default: lite } = await import('exifr/dist/lite.esm.mjs');
      const t = await lite.parse(file, { tiff: true, exif: true, gps: true, ifd1: false, interop: false, reviveValues: false });
      out.push(`exifr(lite) 결과: ${t ? Object.keys(t).length + '개 항목' : '없음'}`);
      if (t) {
        for (const k of ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'OffsetTimeOriginal', 'Make', 'Model', 'Software']) {
          if (t[k] !== undefined) out.push(`  ${k}: ${String(t[k])}`);
        }
        out.push(`  GPS 정보: ${t.latitude !== undefined || t.GPSLatitude !== undefined ? '있음' : '없음'}`);
      }
    } catch (e) {
      out.push(`exifr 오류: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLines(out);
  };

  if (Platform.OS !== 'web') return null;
  return (
    <Screen>
      <Text style={styles.title}>사진 진단.</Text>
      <Rule />
      <Text style={[type.sentence, styles.sentence]}>사진 안에 무슨 정보가 있는지만 본다. 아무것도 안 올린다.</Text>
      <View style={styles.actions}>
        <Button label="지금 찍기로 확인" onPress={() => run('camera')} />
        <Button variant="secondary" label="앨범 사진으로 확인" onPress={() => run('album')} />
      </View>
      <View style={styles.out}>
        {lines.map((l, i) => (
          <Text key={i} selectable style={styles.line}>{l}</Text>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.rankName, fontSize: 56, lineHeight: 60, color: color.black, paddingTop: space(6), paddingBottom: space(3) },
  sentence: { color: color.black, paddingTop: space(3) },
  actions: { gap: space(3), paddingTop: space(6) },
  out: { gap: space(1), paddingVertical: space(6) },
  line: { ...font.body, fontSize: 13, lineHeight: 19, color: color.black },
});
