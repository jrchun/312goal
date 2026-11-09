-- =====================================================================
-- 했냐 DB 스키마 (STAGE 2)
-- Supabase 대시보드 → SQL Editor → New query 에 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전하도록 if not exists / or replace 를 썼다.
--
-- 규칙
--  · 시간대는 Asia/Seoul, 하루 기준은 새벽 3시 (03:00 이전은 전날).
--  · 한 주는 월요일 시작. 주 판정도 인정 날짜(check_date) 기준이라
--    월요일 00:00~02:59 인증은 지난주 일요일로 들어간다.
--  · 비즈니스 규칙(하루 1회, 날짜 판정, 찌르기 제한, 12명 제한)은
--    전부 이 파일의 함수·제약·RLS에 있다. 앱은 함수만 부른다.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. 날짜 도우미
-- ---------------------------------------------------------------------

-- 시각 → 인정 날짜 (한국 시간, 새벽 3시 이전은 전날)
create or replace function public.to_check_date(ts timestamptz)
returns date language sql immutable as $$
  select ((ts at time zone 'Asia/Seoul') - interval '3 hours')::date
$$;

-- 지금의 인정 날짜
create or replace function public.haenya_today()
returns date language sql stable as $$
  select public.to_check_date(now())
$$;

-- 날짜가 속한 주의 월요일
create or replace function public.week_start(d date)
returns date language sql immutable as $$
  select (d - (extract(isodow from d)::int - 1))
$$;

-- ---------------------------------------------------------------------
-- 2. 테이블
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  nickname        text not null check (char_length(nickname) between 1 and 20),
  avatar_url      text,
  terms_agreed_at timestamptz,          -- 약관·개인정보 동의 시각 (null이면 동의 화면)
  created_at      timestamptz not null default now()
);

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 20),
  invite_code text not null unique,
  weekly_goal int  not null default 3   check (weekly_goal between 1 and 7),
  season_goal int  not null default 150 check (season_goal between 1 and 366),
  category    text not null default 'workout',
  owner_id    uuid not null references public.profiles (id),
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id    uuid not null references public.groups (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  season_goal int  not null default 150 check (season_goal between 1 and 366),
  role        text not null default 'member' check (role in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);
-- MVP: 한 사람은 한 그룹만. (2분기 "여러 그룹 동시 참여" 때 이 인덱스를 지운다)
create unique index if not exists group_members_one_group_per_user
  on public.group_members (user_id);

create table if not exists public.seasons (
  id        serial primary key,
  year      int  not null unique,
  starts_on date not null,
  ends_on   date not null
);
insert into public.seasons (year, starts_on, ends_on) values
  (2026, '2026-01-01', '2026-12-31'),
  (2027, '2027-01-01', '2027-12-31')
on conflict (year) do nothing;

create table if not exists public.checkins (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  check_date    date not null,               -- 인정 날짜
  photo_path    text not null,               -- storage: checkins/{group_id}/{user_id}/{uuid}.jpg
  taken_at      timestamptz,                 -- 사진 촬영 시각 (EXIF). 없으면 null
  date_verified boolean not null,            -- false면 "날짜 미확인"
  counted       boolean not null,            -- 횟수 인정 여부 (같은 날 두 번째부터 false)
  created_at    timestamptz not null default now()
);
-- 같은 사람·같은 그룹·같은 날 인정은 1건만 (동시에 두 번 눌러도 막힘)
create unique index if not exists checkins_one_counted_per_day
  on public.checkins (group_id, user_id, check_date) where counted;
create index if not exists checkins_group_date on public.checkins (group_id, check_date);

create table if not exists public.reactions (
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  emoji      text not null check (emoji in ('fire', 'muscle', 'clap', 'laugh')), -- 4종, 화면에서 그림으로 바꿔 보여준다
  created_at timestamptz not null default now(),
  primary key (checkin_id, user_id, emoji)
);

create table if not exists public.nudges (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  from_user  uuid not null references public.profiles (id) on delete cascade,
  to_user    uuid not null references public.profiles (id) on delete cascade,
  nudge_date date not null default public.haenya_today(),
  created_at timestamptz not null default now(),
  check (from_user <> to_user),
  unique (from_user, to_user, nudge_date)   -- 같은 사람에게 하루 1회
);
create index if not exists nudges_group_date on public.nudges (group_id, nudge_date);

-- 앱 단계(푸시 알림)용 자리
create table if not exists public.push_tokens (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  token      text not null,
  platform   text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- 첫 로그인 때 profiles 행을 자동으로 만든다 (카카오 닉네임·프로필 사진).
-- 약관 동의 전이라 terms_agreed_at 은 비워둔다 → 앱이 동의 화면을 보여준다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
                  nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                  nullif(trim(new.raw_user_meta_data ->> 'preferred_username'), ''),
                  '친구'), 20),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. 권한 도우미 (RLS 안에서 쓰므로 security definer)
