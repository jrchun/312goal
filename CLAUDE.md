# 312goal 저장소

## 답변 언어 (가장 중요)

- 사용자에게 하는 답변은 **반드시 한국어**로 쓴다. 영어로 답하지 않는다.
- 전문 용어는 쉬운 말로 풀어서 설명하고, 필요하면 예시를 든다. 사용자는 개발 지식이 많지 않다.

## 구성: 별개인 두 프로젝트 (섞지 말 것)

- `312goal/`: 기존 2026 "150 Challenge" 사이트(`index.html`, `admin.html`, `image/`, `_headers`). 옛 Supabase 프로젝트. Cloudflare Pages 프로젝트 `312goal`이 **이 폴더만** 배포(기준 폴더 `312goal`, 빌드 없음, 감시 경로 `312goal/*`).
- `haenya/`: 새 서비스 "했냐"(Expo 웹앱). 새 Supabase 프로젝트. Cloudflare Pages 프로젝트 `haenya`가 **이 폴더만** 배포(기준 폴더 `haenya`, 감시 경로 `haenya/*`). 작업 규칙은 `haenya/CLAUDE.md`.
- 두 프로젝트는 코드·DB·배포·비밀값을 공유하지 않는다. 한쪽 작업이 다른 쪽 파일·설정을 건드리지 않게 한다.
- 둘 다 `main` 브랜치에서 배포된다.
- 저장소 맨 위에는 공통 문서(README.md, CLAUDE.md)와 GitHub 설정(`.github/`)만 둔다.

@haenya/CLAUDE.md
