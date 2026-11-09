# 했냐 (HAENYA)

@AGENTS.md

## 답변 언어 (가장 중요)

- 사용자에게 하는 답변은 **반드시 한국어**로 쓴다. 영어로 답하지 않는다.
- 전문 용어는 쉬운 말로 풀어서 설명하고, 필요하면 예시를 든다. 사용자는 개발 지식이 많지 않다.
- 코드·파일명·명령어는 그대로 두되, 무엇인지 한국어로 덧붙인다.

친구 그룹 운동 인증 + 서로 찌르기 서비스. 2027-01-01 웹(PWA) 오픈, 이후 같은 코드로 iOS/안드로이드.
원본 문서: "했냐 MVP 개발 지시서"(Claude Docs), "했냐 디자인 가이드라인 v0.1"(PDF, 2026.11).

## 스택과 원칙

- Expo SDK 58 + Expo Router(`src/app/`) + TypeScript. Supabase(Auth/DB/Storage). 웹은 `expo export --platform web` 정적 결과(`dist/`)를 Cloudflare Pages에 배포.
- 비즈니스 규칙(하루 1회, 날짜 판정, 찌르기 제한, 12명 제한)은 반드시 Supabase DB 함수와 RLS에 둔다. 화면은 얇게.
- 플랫폼별로 다른 코드(카카오 공유, 이미지 저장)는 `*.web.ts` / `*.native.ts`로 분리.
- 시간대는 항상 Asia/Seoul. 하루 기준은 새벽 3시(03:00 이전은 전날). 그래서 주간 리셋도 실제로는 월요일 03시(사용자 확인 완료).
- Supabase는 새 프로젝트. 기존 312goal(저장소 루트의 index.html/admin.html)과 분리.
- 사용자는 개발 지식이 많지 않다. 각 작업 끝에 직접 확인하는 방법을 한국어로 알려줄 것.
- 이 환경에서는 api.expo.dev가 막혀 있어 `npx expo install`은 `EXPO_OFFLINE=1`을 붙여 실행한다.

## 라우트

| 경로 | 파일 | 단계 |
|---|---|---|
| `/` 일반 랜딩 | `src/app/index.tsx` | STAGE 7 |
| `/join/[code]` 초대 랜딩 | `src/app/join/[code].tsx` | STAGE 3 |
| `/login` 카카오 로그인 + 약관 | `src/app/login.tsx` | STAGE 3 |
| `/auth/kakao` 카카오 로그인 후 돌아오는 곳 | `src/app/auth/kakao.tsx` | STAGE 3 |
| `/joined` 그룹 합류 확인 + 내 올해 목표 | `src/app/joined.tsx` | STAGE 3 |
| `/terms` `/privacy` 약관 (초안은 STAGE 8) | `src/app/terms.tsx`, `privacy.tsx` | STAGE 3·8 |
| `/create-group` | `src/app/create-group.tsx` | STAGE 3 |
| `/onboarding` 0번째 인증, 홈 화면 추가 안내 | `src/app/onboarding.tsx` | STAGE 7 |
| `/home` `/group` `/my` (탭) | `src/app/(tabs)/` | STAGE 4·6 |
| `/checkin` 인증샷 (모달) | `src/app/checkin.tsx` | STAGE 4 |
| `/checkin-done` 인증 완료 + 스티커 카드 | `src/app/checkin-done.tsx` | STAGE 5 |
| `/settings` | `src/app/settings.tsx` | STAGE 6 |

`public/_redirects`가 `/join/*`을 `/join/[code]`로 돌린다(Cloudflare Pages).

로그인 흐름 (카카오 OpenID Connect 직접 연동 — Supabase 기본 카카오 연동은 쓰지 않는다):
`signInWithKakao(next)`(`src/lib/auth.web.ts`)가 scope 없이 카카오 인가 화면으로 보냄 → `/auth/kakao`(`src/app/auth/kakao.tsx`)로 돌아옴 →
Cloudflare Pages Function `functions/api/kakao-token.ts`가 클라이언트 시크릿으로 code를 ID 토큰으로 교환 → `supabase.auth.signInWithIdToken({provider:'kakao'})` → `nextRoute()`.
이유: Supabase의 `signInWithOAuth('kakao')`는 이메일 권한(account_email)을 강제로 요청하는데, 이메일 동의항목은 비즈 앱 + 심사가 있어야 해서 KOE205가 난다.
카카오 콘솔 필요 설정: OpenID Connect ON, REST API 키 리다이렉트 URI에 `https://haenya.pages.dev/auth/kakao`. Cloudflare 변수: KAKAO_REST_KEY, KAKAO_CLIENT_SECRET(Secret), EXPO_PUBLIC_KAKAO_REST_KEY.
`/api/kakao-token`은 Cloudflare에서만 돌아서 로컬 `npm run web`으로는 로그인 끝까지 테스트할 수 없다(배포 주소에서 테스트).
약관 미동의 → `/login`(동의 단계), 초대 링크로 왔으면 → `/join/[code]`(자동 합류 → `/joined`), 그룹 있으면 `/home`, 없으면 `/create-group`.
로그인 상태·프로필·내 그룹은 `useSession()`으로 읽는다. 탭 화면은 로그인+약관+그룹이 없으면 들어올 수 없다.

