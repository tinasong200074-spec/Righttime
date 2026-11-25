import { useEffect, useState, type ReactNode } from 'react';
import { useApp } from '../../app/store';
import { CarryCard } from './CarryCard';
import './fields.css';
import { HelperForm } from './HelperForm';
import { HelperResult } from './HelperResult';
import './main.css';
import { MemoBar } from './MemoBar';
import { PlaceField, PlanFields } from './PlanCard';
import { StepsEditor } from './StepsEditor';
import { SubScreen } from './SubScreen';
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
function Sub({ view, go }: { view: Exclude<View, 'main'>; go: (v: View) => void }) {
  const back = () => go(view === 'helper' ? 'carry' : 'main');
  const body: Record<Exclude<View, 'main'>, { title: string; badge?: string; node: ReactNode }> = {
    plan: { title: '일정', node: <PlanFields /> },
    place: { title: '도착 장소', node: <section className="m-card"><PlaceField /></section> },
    steps: { title: '준비 단계', node: <StepsEditor /> },
    weather: { title: '날씨', node: <WeatherCard /> },
    carry: { title: '출발할 때 알려줘요', node: <CarryScreen go={go} /> },
    helper: { title: '일정 준비 도우미', badge: '초안', node: <><HelperForm /><HelperResult /></> },
  };
  const b = body[view];
  return (
    <SubScreen title={b.title} badge={b.badge} onBack={back}>
      {b.node}
    </SubScreen>
  );
}

// ① 오늘: 목업 6번과 같은 한 화면과, 칸을 탭하면 열리는 보조 화면들
export function TodayScreen() {
  const { session, plan, actions } = useApp();
  const [view, setView] = useState<View>('main');
  // 배차 대기 입력은 없앴다(카카오가 배차 간격을 주지 않는다). 예전에 저장된 값이 남아 있으면 0으로 맞춘다
  useEffect(() => {
    if (plan.waitMin !== 0 && !session) actions.updatePlan({ waitMin: 0 });
  }, [plan.waitMin, session, actions]);
  const go = (v: View) => setView(session && v !== 'main' && v !== 'carry' && v !== 'helper' && v !== 'weather' ? 'main' : v);
  return view === 'main' ? <TodayMain go={go} /> : <Sub view={view} go={go} />;
}
