#!/usr/bin/env bash
# 로컬 Postgres(16)로 docs/schema.sql 을 검증한다. 사용: PGHOST=... PGPORT=... PGUSER=postgres bash docs/db-test/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
psql -X -q -c "drop database if exists haenya_test" -c "create database haenya_test"
psql -X -q -c "do \$\$ begin create role anon nologin; exception when duplicate_object then null; end \$\$" \
           -c "do \$\$ begin create role authenticated nologin; exception when duplicate_object then null; end \$\$" \
           -c "do \$\$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end \$\$"
psql -X -q -v ON_ERROR_STOP=1 -d haenya_test -f docs/db-test/supabase-stub.sql
psql -X -q -v ON_ERROR_STOP=1 -d haenya_test -f docs/schema.sql 2>&1 | grep -v NOTICE || true
psql -X -d haenya_test -f docs/db-test/test.sql
