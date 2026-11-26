-- 친구와 함께한 약속의 날짜별 결과(달력용). 나와 그 친구가 같은 방에 있었던 약속만, 결과가 남은 것만 준다.
-- 남는 것은 약속 시각, 이름, 지켰어요/늦었어요뿐이다(위치나 단계 기록은 없다).

create or replace function public.friend_history(p_other uuid) returns json
language sql security definer stable set search_path = ''
as $$
  select coalesce(json_agg(json_build_object(
    'arriveMs', r.arrive_ms, 'title', r.title, 'mine', me.result, 'theirs', o.result
  ) order by r.arrive_ms), '[]'::json)
  from public.room_members me
  join public.room_members o on o.room_id = me.room_id and o.user_id = p_other
  join public.rooms r on r.id = me.room_id
  where me.user_id = auth.uid() and p_other <> auth.uid()
    and (me.result is not null or o.result is not null);
$$;

revoke all on function public.friend_history(uuid) from public, anon;
grant execute on function public.friend_history(uuid) to authenticated;
