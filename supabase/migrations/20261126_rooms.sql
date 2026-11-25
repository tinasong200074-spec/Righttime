-- 친구 약속 방(명세 12.1, 12.2). 기기 계정(익명 로그인)의 auth.uid()로 "누구인지"를 안다.
-- 표는 직접 드나들 수 없고(RLS, 정책 없음) 아래 함수로만 쓴다. 함수는 로그인한 사용자만 부를 수 있다.
-- 위치, 알람 미루기, 개인 기록을 담는 칸은 일부러 만들지 않았다.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  owner uuid not null,
  title text not null default '' check (char_length(title) <= 40),
  arrive_ms bigint not null,
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null,
  name text not null check (char_length(name) between 1 and 20),
  sharing boolean not null default true, -- 끄면 상대에게 상태가 보이지 않는다
  stage text check (stage in ('woke', 'prep', 'depart', 'travel', 'arrived')),
  step_idx int check (step_idx between 0 and 50),
  step_count int check (step_count between 1 and 50),
  eta_ms bigint,
  late_min int check (late_min between 0 and 1440),
  message text check (char_length(message) <= 200), -- 직접 알린 문구(준비 단계는 넣지 않는다)
  cheer text check (char_length(cheer) <= 40), -- 상대가 보낸 안심 메시지
  cheer_from text,
  cheer_at timestamptz,
  result text check (result in ('kept', 'late')), -- 약속이 끝난 뒤 남는 것은 이것뿐
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user on public.room_members (user_id);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

-- 헷갈리는 글자(0, O, 1, I)를 뺀 6자 코드
create or replace function public.room_new_code() returns text
language sql volatile set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6);
$$;

create or replace function public.room_create(p_name text, p_title text, p_arrive_ms bigint) returns json
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  insert into public.rooms (code, owner, title, arrive_ms)
  values (public.room_new_code(), v_uid, left(coalesce(p_title, ''), 40), p_arrive_ms)
  returning * into v_room;
  insert into public.room_members (room_id, user_id, name) values (v_room.id, v_uid, left(p_name, 20));
  return json_build_object('roomId', v_room.id, 'code', v_room.code);
end;
$$;

-- 코드로 들어간다. 들어가는 것이 곧 "서로 보여 주기"에 동의하는 것이다. 방은 6명까지
create or replace function public.room_join(p_code text, p_name text) returns json
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  select * into v_room from public.rooms where code = upper(p_code);
  if not found then return null; end if;
  if to_timestamp(v_room.arrive_ms / 1000.0) < now() - interval '1 hour' then return null; end if;
  if (select count(*) from public.room_members where room_id = v_room.id and user_id <> v_uid) >= 6 then return null; end if;
  insert into public.room_members (room_id, user_id, name) values (v_room.id, v_uid, left(p_name, 20))
  on conflict (room_id, user_id) do update set name = excluded.name, sharing = true;
  return json_build_object('roomId', v_room.id, 'code', v_room.code);
end;
$$;

create or replace function public.room_push(
  p_room uuid, p_stage text, p_step_idx int, p_step_count int, p_eta_ms bigint, p_late_min int
) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  update public.room_members
  set stage = p_stage, step_idx = p_step_idx, step_count = p_step_count, eta_ms = p_eta_ms, late_min = p_late_min, updated_at = now()
  where room_id = p_room and user_id = auth.uid();
  return found;
end;
$$;

-- 늦는다고 직접 알린 문구를 남긴다(비우면 지운다)
create or replace function public.room_say(p_room uuid, p_message text) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  update public.room_members set message = nullif(left(p_message, 200), ''), updated_at = now()
  where room_id = p_room and user_id = auth.uid();
  return found;
end;
$$;

