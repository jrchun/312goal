-- 로컬 Postgres에서 schema.sql 검증용. Supabase의 역할·auth·storage를 흉내 낸다.
-- 먼저 클러스터에 역할이 있어야 한다: create role anon nologin; create role authenticated nologin;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create extension pgcrypto;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create schema storage; grant usage on schema storage to authenticated;
create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text);
alter table storage.objects enable row level security;
grant all on storage.objects to authenticated;
