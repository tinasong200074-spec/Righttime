-- 친구 끊기. 친구 목록은 "같은 방에 있었던 사람"으로 만들어지므로,
-- 그 친구와 함께 있던 방에서 내 참여 기록을 지우면 양쪽 목록에서 서로 사라진다.
-- 지우는 것은 내 줄뿐이다. 상대의 줄과 방, 다른 친구와만 함께한 방의 기록은 그대로 둔다.
-- 한 방에 셋 이상이 있었다면 그 방에서의 내 기록이 함께 지워져, 그 방의 다른 친구와 함께한 횟수도 줄어든다.

create or replace function public.friend_remove(p_other uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_other is null or p_other = v_uid then
    return false;
  end if;
  delete from public.room_members me
  where me.user_id = v_uid
    and exists (select 1 from public.room_members o where o.room_id = me.room_id and o.user_id = p_other);
  return found;
end;
$$;

revoke all on function public.friend_remove(uuid) from public, anon;
grant execute on function public.friend_remove(uuid) to authenticated;
