-- 푸시 알림 예약. "어느 구독 주소를 언제 깨울지"만 담는다. 알림 문구는 기기에만 있다.
-- 표는 직접 드나들 수 없고(RLS, 정책 없음) 아래 함수로만 쓴다.

create table public.push_jobs (
  id bigint generated always as identity primary key,
  endpoint text not null check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  fire_at timestamptz not null
);
create index push_jobs_fire_at on public.push_jobs (fire_at);
create index push_jobs_endpoint on public.push_jobs (endpoint);
alter table public.push_jobs enable row level security;

-- 한 구독의 예약을 통째로 바꾼다(최대 6개, 이틀 안의 시각만)
create or replace function public.push_schedule(p_endpoint text, p_times_ms bigint[]) returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_count int;
begin
  delete from public.push_jobs where endpoint = p_endpoint or fire_at < now() - interval '1 hour';
  insert into public.push_jobs (endpoint, fire_at)
  select p_endpoint, to_timestamp(t / 1000.0)
  from unnest(p_times_ms[1:6]) as t
  where to_timestamp(t / 1000.0) between now() - interval '1 minute' and now() + interval '2 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.push_cancel(p_endpoint text) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.push_jobs where endpoint = p_endpoint;
  return found;
end;
$$;

-- 시각이 된 예약을 꺼내면서 지운다(서버 함수만 부를 수 있다)
create or replace function public.push_take_due() returns table (endpoint text)
language sql security definer set search_path = ''
as $$
  delete from public.push_jobs j where j.fire_at <= now() + interval '20 seconds' returning j.endpoint;
$$;

revoke all on function public.push_schedule(text, bigint[]) from public;
revoke all on function public.push_cancel(text) from public;
revoke all on function public.push_take_due() from public, anon, authenticated;
grant execute on function public.push_schedule(text, bigint[]) to anon, authenticated;
grant execute on function public.push_cancel(text) to anon, authenticated;
grant execute on function public.push_take_due() to service_role;

-- 1분마다 발송 함수를 부른다
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('jette-push-run', '* * * * *', $$select net.http_post(url := 'https://righttime-alpha.vercel.app/api/push-run')$$);
