#!/usr/bin/env bash
# 기존 312goal 사이트(저장소 루트 index.html, 옛 Supabase 프로젝트)의 member 표를 읽어
# 했냐 DB의 season_results 에 "2026 시즌 결과"로 넣는다. 다시 돌리면 최신 숫자로 덮어쓴다.
# 옛 프로젝트는 공개 읽기 키로 읽기만 한다(아무것도 바꾸지 않음).
set -euo pipefail
cd "$(dirname "$0")/.."
OLD_URL=https://zvrwumrucxyenfngpyhv.supabase.co
OLD_KEY=$(grep -o "SUPABASE_ANON_KEY = '[^']*'" ../index.html | head -1 | cut -d"'" -f2)
YEAR=${1:-2026}
rows=$(curl -sS -m 20 "$OLD_URL/rest/v1/member?select=name,current,total&order=id" -H "apikey: $OLD_KEY" -H "Authorization: Bearer $OLD_KEY")
sql=$(python3 -c '
import json,sys
year=int(sys.argv[1]); rows=json.loads(sys.argv[2])
esc=lambda t: t.replace("'"'"'","'"''"'")
vals=",".join(f"({year}, '"'"'{esc(r["name"])}'"'"', {int(r["current"])}, {int(r["total"])}, '"'"'312goal'"'"')" for r in rows)
print("insert into public.season_results (year, display_name, count, goal, source) values "+vals+
      " on conflict (year, source, display_name) do update set count = excluded.count, goal = excluded.goal, imported_at = now();")
' "$YEAR" "$rows")
bash scripts/db-apply.sh "$sql"
bash scripts/db-apply.sh "select year, display_name, count, goal, to_char(imported_at at time zone 'Asia/Seoul','MM-DD HH24:MI') as imported from public.season_results where source='312goal' order by count desc"
