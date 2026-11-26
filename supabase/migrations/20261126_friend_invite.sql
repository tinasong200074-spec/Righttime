-- 친구를 골라 바로 공유하기.
-- room_invite: 내가 들어가 있는 방에 친구를 넣는다. "친구"는 예전에 같은 방에 있었던 사람만이다(아무나 넣을 수 없다).
--   넣어 둔 친구의 공유는 꺼 둔다. 친구가 직접 켜야 친구의 상태가 보인다(동의 없이 보이지 않게).
-- my_rooms: 내가 초대받아 들어가 있는, 아직 끝나지 않은 방. 친구 기기가 앱을 열었을 때 초대를 알아채는 데 쓴다.

create or replace function public.room_invite(p_room uuid, p_friend uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
begin
  if v_uid is null or p_friend is null or p_friend = v_uid then return false; end if;
  if not exists (select 1 from public.room_members where room_id = p_room and user_id = v_uid) then return false; end if;
  select (array_agg(o.name order by o.updated_at desc))[1] into v_name
  from public.room_members me
  join public.room_members o on o.room_id = me.room_id and o.user_id = p_friend
  where me.user_id = v_uid;
  if v_name is null then return false; end if;
  if (select count(*) from public.room_members where room_id = p_room and user_id <> v_uid) >= 6 then return false; end if;
  insert into public.room_members (room_id, user_id, name, sharing) values (p_room, p_friend, v_name, false)
  on conflict (room_id, user_id) do nothing;
  return true;
end;
$$;

create or replace function public.my_rooms() returns json
language sql security definer stable set search_path = ''
as $$
  select coalesce(json_agg(json_build_object(
    'roomId', r.id, 'code', r.code, 'title', r.title, 'arriveMs', r.arrive_ms, 'sharing', m.sharing,
    'from', (select o.name from public.room_members o where o.room_id = r.id and o.user_id = r.owner)
  ) order by r.arrive_ms), '[]'::json)
  from public.room_members m
  join public.rooms r on r.id = m.room_id
  where m.user_id = auth.uid() and r.owner <> auth.uid() and m.result is null
    and to_timestamp(r.arrive_ms / 1000.0) > now() - interval '1 hour';
$$;

revoke all on function public.room_invite(uuid, uuid) from public, anon;
grant execute on function public.room_invite(uuid, uuid) to authenticated;
revoke all on function public.my_rooms() from public, anon;
grant execute on function public.my_rooms() to authenticated;
