-- 준비 현황 링크 공유(명세 12.1, 12.3)
-- 표는 아무도 직접 읽거나 쓸 수 없다(RLS 켜고 정책 없음). 아래 함수 3개로만 드나든다.
-- 읽기: 토큰을 아는 사람만. 쓰기: 공유를 시작한 기기만 아는 쓰기 키가 맞을 때만.
-- 위치, 알람 미루기, 개인 기록을 담는 칸은 일부러 만들지 않았다.

create table public.shares (
  token text primary key check (token ~ '^[0-9a-f]{32}$'),
  write_hash text not null,
  name text not null check (char_length(name) <= 20),
  stage text check (stage in ('woke', 'prep', 'depart', 'travel', 'arrived')),
  step_idx int check (step_idx between 0 and 50),
  step_count int check (step_count between 1 and 50),
  eta_ms bigint,
  arrive_ms bigint not null,
  late_min int check (late_min between 0 and 1440),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.shares enable row level security;

create or replace function public.share_upsert(
  p_token text, p_write_key text, p_name text, p_stage text, p_step_idx int, p_step_count int,
  p_eta_ms bigint, p_arrive_ms bigint, p_late_min int, p_expires_ms bigint
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_hash text := encode(sha256(convert_to(p_write_key, 'utf8')), 'hex');
  -- 링크는 길어도 이틀 안에 닫힌다
  v_expires timestamptz := least(to_timestamp(p_expires_ms / 1000.0), now() + interval '2 days');
begin
  if char_length(p_write_key) < 32 then
    return false;
  end if;
  delete from public.shares where expires_at < now();
  insert into public.shares as s (token, write_hash, name, stage, step_idx, step_count, eta_ms, arrive_ms, late_min, expires_at)
  values (p_token, v_hash, left(p_name, 20), p_stage, p_step_idx, p_step_count, p_eta_ms, p_arrive_ms, p_late_min, v_expires)
  on conflict (token) do update
    set name = excluded.name, stage = excluded.stage, step_idx = excluded.step_idx, step_count = excluded.step_count,
        eta_ms = excluded.eta_ms, arrive_ms = excluded.arrive_ms, late_min = excluded.late_min,
        expires_at = excluded.expires_at, updated_at = now()
    where s.write_hash = v_hash;
  return found;
end;
$$;

create or replace function public.share_get(p_token text) returns json
language sql security definer stable set search_path = ''
as $$
  select json_build_object(
    'name', name, 'stage', stage, 'stepIdx', step_idx, 'stepCount', step_count,
    'etaMs', eta_ms, 'arriveMs', arrive_ms, 'lateMin', late_min,
    'updatedAtMs', floor(extract(epoch from updated_at) * 1000)::bigint
  )
  from public.shares
  where token = p_token and expires_at > now();
$$;

create or replace function public.share_close(p_token text, p_write_key text) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.shares
  where token = p_token and write_hash = encode(sha256(convert_to(p_write_key, 'utf8')), 'hex');
  return found;
end;
$$;

revoke all on function public.share_upsert(text, text, text, text, int, int, bigint, bigint, int, bigint) from public;
revoke all on function public.share_get(text) from public;
revoke all on function public.share_close(text, text) from public;
grant execute on function public.share_upsert(text, text, text, text, int, int, bigint, bigint, int, bigint) to anon, authenticated;
grant execute on function public.share_get(text) to anon, authenticated;
grant execute on function public.share_close(text, text) to anon, authenticated;
