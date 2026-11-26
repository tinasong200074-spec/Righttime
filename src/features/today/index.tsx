import { useEffect, type ReactNode } from 'react';
import { useApp } from '../../app/store';
import { CarryCard } from './CarryCard';
import './fields.css';
import { HelperForm } from './HelperForm';
import { HelperResult } from './HelperResult';
import './main.css';
import { MemoBar } from './MemoBar';
import { SubScreen } from './SubScreen';
import { useHistoryState } from './useHistoryState';
import './today.css';
import { TodayMain, type View } from './TodayMain';
import { WeatherCard } from './WeatherCard';

function CarryScreen({ go }: { go: (v: View) => void }) {
  return (
    <>
      <section className="m-card">
        <MemoBar />
      </section>
      <CarryCard />
      <button type="button" className="m-ghost" onClick={() => go('helper')}>
        글이나 사진으로 준비물 정리하기
      </button>
    </>
  );
}

// 보조 화면: 오늘 화면에서 탭한 칸을 고치는 곳
function Sub({ view, go, back, onPlan }: { view: Exclude<View, 'main'>; go: (v: View) => void; back: () => void; onPlan: () => void }) {
  const body: Record<Exclude<View, 'main'>, { title: string; badge?: string; node: ReactNode }> = {
    weather: { title: '날씨', node: <WeatherCard /> },
    carry: { title: '챙길 것', node: <CarryScreen go={go} /> },
    helper: { title: '일정 준비 도우미', badge: '초안', node: <><HelperForm /><HelperResult onPlan={onPlan} /></> },
  };
  const b = body[view];
  return (
    <SubScreen title={b.title} badge={b.badge} onBack={back}>
      {b.node}
    </SubScreen>
  );
}

// ① 오늘: 목업 6번과 같은 한 화면과, 칸을 탭하면 열리는 보조 화면들
export function TodayScreen({ onEdit }: { onEdit?: () => void }) {
  const { session, plan, actions } = useApp();
  const nav = useHistoryState<View>('main'); // 뒤로 버튼이 앱을 닫지 않고 이전 화면으로 돌아오게 한다
  // 배차 대기 입력은 없앴다(카카오가 배차 간격을 주지 않는다). 예전에 저장된 값이 남아 있으면 0으로 맞춘다
  useEffect(() => {
    if (plan.waitMin !== 0 && !session) actions.updatePlan({ waitMin: 0 });
  }, [plan.waitMin, session, actions]);
  const go = (v: View) => nav.push(v);
  const back = () => nav.back(nav.view === 'helper' ? 'carry' : 'main');
  const edit = onEdit ?? (() => undefined);
  return nav.view === 'main' ? <TodayMain go={go} edit={edit} /> : <Sub view={nav.view} go={go} back={back} onPlan={edit} />;
}

export { NewPlanScreen } from './NewPlanScreen';