-- ---------------------------------------------------------------------

create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members where group_id = gid and user_id = auth.uid()
  )
$$;

create or replace function public.shares_group(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

-- storage 경로 "{group_id}/{user_id}/파일" 의 첫 폴더를 안전하게 uuid로 (형식이 틀리면 null)
create or replace function public.path_group_id(path text)
returns uuid language plpgsql immutable as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when others then
  return null;
end $$;

-- ---------------------------------------------------------------------
-- 4. 12명 제한 (트리거: 어떤 경로로 넣어도 막힘)
-- ---------------------------------------------------------------------

create or replace function public.enforce_group_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- 그룹 행을 잠가 동시에 합류해도 12명을 넘지 않게 한다
  perform 1 from public.groups where id = new.group_id for update;
  if (select count(*) from public.group_members where group_id = new.group_id) >= 12 then
    raise exception 'GROUP_FULL' using hint = '그룹은 최대 12명';
  end if;
  return new;
end $$;

drop trigger if exists group_capacity on public.group_members;
create trigger group_capacity before insert on public.group_members
  for each row execute function public.enforce_group_capacity();

-- ---------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.seasons       enable row level security;
alter table public.checkins      enable row level security;
alter table public.reactions     enable row level security;
alter table public.nudges        enable row level security;
alter table public.push_tokens   enable row level security;

-- 수정 가능한 컬럼을 좁힌다 (예: 본인 role, 그룹 invite_code는 못 바꿈)
revoke insert, update, delete on public.profiles, public.groups, public.group_members,
  public.seasons, public.checkins, public.reactions, public.nudges, public.push_tokens
  from anon, authenticated;
grant insert (id, nickname, avatar_url, terms_agreed_at) on public.profiles to authenticated;
grant update (nickname, avatar_url, terms_agreed_at)     on public.profiles to authenticated;
grant update (name, weekly_goal, season_goal)            on public.groups to authenticated;
grant update (season_goal)                               on public.group_members to authenticated;
grant delete                                             on public.group_members to authenticated;
grant delete                                             on public.checkins to authenticated;
grant insert, delete                                     on public.reactions to authenticated;
grant insert, update, delete                             on public.push_tokens to authenticated;

-- profiles: 본인 + 같은 그룹 멤버 조회, 본인만 생성·수정
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group(id));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- groups: 멤버 조회, 그룹장 수정. 생성은 create_group() 함수로만
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated
  using (public.is_group_member(id));
drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- group_members: 같은 그룹 조회, 본인 행만 수정(연간 목표)·삭제(나가기). 합류는 join_group()으로만
drop policy if exists members_select on public.group_members;
create policy members_select on public.group_members for select to authenticated
  using (public.is_group_member(group_id));
drop policy if exists members_update on public.group_members;
create policy members_update on public.group_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists members_delete on public.group_members;
create policy members_delete on public.group_members for delete to authenticated
  using (user_id = auth.uid());

-- seasons: 누구나 조회
drop policy if exists seasons_select on public.seasons;
create policy seasons_select on public.seasons for select to anon, authenticated using (true);

-- checkins: 같은 그룹 조회, 본인만 삭제. 생성은 submit_checkin()으로만
drop policy if exists checkins_select on public.checkins;
create policy checkins_select on public.checkins for select to authenticated
  using (public.is_group_member(group_id));
drop policy if exists checkins_delete on public.checkins;
create policy checkins_delete on public.checkins for delete to authenticated
  using (user_id = auth.uid());

