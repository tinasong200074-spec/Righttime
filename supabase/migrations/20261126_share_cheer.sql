-- 링크로 보는 사람(앱·계정 없음)이 공유한 사람에게 한마디나 이모티콘을 보낸다.
-- 아무 글이나 보낼 수 없게 서버가 아는 키만 글로 바꿔 저장한다(src/domain/cheer.ts와 같은 목록 + '좀 늦네요').
-- 읽는 것은 쓰기 키를 가진 기기(공유를 시작한 사람)만 할 수 있다.

alter table public.shares add column if not exists cheer text check (char_length(cheer) <= 40);
alter table public.shares add column if not exists cheer_at timestamptz;

create or replace function public.share_cheer(p_token text, p_kind text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_text text := case p_kind
    when 'slow' then '천천히 와요'
    when 'tardy' then '좀 늦네요'
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
  if v_text is null then return false; end if;
  -- 연달아 누르는 것은 2초에 한 번만 받는다
  update public.shares set cheer = v_text, cheer_at = now()
  where token = p_token and expires_at > now() and (cheer_at is null or cheer_at < now() - interval '2 seconds');
  return found;
end;
$$;

create or replace function public.share_inbox(p_token text, p_write_key text) returns json
language sql security definer stable set search_path = ''
as $$
  select json_build_object('cheer', cheer, 'cheerAtMs', floor(extract(epoch from cheer_at) * 1000)::bigint)
  from public.shares
  where token = p_token and write_hash = encode(sha256(convert_to(p_write_key, 'utf8')), 'hex')
    and cheer_at > now() - interval '30 minutes';
$$;

revoke all on function public.share_cheer(text, text) from public;
revoke all on function public.share_inbox(text, text) from public;
grant execute on function public.share_cheer(text, text) to anon, authenticated;
grant execute on function public.share_inbox(text, text) to anon, authenticated;
