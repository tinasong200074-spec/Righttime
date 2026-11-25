import { useApp } from '../../app/store';
import type { PlanCalc } from '../../domain/schedule';
import { Card, FillBar } from '../../ui';
import { NumberField } from './NumberField';

// 이동 시간 분해 막대: 이동 + 배차 대기 + 여유. 이동·대기 분은 직접 입력한다(대중교통 연동은 이번 범위 밖)
export function TravelCard({ calc }: { calc: PlanCalc }) {
  const { plan, settings, actions } = useApp();
  const { ride, waitMin, buffer, place } = calc;
  const total = ride.val + waitMin + buffer;

  const setRide = (n: number) => (place ? actions.savePlace({ ...place, travelMin: n }) : actions.updatePlan({ rideMin: n }));

  return (
    <Card>
      <h2 className="f-title">
        이동 시간 <span className="t-total">{total}분</span>
      </h2>
      <FillBar
        label={`이동 ${ride.val}분, 배차 대기 ${waitMin}분, 여유 ${buffer}분`}
        segments={[
          { ratio: ride.val / total, tone: 'ink' },
          { ratio: waitMin / total, tone: 'gray' },
          { ratio: buffer / total, tone: 'light' },
        ]}
      />
      <p className="t-legend">
        이동 {ride.val}분 · 배차 대기 {waitMin}분 · 여유 {buffer}분
      </p>
      <div className="f-grid3">
        <NumberField label="이동" value={place?.travelMin ?? plan.rideMin} min={1} max={300} onChange={setRide} />
        <NumberField label="배차 대기" value={plan.waitMin} min={0} max={120} onChange={(n) => actions.updatePlan({ waitMin: n })} />
        <NumberField label="여유" value={settings.buffer} min={0} max={60} onChange={(n) => actions.updateSettings({ buffer: n })} />
      </div>
      <p className="f-sub">
        {ride.n > 0 ? `이동은 ${ride.basis}으로 ${ride.val}분 잡았어요. ` : ''}
        버스 간격이 길면 배차 대기를 크게 적어 주세요. 한 대를 놓쳐도 늦지 않게 출발 시각을 잡아요.
      </p>
    </Card>
  );
}
