-- 친구에게 보내는 한마디를 늘리고 이모티콘 일곱 개를 더한다.
-- 아무 글이나 보낼 수 없게, 서버가 아는 키만 글로 바꿔 저장한다(src/domain/cheer.ts와 같은 목록).
-- 받은 쪽이 같은 말을 다시 받아도 알 수 있게 room_get에 받은 시각(cheerAtMs)을 더한다.

create or replace function public.room_cheer(p_room uuid, p_to uuid, p_kind text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_text text := case p_kind
    when 'slow' then '천천히 와요'
    when 'ok' then '괜찮아요, 천천히 와요'
    when 'prep' then '천천히 준비해요'
    when 'later' then '이따 봐요'
    when 'safe' then '조심히 와요'
    when 'soon' then '곧 봐요'
    when 'waiting' then '기다리고 있어요'
    when 'here' then '먼저 도착했어요'
    when 'e_happy' then '😊'
    when 'e_sad' then '😢'
    when 'e_angry' then '😠'
    when 'e_tired' then '😴'
    when 'e_laugh' then '😂'
    when 'e_good' then '👍'
    when 'e_thanks' then '🙏'
    else null end;
begin
  select name into v_name from public.room_members where room_id = p_room and user_id = auth.uid();
  if v_name is null or v_text is null then return false; end if;
  update public.room_members set cheer = v_text, cheer_from = v_name, cheer_at = now()
  where room_id = p_room and user_id = p_to and user_id <> auth.uid();
  return found;
end;
$$;

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
        'cheerAtMs', case when m.user_id = auth.uid() and m.cheer_at > now() - interval '30 minutes' then floor(extract(epoch from m.cheer_at) * 1000)::bigint end,
        'result', m.result,
        'updatedAtMs', floor(extract(epoch from m.updated_at) * 1000)::bigint
      ) order by m.user_id = auth.uid() desc, m.name)
      from public.room_members m where m.room_id = r.id
    )
  )
  from public.rooms r
  where r.id = p_room and exists (select 1 from public.room_members x where x.room_id = r.id and x.user_id = auth.uid());
$$;

-- 권한은 그대로다(함수 서명이 같아서 기존 grant가 유지된다). 혹시 몰라 다시 적어 둔다
revoke all on function public.room_cheer(uuid, uuid, text) from public, anon;
grant execute on function public.room_cheer(uuid, uuid, text) to authenticated;
revoke all on function public.room_get(uuid) from public, anon;
grant execute on function public.room_get(uuid) to authenticated;
