import { useEffect } from 'react';
import { useApp } from '../../app/store';
import { leaveAskText } from '../../domain/push';
import { notify, startAlarmSound, stopAlarmSound } from '../../infra/alarm';
import './ask.css';

const ASKED = '_leave-asked'; // 이번 약속에서 이미 물어봤는지(체크 상태와 같은 곳에 적어 둔다)

// "준비 끝났어요"를 눌러 출발 단계로 넘어오면 소리를 울리며 "이거 챙겼어?"를 한 번 묻는다(시각이 됐다고 저절로 뜨지 않는다).
// 체크리스트에서 지우지 않은 것만 다시 알려 준다. 챙길 것이 없으면 묻지 않는다
export function LeaveAsk() {
  const { session: s, checklist, settings, actions } = useApp();
  const due = !!s && s.state === 'check' && checklist.length > 0 && !s.checked[ASKED];
  const text = leaveAskText(checklist.map((c) => c.text));

  useEffect(() => {
    if (!due) return;
    if (settings.sound) startAlarmSound();
    notify('출발 전에 확인해요', text, { sound: false }); // 화면이 가려져 있으면 알림창으로도 띄운다
    return stopAlarmSound;
  }, [due, settings.sound, text]);

  if (!due) return null;
  return (
    <div className="ask-back">
      <section className="ask" role="alertdialog" aria-modal="true" aria-labelledby="ask-title">
        <p className="ask-label">출발하기 전에</p>
        <h2 id="ask-title" className="ask-title">
          이거 챙겼어?
        </h2>
        <ul className="ask-list">
          {checklist.map((c) => (
            <li key={c.key}>{c.text}</li>
          ))}
        </ul>
        <button type="button" className="ask-ok" autoFocus onClick={() => actions.toggleCheck(ASKED)}>
          챙겼어요
        </button>
      </section>
    </div>
  );
}
