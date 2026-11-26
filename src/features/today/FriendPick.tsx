import { useApp } from '../../app/store';
import { hasAccount } from '../../infra/account';
import { useFriends } from '../room/useRoomView';
import '../quick/quick.css';

// 같이 가는 친구 고르기(선택). 고르면 알람을 켤 때 그 친구에게 내 준비 현황이 바로 공유된다.
// 친구 목록에는 예전에 같은 약속 방에 있었던 사람이 나온다
export function FriendPick() {
  const { plan, actions } = useApp();
  const friends = useFriends(hasAccount());
  const picked = plan.friend?.userId;
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
            <button
              key={f.userId} type="button" className="q-chip" aria-pressed={picked === f.userId}
              onClick={() => actions.updatePlan({ friend: picked === f.userId ? undefined : { userId: f.userId, name: f.name } })}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}
      {plan.friend && <p className="f-status">알람을 켜면 {plan.friend.name}님에게 내 준비 단계와 도착 예정이 바로 공유돼요. 위치는 보내지 않아요.</p>}
    </section>
  );
}