-- 같은 방의 상대에게 안심 메시지를 보낸다(재촉 문구는 받지 않는다: 정해 둔 것만)
create or replace function public.room_cheer(p_room uuid, p_to uuid, p_kind text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_text text := case p_kind when 'slow' then '천천히 와요' when 'ok' then '괜찮아요, 천천히 와요' else null end;
begin
  select name into v_name from public.room_members where room_id = p_room and user_id = auth.uid();
  if v_name is null or v_text is null then return false; end if;
  update public.room_members set cheer = v_text, cheer_from = v_name, cheer_at = now()
  where room_id = p_room and user_id = p_to and user_id <> auth.uid();
  return found;
end;
$$;

-- 공유 끄기/켜기. 끄면 내 상태를 바로 지운다
create or replace function public.room_sharing(p_room uuid, p_on boolean) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  update public.room_members
  set sharing = p_on,
      stage = case when p_on then stage end, step_idx = case when p_on then step_idx end,
      step_count = case when p_on then step_count end, eta_ms = case when p_on then eta_ms end,
      late_min = case when p_on then late_min end, message = case when p_on then message end, updated_at = now()
  where room_id = p_room and user_id = auth.uid();
  return found;
end;
$$;

-- 약속이 끝나면 결과만 남기고 상태는 지운다
create or replace function public.room_finish(p_room uuid, p_result text) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  update public.room_members
  set result = p_result, stage = 'arrived', step_idx = null, step_count = null, message = null, updated_at = now()
  where room_id = p_room and user_id = auth.uid() and p_result in ('kept', 'late');
  return found;
end;
$$;

-- 내가 들어 있는 방만 볼 수 있다. 공유를 끈 사람의 상태는 내보내지 않는다
create or replace function public.room_get(p_room uuid) returns json
language sql security definer stable set search_path = ''
as $$
  select json_build_object(
    'roomId', r.id, 'code', r.code, 'title', r.title, 'arriveMs', r.arrive_ms,
    'members', (
      select json_agg(json_build_object(
        'userId', m.user_id, 'name', m.name, 'isMe', m.user_id = auth.uid(), 'sharing', m.sharing,
        'stage', case when m.sharing then m.stage end,
        'stepIdx', case when m.sharing then m.step_idx end,
        'stepCount', case when m.sharing then m.step_count end,
        'etaMs', case when m.sharing then m.eta_ms end,
        'lateMin', case when m.sharing then m.late_min end,
        'message', case when m.sharing then m.message end,
        'cheer', case when m.user_id = auth.uid() and m.cheer_at > now() - interval '30 minutes' then m.cheer end,
        'cheerFrom', case when m.user_id = auth.uid() and m.cheer_at > now() - interval '30 minutes' then m.cheer_from end,
        'result', m.result,
        'updatedAtMs', floor(extract(epoch from m.updated_at) * 1000)::bigint
      ) order by m.user_id = auth.uid() desc, m.name)
      from public.room_members m where m.room_id = r.id
    )
  )
  from public.rooms r
  where r.id = p_room and exists (select 1 from public.room_members x where x.room_id = r.id and x.user_id = auth.uid());
$$;

-- 친구 목록: 같은 방에 있었던 사람과, 함께한 약속에서 각자 지킨·늦은 횟수. 나와 그 친구만 볼 수 있다
create or replace function public.my_friends() returns json
language sql security definer stable set search_path = ''
as $$
  select coalesce(json_agg(f order by f."together" desc, f."name"), '[]'::json)
  from (
    select
      o.user_id as "userId",
      (array_agg(o.name order by o.updated_at desc))[1] as "name",
      count(*) as "together",
      count(*) filter (where me.result = 'kept') as "myKept",
      count(*) filter (where me.result = 'late') as "myLate",
      count(*) filter (where o.result = 'kept') as "theirKept",
      count(*) filter (where o.result = 'late') as "theirLate",
      bool_or(o.sharing and o.result is null and o.stage is not null and o.updated_at > now() - interval '15 minutes') as "active"
    from public.room_members me
    join public.room_members o on o.room_id = me.room_id and o.user_id <> me.user_id
    where me.user_id = auth.uid()
    group by o.user_id
  ) f;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'room_create(text, text, bigint)', 'room_join(text, text)', 'room_push(uuid, text, int, int, bigint, int)',
    'room_say(uuid, text)', 'room_cheer(uuid, uuid, text)', 'room_sharing(uuid, boolean)',
    'room_finish(uuid, text)', 'room_get(uuid)', 'my_friends()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function public.room_new_code() from public, anon, authenticated;