## 디자인 규칙 (가이드라인 요약)

**토큰은 `src/theme.ts`만 쓴다.** 하드코딩한 색·폰트·크기 금지. 새 값이 필요하면 theme.ts에 먼저 추가.

컨셉: 크게. 단호하게. 놀리듯이. 단톡방 한마디를 화면으로 옮긴 꾸미지 않은 포스터. **한 화면, 한 문장** — 모든 화면은 한 문장으로 요약돼야 한다. 새 화면 검사 질문: "오늘 했냐?"에 바로 답할 수 있는가.

- 색: 크림 70 · 검정 20 · 빨강 10. 빨강은 화면에서 가장 중요한 한 곳에만("했냐?", "했다.", 찌르기).
  - 빨강 `#E0361C` 글자는 크림 위 24px 이상만. 작은 빨간 글자는 `textRed #C4250F`.
  - 회색 `#9A948A`은 24px 이상(큰 숫자의 남은 부분 `/3`, 취소선 이름). 작은 보조 문구는 `bodyGray #5E5950`.
  - 순백(#FFF) 바탕 금지, 항상 크림. 파랑·초록 등 다른 강조색 금지. 빨강 바탕에 빨강 계열 금지.
- 글꼴: Black Han Sans(제목·숫자·버튼, 굵기 1종) + Gothic A1(본문 400/600/800). 한 화면에서 가장 큰 글자와 가장 작은 글자 차이 10배 이상. 중간 크기만 나열하면 실패.
  - 헤드라인 150px·행간 0.85·자간 -4% / 진행 숫자 92px / 순위 이름 32px / 버튼 20–22px / 문장 Gothic 800 15px / 섹션 라벨 Gothic 800 12px 자간 2px / 보조 Gothic 600 12px.
- 레이아웃: 설계 기준 390×844, 웹/데스크톱은 가운데 정렬 + 양옆 크림. 좌우 여백 20px, 간격 4의 배수. 큰 구획 6px 검정 선, 순위 행 1.5px 선. 헤드라인은 화면 폭을 넘칠 만큼 크게, 왼쪽 정렬. 버튼은 화면 아래쪽. 터치 영역 최소 44px.
  - 상단 한 줄: 그룹명 · 주차. 최상단 가장 큰 요소 1개. 주 버튼 화면당 1개. 하단 메뉴 검정 바: 홈 · 그룹 · 마이.
- 모서리 0, 그림자 0, 그라데이션 0. 둥근 카드 반복 금지. 일러스트·캐릭터·이모지 장식 금지.
- 강조는 이 셋만: 빨강 블록(가장 중요한 행동 하나), 형광펜 밑줄 `#F3C8BE`(나 자신), 빨간 취소선(무소식 친구).
- 버튼: 주(검정 블록·크림 글자·→) / 보조(검정 테두리) / 찌르기(빨강 블록·검정 글자, 무소식 친구 옆에만). `src/components/Button.tsx`.
- 순위 행 3상태: 기본 / 나(형광펜) / 무소식 3일 이상(회색 취소선 + "N일째 무소식" + 찌르기).
- 워드마크: "했냐?"(물음표까지 로고), 최소 22px, 사방 여백 "했" 폭의 절반 이상. 윤곽선·그림자·기울여 늘리기·다른 글꼴 금지. 문장 속 서비스명은 물음표 없이 "했냐".

### 스티커 (인증샷 위 정보)

사진과 섞이지 않게 단색 블록 스티커. 기울기 -6°~+3°, 7개 이하. 사진 위 반투명 글자 금지.

| 스티커 | 스타일 | 위치/규칙 |
|---|---|---|
| 했다. | 빨강 · -5° | 가장 큼, 화면 폭 60% 이상 |
| 2/3 | 검정 · 0° | 이번 주 진행, "했다." 바로 아래 |
| 성우, 이번 주 두 번째 | 크림 · +2° | 이름과 한 줄 메모 |
| 했냐? | 크림 · -3° | 왼쪽 위 고정, 로고 |
| 운동 4인방 · W02 | 검정 · 0° | 오른쪽 위, 그룹과 주차 |
| 1월 14일 목 · 7:42 | 크림 · 0° | 왼쪽 아래, 날짜 없으면 "날짜 미확인" |
| 너도 했냐 → | 빨강 · 0° | 오른쪽 아래, 외부 공유용 유입 문구 |

### 공유 카드

| 카드 | 크기 | 채널 | 규칙 |
|---|---|---|---|
| 재촉 카드 | 1200×1200 | 카톡 | 빨강 바탕 전체 + "○○야 했냐?". 대상 이름·주간 횟수·무소식 일수 가능(그룹 내부) |
| 나 했다 카드 | 1200×1200 | 카톡 | 스토리·인증과 같은 구성, 정사각형 |
| 스토리·인증 | 1080×1920 | 인스타 | 본인 기록만. 다른 멤버 이름·수치 금지 |
| 스토리·주간 결산 | 1080×1920 | 인스타 | 검정 바탕. 그룹 합계만, 뒤처진 멤버 비노출 |

모든 외부 카드 아래 띠에 워드마크 + 유입 문구("너도 했냐", "너네 그룹도 했냐").

### 문구 (친구한테 하는 말투)

반말, 짧게, 마침표로 끊는다. 놀리는 대상은 "안 한 행동"이지 사람이 아니다. 망신은 그룹 안에서만.

| 상황 | 이렇게 | 이렇게 쓰지 않는다 |
|---|---|---|
| 홈 인사 | 성우. 이번 주 아직 두 번. | 안녕하세요 성우님! 오늘도 화이팅하세요 :) |
| 인증 완료 | 했다. 한 번 남았다. | 인증이 성공적으로 완료되었습니다. |
| 무소식 | 5일째 무소식 | 민지님은 운동을 하지 않고 있습니다 |
| 재촉 카드 | 민지야 했냐? 다들 기다리는 중. | 외모·성격 비난 |
| 과거 사진 거절 | 오늘 찍은 사진만 된다. | 오류가 발생했습니다 (코드 403) |
| 날짜 미확인 | 날짜 미확인 | 부정 인증이 의심됩니다 |
| 하루 중복 | 오늘은 이미 했다. 사진만 저장할게. | 하루 1회만 인증 가능합니다. |
| 초대 | 너도 했냐? | 지금 가입하고 건강한 습관을 만들어보세요! |

