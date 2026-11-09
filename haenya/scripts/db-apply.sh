#!/usr/bin/env bash
# docs/schema.sql 을 했냐 Supabase 프로젝트에 적용한다 (Supabase 관리 API).
# 사용: bash scripts/db-apply.sh            → schema.sql 전체 적용
#       bash scripts/db-apply.sh "select 1"  → SQL 한 줄 실행 (확인용)
# 인증: Claude 작업 환경에서는 프록시가 토큰을 자동으로 붙인다.
#       내 컴퓨터에서 쓸 때는 SUPABASE_ACCESS_TOKEN 에 개인 액세스 토큰(sbp_...)을 넣는다.
set -euo pipefail
cd "$(dirname "$0")/.."
REF=hfnwadutbowgxrosnypz
TOKEN="${SUPABASE_ACCESS_TOKEN:-proxy-injected}"
if [ $# -gt 0 ]; then SQL="$1"; else SQL="$(cat docs/schema.sql)"; fi
python3 -c 'import json,sys; print(json.dumps({"query": sys.stdin.read()}))' <<<"$SQL" |
  curl -sS --fail-with-body -m 120 -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data @-
echo