-- reactions: 같은 그룹 조회, 본인만 생성·삭제
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions for select to authenticated
  using (exists (select 1 from public.checkins c
                 where c.id = checkin_id and public.is_group_member(c.group_id)));
drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.checkins c where c.id = checkin_id and public.is_group_member(c.group_id)));
drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- nudges: 같은 그룹 조회. 생성은 send_nudge()로만
drop policy if exists nudges_select on public.nudges;
create policy nudges_select on public.nudges for select to authenticated
  using (public.is_group_member(group_id));

-- push_tokens: 본인 것만
drop policy if exists push_tokens_own on public.push_tokens;
create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6. 그룹 만들기 · 초대 미리보기 · 합류
-- ---------------------------------------------------------------------

-- 그룹 만들기: 그룹 생성 + 만든 사람을 그룹장으로 합류. 초대 코드 반환
create or replace function public.create_group(
  p_name text, p_weekly_goal int default 3, p_season_goal int default 150
) returns public.groups
language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  code text;
begin
  if auth.uid() is null then raise exception 'NOT_LOGGED_IN'; end if;
  if exists (select 1 from public.group_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_GROUP';
  end if;
  loop
    -- 헷갈리는 글자(0 O 1 I L)를 뺀 8자리
    select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + floor(random() * 31)::int, 1), '')
      into code from generate_series(1, 8);
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;

  insert into public.groups (name, invite_code, weekly_goal, season_goal, owner_id)
  values (p_name, code, p_weekly_goal, p_season_goal, auth.uid())
  returning * into g;

  insert into public.group_members (group_id, user_id, season_goal, role)
  values (g.id, auth.uid(), p_season_goal, 'owner');
  return g;
end $$;

-- 초대 랜딩용 미리보기: 로그인 전에도 볼 수 있음 (그룹명·인원·이번 주 합계만)
-- (돌려주는 칸이 바뀌어서 지우고 다시 만든다)
drop function if exists public.get_invite_preview(text);
create or replace function public.get_invite_preview(p_code text)
returns table (group_name text, owner_nickname text, member_count int, weekly_goal int,
               week_total int, week_target int, season_year int, is_full boolean)
language sql stable security definer set search_path = public as $$
  select g.name,
         (select p.nickname from public.profiles p where p.id = g.owner_id),
         m.cnt,
         g.weekly_goal,
         (select count(*)::int from public.checkins c
           where c.group_id = g.id and c.counted
             and c.check_date >= public.week_start(public.haenya_today())),
         g.weekly_goal * m.cnt,
         extract(year from public.haenya_today())::int,
         m.cnt >= 12
  from public.groups g
  cross join lateral (select count(*)::int as cnt from public.group_members where group_id = g.id) m
  where g.invite_code = upper(trim(p_code))
$$;