쓰는 것: 마침표, 반말, 숫자, 이름. 줄이는 것: 느낌표, 존댓말, "~하세요". 쓰지 않는 것: 이모지, 외모·체중 언급, 욕설.

## 인증샷 (STAGE 4)

- 흐름: `pickPhoto`(지금 찍기=capture / 앨범) → `preparePhoto`(`src/lib/photo.web.ts`: EXIF 촬영 시각 읽기 → 긴 변 1600px JPEG로 다시 그림) → `submitCheckin`(`src/lib/checkin.ts`: 오늘 사진인지 먼저 거름 → Storage 업로드 → `submit_checkin` → 거절되면 사진 삭제) → `/checkin-done`.
- canvas로 다시 그려서 **EXIF가 전부 빠진다(GPS 포함)**. 테스트로 확인함. EXIF 읽기는 `exifr/dist/lite.esm.mjs` — lite는 `pick` 옵션을 쓰면 오류가 나니 쓰지 말 것.
- 날짜 계산은 `src/lib/dates.ts`(DB와 같은 규칙). 화면·사전 확인용이고 최종 판정은 DB.
- 홈은 `group_week_board`를 화면에 올 때마다 다시 읽는다(useFocusEffect). 이번 주 순위는 이번 주 횟수 순, 그룹 탭은 최근 4주 순위.
- 찌르기는 지금 문장+링크 공유. 재촉 카드 이미지는 STAGE 5. 앱(native)의 사진·로그인은 2단계.

## DB (Supabase)

