# 312goal 저장소

서로 **별개인 두 프로젝트**가 한 저장소에 폴더로 나뉘어 있다. 서로의 파일·설정·DB를 섞지 않는다.

| 폴더 | 프로젝트 | 배포 (Cloudflare Pages) | DB (Supabase) |
|---|---|---|---|
| [`312goal/`](312goal/) | 2026 "150 Challenge" 진척도 사이트 (정적 HTML) | 프로젝트 `312goal` → https://312goal.pages.dev | 옛 프로젝트 `zvrwumrucxyenfngpyhv` |
| [`haenya/`](haenya/) | 친구 운동 인증 서비스 "했냐" (Expo 웹앱, 2027-01-01 오픈) | 프로젝트 `haenya` → https://haenya.pages.dev | 새 프로젝트 `hfnwadutbowgxrosnypz` |

- 각 Cloudflare 프로젝트는 **자기 폴더만** 배포하고, 자기 폴더가 바뀔 때만 다시 빌드한다(빌드 감시 경로).
- `.github/workflows/haenya-keepalive.yml`: 했냐 Supabase가 잠들지 않게 하루 한 번 깨운다(GitHub 규칙상 저장소 맨 위에 있어야 함).
- 했냐 작업 규칙: [`haenya/CLAUDE.md`](haenya/CLAUDE.md)