-- 합류: 초대 코드로. 이미 그 그룹이면 그대로 성공(링크 다시 눌러도 괜찮게)
create or replace function public.join_group(p_code text)
returns public.groups
language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
begin
  if auth.uid() is null then raise exception 'NOT_LOGGED_IN'; end if;
  select * into g from public.groups where invite_code = upper(trim(p_code));
  if not found then raise exception 'INVALID_CODE'; end if;
  if exists (select 1 from public.group_members where group_id = g.id and user_id = auth.uid()) then
    return g;
  end if;
  if exists (select 1 from public.group_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_GROUP';
  end if;
  insert into public.group_members (group_id, user_id, season_goal)
  values (g.id, auth.uid(), g.season_goal);   -- 트리거가 12명 초과를 막는다 (GROUP_FULL)
  return g;
end $$;

-- ---------------------------------------------------------------------
-- 7. 인증 제출
-- ---------------------------------------------------------------------
-- 앱 순서: 사진 촬영시각 읽기 → 압축 → storage 업로드 → submit_checkin 호출.
-- 거절(PHOTO_NOT_TODAY)되면 앱이 올린 사진을 지운다.
-- 반환: 인정 날짜, 인정 여부, 날짜 확인 여부, 이번 주 n/목표, 시즌 누적

create or replace function public.submit_checkin(
  p_group_id uuid, p_photo_path text, p_taken_at timestamptz default null
) returns table (checkin_id uuid, check_date date, counted boolean, date_verified boolean,
                 week_count int, weekly_goal int, season_count int, season_goal int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  d date := public.haenya_today();
  verified boolean := p_taken_at is not null;
  is_counted boolean;
  new_id uuid;
begin
  if uid is null then raise exception 'NOT_LOGGED_IN'; end if;
  if not public.is_group_member(p_group_id) then raise exception 'NOT_A_MEMBER'; end if;
  if p_photo_path not like p_group_id::text || '/' || uid::text || '/%' then
    raise exception 'BAD_PHOTO_PATH';
  end if;

  -- 촬영 시각이 있으면 인정 날짜와 같은 날이어야 한다
  if verified and public.to_check_date(p_taken_at) <> d then
    raise exception 'PHOTO_NOT_TODAY' using hint = '오늘 찍은 사진만 된다.';
  end if;

  is_counted := not exists (
    select 1 from public.checkins c
    where c.group_id = p_group_id and c.user_id = uid and c.check_date = d and c.counted);

  begin
    insert into public.checkins (group_id, user_id, check_date, photo_path, taken_at, date_verified, counted)
    values (p_group_id, uid, d, p_photo_path, p_taken_at, verified, is_counted)
    returning id into new_id;
  exception when unique_violation then
    -- 거의 동시에 두 번 올린 경우: 두 번째는 사진만 저장
    is_counted := false;
    insert into public.checkins (group_id, user_id, check_date, photo_path, taken_at, date_verified, counted)
    values (p_group_id, uid, d, p_photo_path, p_taken_at, verified, false)
    returning id into new_id;
  end;

  return query
  select new_id, d, is_counted, verified,
         (select count(*)::int from public.checkins c
           where c.group_id = p_group_id and c.user_id = uid and c.counted
             and c.check_date >= public.week_start(d)),
         g.weekly_goal,
         (select count(*)::int from public.checkins c
           where c.group_id = p_group_id and c.user_id = uid and c.counted
             and extract(year from c.check_date) = extract(year from d)),
         gm.season_goal
  from public.groups g
  join public.group_members gm on gm.group_id = g.id and gm.user_id = uid
  where g.id = p_group_id;
end $$;

-- ---------------------------------------------------------------------
-- 8. 찌르기
-- ---------------------------------------------------------------------
-- 같은 사람에게 하루 1회. 성공하면 재촉 카드에 넣을 정보를 돌려준다.

create or replace function public.send_nudge(p_group_id uuid, p_to_user uuid)
returns table (to_nickname text, week_count int, weekly_goal int, days_silent int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  d date := public.haenya_today();
begin
  if uid is null then raise exception 'NOT_LOGGED_IN'; end if;
  if p_to_user = uid then raise exception 'CANNOT_NUDGE_SELF'; end if;
  if not public.is_group_member(p_group_id) then raise exception 'NOT_A_MEMBER'; end if;
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = p_to_user) then
    raise exception 'TARGET_NOT_IN_GROUP';
  end if;

  insert into public.nudges (group_id, from_user, to_user, nudge_date)
  values (p_group_id, uid, p_to_user, d)
  on conflict (from_user, to_user, nudge_date) do nothing;
  if not found then raise exception 'ALREADY_NUDGED' using hint = '오늘은 이미 찔렀다.'; end if;

  return query
  select b.nickname, b.week_count, b.weekly_goal, b.days_silent
  from public.group_week_board(p_group_id) b
  where b.user_id = p_to_user;
end $$;

-- ---------------------------------------------------------------------
-- 9. 집계 (화면용)
-- ---------------------------------------------------------------------
-- 아래 함수는 security invoker 라서 RLS가 그대로 적용된다(다른 그룹은 빈 결과).

-- 주별 달성 표: 멤버 × 주 (그룹 가입 주부터)
create or replace function public.member_weeks(p_group_id uuid, p_from date, p_to date)
returns table (user_id uuid, week date, cnt int, achieved boolean)
language sql stable as $$
  select m.user_id, w.week::date,
         count(c.id)::int,
         count(c.id) >= g.weekly_goal
  from public.group_members m
  join public.groups g on g.id = m.group_id
  cross join generate_series(public.week_start(p_from), public.week_start(p_to), interval '7 days') w(week)
  left join public.checkins c
    on c.group_id = m.group_id and c.user_id = m.user_id and c.counted
   and c.check_date >= w.week::date and c.check_date < w.week::date + 7
  where m.group_id = p_group_id
  group by m.user_id, w.week, g.weekly_goal
$$;

-- 홈·그룹 화면용 멤버 보드 (이번 주 기준)
--  streak_weeks: 연속 달성 주 수. 이번 주를 이미 달성했으면 이번 주부터, 아니면 지난주부터 거꾸로 센다.
--  rank_weeks:   랭킹 기준 = 최근 4주(4주 전 ~ 지난주, 끝난 주만) 중 주간 목표를 채운 주 수 (0~4).
--                연속이 아니어도 된다. 이번 주는 진행 중이라 넣지 않는다. 같으면 시즌 누적이 많은 쪽이 위.
--                (사용자 결정 2026-11-09: "연속 달성" 대신 이 방식, B안)
--  days_silent:  마지막 인정 인증 이후 지난 날 수 (인증이 없으면 가입일부터). 3 이상이면 찌르기 대상
create or replace function public.group_week_board(p_group_id uuid)
returns table (user_id uuid, nickname text, avatar_url text, is_me boolean,
               week_count int, weekly_goal int, season_count int, season_goal int,
               last_check_date date, days_silent int, streak_weeks int, rank_weeks int, rank int)
language sql stable as $$
  with today as (select public.haenya_today() as d),
  weeks as (
    select mw.* from today,
      public.member_weeks(p_group_id, (select d from today) - 7 * 60, (select d from today)) mw
  ),
  streak as (
    select s.user_id, count(*)::int as streak_weeks
    from (
      select w.user_id, w.week, w.achieved,
             -- 이번 주 미달성은 건너뛰고, 처음 미달성 주가 나오기 전까지 센다
             bool_and(w.achieved) over (partition by w.user_id order by w.week desc) as still
      from weeks w, today
      where not (w.week = public.week_start(today.d) and not w.achieved)
    ) s
    where s.still
    group by s.user_id
  ),
  recent4 as (
    select w.user_id, count(*) filter (where w.achieved)::int as recent4_weeks
    from weeks w, today
    where w.week >= public.week_start(today.d) - 28 and w.week < public.week_start(today.d)
    group by w.user_id
  ),
  base as (
    select m.user_id, p.nickname, p.avatar_url, m.user_id = auth.uid() as is_me,
           coalesce((select w.cnt from weeks w, today
                      where w.user_id = m.user_id and w.week = public.week_start(today.d)), 0) as week_count,
           g.weekly_goal,
           (select count(*)::int from public.checkins c, today
             where c.group_id = m.group_id and c.user_id = m.user_id and c.counted
               and extract(year from c.check_date) = extract(year from today.d)) as season_count,
           m.season_goal,
           (select max(c.check_date) from public.checkins c
             where c.group_id = m.group_id and c.user_id = m.user_id and c.counted) as last_check_date,
           public.to_check_date(m.joined_at) as joined_date,
           coalesce(s.streak_weeks, 0) as streak_weeks,
           coalesce(r.recent4_weeks, 0) as recent4_weeks
    from public.group_members m
    join public.groups g on g.id = m.group_id
    join public.profiles p on p.id = m.user_id
    left join streak s on s.user_id = m.user_id
    left join recent4 r on r.user_id = m.user_id
    where m.group_id = p_group_id
  )
  select b.user_id, b.nickname, b.avatar_url, b.is_me, b.week_count, b.weekly_goal,
         b.season_count, b.season_goal, b.last_check_date,
         ((select d from today) - coalesce(b.last_check_date, b.joined_date))::int as days_silent,
         b.streak_weeks,
         b.recent4_weeks as rank_weeks,
         rank() over (order by b.recent4_weeks desc, b.season_count desc)::int as rank
  from base b
  order by rank, b.nickname
$$;

-- 마이 화면: 시즌 누적, 연말 예측, 찌른·찔린 횟수
create or replace function public.my_stats(p_group_id uuid)
returns table (season_year int, season_count int, season_goal int, projected int,
               streak_weeks int, nudges_sent int, nudges_received int)
language sql stable as $$
  with t as (select public.haenya_today() as d),
  s as (select * from public.seasons, t where year = extract(year from t.d)),
  me as (select * from public.group_week_board(p_group_id) where is_me)
  select extract(year from t.d)::int,
         me.season_count,
         me.season_goal,
         -- 현재 속도로 연말까지: 누적 / 경과일 × 시즌 전체 일수
         round(me.season_count::numeric
               / greatest(1, t.d - coalesce(s.starts_on, date_trunc('year', t.d)::date) + 1)
               * (coalesce(s.ends_on, (date_trunc('year', t.d) + interval '1 year - 1 day')::date)
                  - coalesce(s.starts_on, date_trunc('year', t.d)::date) + 1))::int,
         me.streak_weeks,
         (select count(*)::int from public.nudges n where n.group_id = p_group_id and n.from_user = auth.uid()
            and extract(year from n.nudge_date) = extract(year from t.d)),
         (select count(*)::int from public.nudges n where n.group_id = p_group_id and n.to_user = auth.uid()
            and extract(year from n.nudge_date) = extract(year from t.d))
  from t cross join me left join s on true
$$;

-- 마이 화면 52주 칸: 내 주별 기록 (그 해 첫 월요일 ~ 이번 주)
create or replace function public.my_weeks(p_group_id uuid, p_year int default null)
returns table (week date, cnt int, achieved boolean, is_current boolean)
language sql stable as $$
  with t as (select public.haenya_today() as d,
                    coalesce(p_year, extract(year from public.haenya_today())::int) as y)
  select mw.week, mw.cnt, mw.achieved, mw.week = public.week_start(t.d)
  from t, public.member_weeks(
         p_group_id,
         make_date(t.y, 1, 1),
         least(t.d, make_date(t.y, 12, 31))) mw
  where mw.user_id = auth.uid() and extract(isoyear from mw.week) = t.y
  order by mw.week
$$;

-- 주간 결산 (월요일 홈·주간 결산 스토리 카드): 기본은 지난주
create or replace function public.group_week_summary(p_group_id uuid, p_week date default null)
returns table (week date, group_total int, group_target int, achieved_members int,
               member_count int, nudge_count int)
language sql stable as $$
  with w as (select coalesce(public.week_start(p_week), public.week_start(public.haenya_today()) - 7) as wk),
  mw as (select * from w, public.member_weeks(p_group_id, w.wk, w.wk))
  select w.wk,
         coalesce((select sum(cnt)::int from mw), 0),
         (select g.weekly_goal from public.groups g where g.id = p_group_id) * (select count(*)::int from mw),
         (select count(*)::int from mw where achieved),
         (select count(*)::int from mw),
         (select count(*)::int from public.nudges n
           where n.group_id = p_group_id and n.nudge_date >= w.wk and n.nudge_date < w.wk + 7)
  from w
$$;

-- ---------------------------------------------------------------------
-- 10. 함수 실행 권한
-- ---------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.create_group(text, int, int),
  public.join_group(text),
  public.submit_checkin(uuid, text, timestamptz),
  public.send_nudge(uuid, uuid),
  public.member_weeks(uuid, date, date),
  public.group_week_board(uuid),
  public.my_stats(uuid),
  public.my_weeks(uuid, int),
  public.group_week_summary(uuid, date),
  public.is_group_member(uuid),
  public.shares_group(uuid),
  public.path_group_id(text),
  public.haenya_today(),
  public.to_check_date(timestamptz),
  public.week_start(date)
to authenticated;
grant execute on function public.get_invite_preview(text), public.haenya_today(),
  public.to_check_date(timestamptz), public.week_start(date)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- 11. 사진 저장소 (비공개 버킷)
-- ---------------------------------------------------------------------
-- 경로: {group_id}/{user_id}/{uuid}.jpg  · 같은 그룹 멤버만 읽기 · 본인 폴더에만 올리기·지우기

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkins', 'checkins', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists checkins_photos_select on storage.objects;
create policy checkins_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'checkins' and public.is_group_member(public.path_group_id(name)));

drop policy if exists checkins_photos_insert on storage.objects;
create policy checkins_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'checkins'
              and public.is_group_member(public.path_group_id(name))
              and split_part(name, '/', 2) = auth.uid()::text);

drop policy if exists checkins_photos_delete on storage.objects;
create policy checkins_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'checkins' and split_part(name, '/', 2) = auth.uid()::text);
