\set QUIET on
\pset footer off
-- 사용자 a..n (14명)
do $$ declare c char; begin
  foreach c in array string_to_array('a,b,c,d,e,f,g,h,i,j,k,l,m,n', ',') loop
    -- 프로필은 트리거(handle_new_user)가 카카오 닉네임으로 만든다
    insert into auth.users (id, raw_user_meta_data) values (md5(c)::uuid, jsonb_build_object('name', upper(c)));
  end loop; end $$;
insert into auth.users (id) values (md5('noname')::uuid);
\echo '== 0. 첫 로그인 프로필 자동 생성'
select count(*) as "프로필 수(15)", (select nickname from profiles where id = md5('noname')::uuid) as "닉네임 없는 사람(친구)",
       (select count(*) from profiles where terms_agreed_at is null) as "약관 미동의(15)" from profiles;
create function pg_temp.as_user(c text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', md5(c), false) $$;
create function pg_temp.uid(c text) returns uuid language sql as $$
  select md5(c)::uuid $$;
create function pg_temp.try(q text) returns text language plpgsql as $$
  begin execute q; return 'ok'; exception when others then return 'ERR ' || sqlerrm; end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

\echo '== 1. 날짜 판정 (새벽 3시 기준)'
select to_check_date('2027-01-13 23:50+09') as "23:50→13", to_check_date('2027-01-14 00:10+09') as "00:10→13",
       to_check_date('2027-01-14 02:59+09') as "02:59→13", to_check_date('2027-01-14 03:00+09') as "03:00→14",
       week_start('2027-01-17') as "일→월12", week_start('2027-01-18') as "월→18";

set role authenticated;
select pg_temp.as_user('a');
select invite_code as code from create_group('운동 4인방') \gset
\echo '== 2. 그룹 만들기, 같은 사람이 또 만들기'
select pg_temp.try($$select create_group('또')$$) as "두번째 그룹 (ALREADY_IN_GROUP 기대)";

\echo '== 3. 합류 b..l → 12명, m은 거부'
select string_agg(r, ' ') from (select pg_temp.as_user(c), pg_temp.try(format('select join_group(%L)', lower(:'code'))) r
  from unnest(string_to_array('b,c,d,e,f,g,h,i,j,k,l', ',')) c) x;
select pg_temp.as_user('m');
select pg_temp.try(format('select join_group(%L)', :'code')) as "13번째 (GROUP_FULL 기대)";
select pg_temp.as_user('b');
select pg_temp.try(format('select join_group(%L)', :'code')) as "b 다시 링크 (ok 기대)";
select pg_temp.try($$select join_group('NOPE1234')$$) as "잘못된 코드";

select id as gid from groups \gset
\echo '== 4. 인증 제출'
select pg_temp.as_user('a');
select counted, date_verified, week_count, weekly_goal, season_count, season_goal
  from submit_checkin(:'gid', :'gid' || '/' || pg_temp.uid('a') || '/1.jpg', now());
select counted as "같은날 두번째 counted(false 기대)", week_count from submit_checkin(:'gid', :'gid' || '/' || pg_temp.uid('a') || '/2.jpg', now());
select pg_temp.try(format('select submit_checkin(%L, %L, now() - interval ''1 day'')', :'gid', :'gid' || '/' || pg_temp.uid('a') || '/3.jpg')) as "어제 사진";
select pg_temp.try(format('select submit_checkin(%L, %L, now())', :'gid', :'gid' || '/' || pg_temp.uid('b') || '/x.jpg')) as "남의 폴더 경로";
select pg_temp.as_user('b');
select counted, date_verified as "촬영시각 없음→verified false" from submit_checkin(:'gid', :'gid' || '/' || pg_temp.uid('b') || '/1.jpg', null);

\echo '== 5. 찌르기'
select pg_temp.as_user('a');
select * from send_nudge(:'gid', pg_temp.uid('c'));
select pg_temp.try(format('select send_nudge(%L, %L)', :'gid', pg_temp.uid('c'))) as "같은 날 또";
select pg_temp.try(format('select send_nudge(%L, %L)', :'gid', pg_temp.uid('a'))) as "자기 자신";
select pg_temp.try(format('select send_nudge(%L, %L)', :'gid', pg_temp.uid('m'))) as "그룹 밖 사람";

\echo '== 6. 권한 (RLS)'
reset role;
insert into storage.objects (bucket_id, name) values ('checkins', :'gid' || '/' || pg_temp.uid('a') || '/1.jpg');
set role authenticated;
select pg_temp.as_user('m');  -- 그룹 밖
select (select count(*) from checkins) as "m: 인증 보임(0)", (select count(*) from profiles) as "m: 프로필(본인1)",
       (select count(*) from storage.objects) as "m: 사진(0)", (select count(*) from groups) as "m: 그룹(0)";
select pg_temp.try(format('insert into checkins (group_id,user_id,check_date,photo_path,date_verified,counted) values (%L,%L,current_date,''x'',true,true)', :'gid', pg_temp.uid('m'))) as "직접 insert";
select pg_temp.try(format('insert into storage.objects (bucket_id,name) values (''checkins'', %L)', :'gid' || '/' || pg_temp.uid('m') || '/h.jpg')) as "m 사진 업로드";
select pg_temp.as_user('b');
select (select count(*) from checkins) as "b: 인증(3)", (select count(*) from storage.objects) as "b: 사진(1)";
select pg_temp.try($$update group_members set role = 'owner'$$) as "b가 role 변경";
select pg_temp.try($$update groups set name = '해킹'$$) as "b가 그룹명 변경(0행)", (select name from groups);
select pg_temp.try(format('update group_members set season_goal = 100 where user_id = %L', pg_temp.uid('b'))) as "b 연간목표 수정",
       (select season_goal from group_members where user_id = pg_temp.uid('b'));
select pg_temp.try(format('insert into storage.objects (bucket_id,name) values (''checkins'', %L)', :'gid' || '/' || pg_temp.uid('a') || '/fake.jpg')) as "b가 a 폴더에 업로드";
select pg_temp.try(format('insert into reactions (checkin_id,user_id,emoji) select id, %L, ''fire'' from checkins limit 1', pg_temp.uid('b'))) as "b 반응";

\echo '== 7. 집계 (c: 최근 5주 매주 3회 / d: 지난주만 3회 / 이번 주 미달성)'
reset role;
insert into checkins (group_id,user_id,check_date,photo_path,date_verified,counted)
select :'gid', pg_temp.uid('c'), week_start(haenya_today()) - 7*w + dd, 'p', true, true
  from generate_series(1,5) w, generate_series(0,2) dd;
insert into checkins (group_id,user_id,check_date,photo_path,date_verified,counted)
select :'gid', pg_temp.uid('d'), week_start(haenya_today()) - 7 + dd, 'p', true, true from generate_series(0,2) dd;
update group_members set joined_at = now() - interval '60 days';
set role authenticated;
select pg_temp.as_user('a');
select nickname, is_me, week_count, season_count, days_silent, streak_weeks, rank_weeks, rank
  from group_week_board(:'gid') where nickname in ('A','B','C','D','E');
select * from my_stats(:'gid');
select count(*) as "my_weeks 행", sum(case when is_current then 1 else 0 end) as "이번 주" from my_weeks(:'gid');
select * from group_week_summary(:'gid');
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
\echo '== 8. 초대 미리보기 (비로그인)'
select * from get_invite_preview(:'code');
select pg_temp.try(format('select join_group(%L)', :'code')) as "anon 합류 시도";

\echo '== 9. 랭킹 B안 (최근 4주 중 채운 주 수) — 호·고은·민지·성우 예시'
reset role;
delete from checkins where user_id in (pg_temp.uid('c'), pg_temp.uid('d'), pg_temp.uid('e'), pg_temp.uid('f'));
update profiles set nickname = case id when pg_temp.uid('c') then '호' when pg_temp.uid('d') then '고은'
  when pg_temp.uid('e') then '민지' when pg_temp.uid('f') then '성우' else nickname end;
-- 주별 횟수: 4주 전, 3주 전, 2주 전, 지난주, 이번 주
insert into checkins (group_id,user_id,check_date,photo_path,date_verified,counted)
select :'gid', pg_temp.uid(u), week_start(haenya_today()) - 7 * (4 - wi) + dd, 'p', true, true
from (values ('c', array[3,4,3,3,3]), ('d', array[1,3,3,3,1]), ('e', array[0,0,3,3,0]), ('f', array[3,3,3,2,2])) v(u, cnts),
     generate_series(0, 4) wi, generate_series(0, 6) dd
where dd < cnts[wi + 1];
set role authenticated;
select pg_temp.as_user('a');
select rank as "순위", nickname as "이름", rank_weeks as "최근4주 채운 주(기대: 호4 성우3 고은3 민지2)",
       season_count as "시즌 누적", week_count as "이번 주"
from group_week_board(:'gid') where nickname in ('호','고은','민지','성우');
