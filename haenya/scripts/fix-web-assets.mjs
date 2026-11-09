// Cloudflare Pages는 이름이 node_modules 인 폴더를 올리지 않는다.
// expo export 결과의 dist/assets/node_modules 를 dist/assets/_m 으로 옮기고, 참조하는 경로도 바꾼다.
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const from = join(dist, 'assets/node_modules');
if (!existsSync(from)) {
  console.log('fix-web-assets: 옮길 것 없음');
  process.exit(0);
}
renameSync(from, join(dist, 'assets/_m'));

let changed = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|html|css|json)$/.test(name)) {
      const s = readFileSync(p, 'utf8');
      const t = s.replaceAll('/assets/node_modules/', '/assets/_m/');
      if (t !== s) {
        writeFileSync(p, t);
        changed++;
      }
    }
  }
};
walk(dist);
console.log(`fix-web-assets: assets/node_modules → assets/_m (${changed}개 파일 경로 수정)`);
