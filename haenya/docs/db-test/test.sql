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

\echo '== 10. 인증 삭제 → 같은 날 다음 사진이 인정으로'
reset role;
select id as gid2 from groups limit 1 \gset
insert into checkins (group_id,user_id,check_date,photo_path,date_verified,counted,created_at) values
  (:'gid', pg_temp.uid('e'), haenya_today(), 'p1', true, true,  now() - interval '2 minutes'),
  (:'gid', pg_temp.uid('e'), haenya_today(), 'p2', true, false, now() - interval '1 minutes');
set role authenticated; select pg_temp.as_user('e');
delete from checkins where photo_path = 'p1';
reset role;
select photo_path, counted as "p2 인정(t 기대)" from checkins where user_id = pg_temp.uid('e') and check_date = haenya_today();

\echo '== 11. 내부 함수는 일반 사용자가 못 부른다'
set role authenticated; select pg_temp.as_user('m');
select pg_temp.try(format('select delete_user_account(%L)', pg_temp.uid('a'))) as "남의 계정 삭제 시도",
       pg_temp.try(format('select release_membership(%L, %L)', pg_temp.uid('a'), :'gid')) as "남을 그룹에서 빼기 시도",
       pg_temp.try($$select kakao_unlink_target('x')$$) as "웹훅 함수 직접 호출";

\echo '== 12. 그룹장 나가기 → 다음 멤버가 그룹장'
select pg_temp.as_user('a');
select pg_temp.try(format('select leave_group(%L)', :'gid')) as "a 나가기";
reset role;
select p.nickname as "새 그룹장", m.role from groups g join profiles p on p.id = g.owner_id join group_members m on m.user_id = g.owner_id and m.group_id = g.id;
select count(*) as "a의 인증 남은 수(0)" from checkins where user_id = pg_temp.uid('a');

\echo '== 13. 회원 탈퇴 (b = 지금 그룹장) → 프로필·기록 삭제, 그룹장 넘어감'
set role authenticated; select pg_temp.as_user('b');
select pg_temp.try('select delete_my_account()') as "b 탈퇴";
reset role;
select (select count(*) from auth.users where id = pg_temp.uid('b')) as "b auth(0)",
       (select count(*) from profiles where id = pg_temp.uid('b')) as "b 프로필(0)",
       (select count(*) from checkins where user_id = pg_temp.uid('b')) as "b 인증(0)",
       (select p.nickname from groups g join profiles p on p.id = g.owner_id) as "새 그룹장";

\echo '== 14. 혼자 남은 그룹에서 나가면 그룹 삭제'
insert into auth.users (id, raw_user_meta_data) values (md5('solo')::uuid, '{"name":"솔로"}');
set role authenticated; select set_config('request.jwt.claim.sub', md5('solo'), false);
select id as solo_gid from create_group('혼자방') \gset
select pg_temp.try(format('select leave_group(%L)', :'solo_gid')) as "솔로 나가기";
reset role;
select count(*) as "혼자방 남음(0)" from groups where name = '혼자방';

\echo '== 15. 웹훅용 함수 (service_role)'
set role service_role;
select user_id is not null as "찾음", cardinality(photo_paths) >= 0 as ok from kakao_unlink_target('nobody');
select count(*) as "없는 카카오 id → 0행" from kakao_unlink_target('nobody');

\echo '== 16. 기기 등록: 성/이름 + 4자리 되찾기'
reset role;
insert into auth.users (id, raw_user_meta_data, email) values
  (md5('dev1')::uuid, '{"name":"천성우","family_name":"천","given_name":"성우"}', 'aaa@users.haenya.app'),
  (md5('dev2')::uuid, '{"name":"김민지","family_name":"김","given_name":"민지"}', 'bbb@users.haenya.app');
select nickname, family_name, given_name from profiles where id in (md5('dev1')::uuid, md5('dev2')::uuid) order by nickname;
set role authenticated; select set_config('request.jwt.claim.sub', md5('dev1'), false);
update profiles set terms_agreed_at = now() where id = md5('dev1')::uuid;
select invite_code as dcode, id as dgid from create_group('기기방') \gset
select pg_temp.try($$select set_my_pin('12a4')$$) as "잘못된 숫자 형식", pg_temp.try($$select set_my_pin('1234')$$) as "숫자 정하기";
select * from my_pin_status();
select pg_temp.try('select * from user_pins') as "숫자 표 직접 읽기";
select set_config('request.jwt.claim.sub', md5('dev2'), false);
select pg_temp.try(format('select join_group(%L)', :'dcode')) as "민지 합류", pg_temp.try($$select set_my_pin('9999')$$) as "민지 숫자";
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select display_name, given_name, can_pin from restore_candidates(lower(:'dcode'));
select * from verify_pin(md5('dev1')::uuid, '1234') as "맞는 숫자";
select status from verify_pin(md5('dev1')::uuid, '0000') as "틀린 숫자";
select string_agg(status, ' ') as "4번 더 틀림 → 마지막은 잠금 전" from (select (verify_pin(md5('dev1')::uuid, '0000')).status from generate_series(1,4)) x;
select status as "잠긴 뒤 맞는 숫자(LOCKED)" from verify_pin(md5('dev1')::uuid, '1234');
set role authenticated; select set_config('request.jwt.claim.sub', md5('dev2'), false);
select pg_temp.try(format('select reset_member_pin(%L, %L)', :'dgid', md5('dev1'))) as "그룹장 아닌 사람이 초기화";
select set_config('request.jwt.claim.sub', md5('dev1'), false);
select reset_member_pin(:'dgid', md5('dev2')::uuid) as temp_pin \gset
select length(:'temp_pin') as "임시 숫자 길이(4)";
reset role; set role anon;
select status as "민지 임시 숫자로 되찾기" from verify_pin(md5('dev2')::uuid, :'temp_pin');
reset role; set role authenticated; select set_config('request.jwt.claim.sub', md5('dev2'), false);
select is_temp as "임시 표시(t)" from my_pin_status();
select pg_temp.try($$select set_my_pin('2468')$$) as "새 숫자", (select is_temp from my_pin_status()) as "임시 해제(f)";
select nickname as "보드에는 이름만" from group_week_board(:'dgid') order by 1;

\echo '== 17. 1회용 이어가기 열쇠'
reset role; set role authenticated; select set_config('request.jwt.claim.sub', md5('dev1'), false);
select create_transfer_token() as tok \gset
select length(:'tok') as "열쇠 길이(48)";
select pg_temp.try('select * from transfer_tokens') as "열쇠 표 직접 읽기";
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select * from redeem_transfer_token(:'tok') as "첫 사용";
select status as "두 번째 사용(INVALID)" from redeem_transfer_token(:'tok');
select status as "없는 열쇠(INVALID)" from redeem_transfer_token('nope');
reset role; update transfer_tokens set expires_at = now() - interval '1 minute';
set role authenticated; select set_config('request.jwt.claim.sub', md5('dev1'), false);
select create_transfer_token() as tok2 \gset
reset role; update transfer_tokens set expires_at = now() - interval '1 second' where token_hash = encode(digest(:'tok2','sha256'),'hex');
set role anon;
select status as "만료된 열쇠(INVALID)" from redeem_transfer_token(:'tok2');
