import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';

const fmtDur = (min: number) => {
  const m = Math.round(min);
  return m < 60 ? `${m}분` : m % 60 === 0 ? `${m / 60}시간` : `${Math.floor(m / 60)}시간 ${m % 60}분`;
};

// 새 약속 맨 아래 요약: 이동과 준비를 합쳐 얼마나 걸리는지, 도착 시각에 맞추려면 몇 시에 시작해야 하는지
export function PlanSummary() {
  const { calc } = useApp();
  if (!calc) return null;
  const ride = calc.ride.val + calc.waitMin;
  const extra = calc.buffer + calc.wake.val; // 도착 여유와, 알람이 울린 뒤 준비를 시작하기까지
  return (
    <section className="m-card" aria-label="걸리는 시간과 시작 시각">
      <p className="ps-total">
        이동 {fmtDur(ride)} + 준비 {fmtDur(calc.prep.val)} = <strong>총 {fmtDur(ride + calc.prep.val)}</strong>
      </p>
      <p className="ps-start">
        {fmtClock(calc.arriveAt)}에 도착하려면 <strong>{fmtClock(calc.alarmAt)}</strong>에 시작해요
      </p>
      <p className="m-sub ps-note">
        준비 {fmtClock(calc.prepStartAt)} · 출발 {fmtClock(calc.leaveAt)} · 여유 {calc.buffer}분과 시작까지 {Math.round(calc.wake.val)}분({fmtDur(extra)})을 더했어요
      </p>
    </section>
  );
}