- 프로젝트: `https://hfnwadutbowgxrosnypz.supabase.co`. 스키마는 `docs/schema.sql` 하나(재실행 안전).
- **DB 반영은 Claude가 직접 한다**: `bash scripts/db-apply.sh`(schema.sql 전체 적용), `bash scripts/db-apply.sh "select ..."`(확인용 SQL).
  Supabase 관리 API(api.supabase.com)를 쓰고, 토큰은 Claude 작업 환경("312goal")에 저장돼 프록시가 자동으로 붙인다. 사용자에게 SQL 붙여넣기를 시키지 않는다.
  적용 전에 `docs/db-test/run.sh`로 로컬 검증부터. 다른 Supabase 프로젝트(기존 312goal)는 건드리지 않는다.
- 함수가 돌려주는 칸을 바꾸면 `create or replace`가 실패하므로 그 앞에 `drop function if exists`를 둔다.
- 앱은 테이블에 직접 쓰지 않고 함수를 부른다: `create_group`, `join_group`, `get_invite_preview`(비로그인 가능), `submit_checkin`, `send_nudge`.
- 화면용 집계: `group_week_board`(이번 주 보드·순위·무소식 일수), `my_stats`, `my_weeks`(52주 칸), `group_week_summary`(주간 결산).
- 직접 쓰기는 이것만 허용: profiles(본인), groups 이름·목표(그룹장), group_members.season_goal·나가기(본인), checkins 삭제(본인), reactions(본인), push_tokens(본인).
- 함수 오류 코드(`PHOTO_NOT_TODAY`, `ALREADY_NUDGED`, `GROUP_FULL` 등) → 문구는 `src/lib/errors.ts`. 새 코드를 만들면 둘 다 고친다.
- 랭킹(B안, 사용자 확정): `rank_weeks` = 최근 끝난 4주(4주 전~지난주) 중 주간 목표를 채운 주 수(0~4, 연속 아니어도 됨). 높은 순, 같으면 시즌 누적 많은 순. 이번 주는 진행 중이라 넣지 않는다. (`streak_weeks` 연속 달성 주 수는 마이 화면 참고용으로만 남김)
- 스키마를 바꾸면 `docs/db-test/run.sh`로 로컬 Postgres에서 검증한다.
- 환경변수: `.env.example` → `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

## 배포 (Cloudflare Pages)

- 프로젝트 `haenya` → https://haenya.pages.dev (계정 56c12d77403c9e5d75ef71350ae5aad4). 기존 `312goal` 등 다른 Pages 프로젝트는 건드리지 않는다.
- GitHub `jrchun/312goal` 연결. 배포 브랜치 `claude/eloquent-cori-4zjqre`(main 합치면 변경), 기준 폴더 `haenya`, 빌드 `npm run build:web`, 결과 `dist`. 푸시하면 자동 배포.
- 환경 변수: NODE_VERSION=22, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY(publishable), EXPO_PUBLIC_SITE_URL, EXPO_PUBLIC_KAKAO_REST_KEY, KAKAO_REST_KEY, KAKAO_CLIENT_SECRET(Secret, 사용자가 대시보드에서 입력).
- `functions/` 폴더는 Cloudflare Pages Functions(서버 코드). 같은 주소의 `/api/...`로 돌아간다.
- Cloudflare Pages는 `node_modules`라는 이름의 폴더를 올리지 않는다 → `build:web`이 `scripts/fix-web-assets.mjs`로 `dist/assets/node_modules`를 `assets/_m`으로 옮긴다.
- 웹 글꼴은 Google Fonts(`src/app/+html.tsx`), 앱은 폰트 파일(`src/lib/fonts.native.ts`). 스타일에는 `...font.display`처럼 펼쳐 쓴다(웹은 굵기를 fontWeight로).
- `+html.tsx`는 `useServerDocumentContext()`의 headNodes·bodyNodes를 꼭 넣는다(빠지면 JS·스타일이 안 들어가 화면이 깨짐).
- Claude는 Cloudflare API(api.cloudflare.com, Pages 편집 토큰, 프록시 자동 주입)로 프로젝트 설정·배포 상태를 확인한다.
- 이 주소는 카카오 콘솔(플랫폼 Web, 앱 대표 도메인)과 Supabase Redirect URLs(`https://haenya.pages.dev/**`)에 등록돼 있어야 로그인이 된다.
  Supabase 로그인 설정 변경은 Claude가 직접 못 한다(안전장치) → 사용자가 대시보드에서.

## 명령

```bash
npm run web          # 개발 서버 (브라우저)
npm run build:web    # 정적 export → dist/
npm run typecheck    # 타입 검사
npx serve dist       # export 결과 확인
```
