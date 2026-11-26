-- 공유받은 친구가 보내는 한마디에 "전 준비 끝났어요", "도착했어요"를 더한다.
-- 방(room_cheer)과 링크(share_cheer) 둘 다 같은 목록을 받게 맞춘다. 나머지는 그대로다.

create or replace function public.cheer_text(p_kind text) returns text
language sql immutable set search_path = ''
as $$
  select case p_kind
    when 'slow' then '천천히 와요'
    when 'ok' then '괜찮아요, 천천히 와요'
    when 'prep' then '천천히 준비해요'
    when 'later' then '이따 봐요'
    when 'safe' then '조심히 와요'
    when 'soon' then '곧 봐요'
    when 'waiting' then '기다리고 있어요'
    when 'here' then '먼저 도착했어요'
    when 'tardy' then '좀 늦네요'
    when 'ready' then '전 준비 끝났어요'
    when 'arrived' then '도착했어요'
    when 'e_happy' then '😊'
    when 'e_sad' then '😢'
    when 'e_angry' then '😠'
    when 'e_tired' then '😴'
    when 'e_laugh' then '😂'
    when 'e_good' then '👍'
    when 'e_thanks' then '🙏'
    else null end;
$$;

create or replace function public.room_cheer(p_room uuid, p_to uuid, p_kind text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_text text := public.cheer_text(p_kind);
begin
  select name into v_name from public.room_members where room_id = p_room and user_id = auth.uid();
  if v_name is null or v_text is null then return false; end if;
  update public.room_members set cheer = v_text, cheer_from = v_name, cheer_at = now()
  where room_id = p_room and user_id = p_to and user_id <> auth.uid();
  return found;
end;
$$;

create or replace function public.share_cheer(p_token text, p_kind text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_text text := public.cheer_text(p_kind);
begin
  if v_text is null then return false; end if;
  -- 연달아 누르는 것은 2초에 한 번만 받는다
  update public.shares set cheer = v_text, cheer_at = now()
  where token = p_token and expires_at > now() and (cheer_at is null or cheer_at < now() - interval '2 seconds');
  return found;
end;
$$;

-- 글 목록 함수는 다른 함수 안에서만 쓴다
revoke all on function public.cheer_text(text) from public, anon, authenticated;
revoke all on function public.room_cheer(uuid, uuid, text) from public, anon;
grant execute on function public.room_cheer(uuid, uuid, text) to authenticated;
revoke all on function public.share_cheer(text, text) from public;
grant execute on function public.share_cheer(text, text) to anon, authenticated;
