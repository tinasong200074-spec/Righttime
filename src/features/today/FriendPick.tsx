import { useApp } from '../../app/store';
import { hasAccount } from '../../infra/account';
import { useFriends } from '../room/useRoomView';
import '../quick/quick.css';

// 같이 가는 친구 고르기(선택, 여러 명 가능). 고르면 알람을 켤 때 그 친구에게 내 준비 현황이 바로 공유된다.
// 친구 목록에는 예전에 같은 약속 방에 있었던 사람이 나온다
export function FriendPick() {
  const { plan, actions } = useApp();
  const friends = useFriends(hasAccount());
  const picked = plan.friends ?? [];
  const isOn = (id: string) => picked.some((p) => p.userId === id);
  const toggle = (id: string, name: string) => {
    const next = isOn(id) ? picked.filter((p) => p.userId !== id) : [...picked, { userId: id, name }];
    actions.updatePlan({ friends: next.length ? next : undefined });
  };
  return (
    <section className="m-card">
      <span className="f-label" id="friend-label" style={{ marginTop: 0 }}>
        같이 가는 친구 (선택)
      </span>
      {friends.length === 0 ? (
        <p className="f-status">아직 친구가 없어요. 친구 탭에서 한 번 같은 방에 들어간 친구가 여기에 나와요.</p>
      ) : (
        <div className="q-chips" role="group" aria-labelledby="friend-label">
          {friends.map((f) => (
            <button key={f.userId} type="button" className="q-chip" aria-pressed={isOn(f.userId)} onClick={() => toggle(f.userId, f.name)}>
              {f.name}
              <span className="fp-count"> · 함께 {f.together}번</span>
            </button>
          ))}
        </div>
      )}
      {picked.length > 0 && <p className="f-status">알람을 켜면 {picked.map((p) => p.name).join(', ')}님에게 내 준비 단계와 도착 예정이 바로 공유돼요. 위치는 보내지 않아요.</p>}
      {friends.length > 1 && <p className="f-status">같은 이름이 여러 개면 기기마다 계정이 달라서 그래요. 모두 골라도 돼요.</p>}
    </section>
  );
}
