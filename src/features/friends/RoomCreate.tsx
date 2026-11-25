import { useState } from 'react';
import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import { dayLabel } from '../today/model';
import { TopBar } from './TopBar';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 글자(0, O, 1, I)는 뺀다

function makeCode(): string {
  const pick = () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
}

function Visible() {
  return (
    <section className="m-card">
      <div className="fr-vis">
        <b>보임</b>
        <div>
          <span className="fr-chip is-soft">지금 단계</span>
          <span className="fr-chip is-soft">도착 예정</span>
        </div>
        <b>안 보임</b>
        <div>
          <span className="fr-chip">위치</span>
          <span className="fr-chip">미루기</span>
          <span className="fr-chip">기록</span>
        </div>
      </div>
    </section>
  );
}

// 약속 방 만들기 · 동의(목업 1번). 서버가 없어서 초대 코드는 예시이고, 보내지 않는다
export function RoomCreate({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const { plan, now } = useApp();
  const [code] = useState(makeCode);
  const [agree, setAgree] = useState(true);
  const [msg, setMsg] = useState('');
  const day = dayLabel(plan.arriveAt, now).split(' · ')[0];

  return (
    <div className="m-screen">
      <TopBar title="준비 현황 공유" onBack={onBack} />
      <div style={{ padding: '0 4px' }}>
        <h2 className="m-h1" style={{ lineHeight: 1.3 }}>
          친구에게
          <br />
          보여줄까요?
        </h2>
        <div className="m-muted">
          {day} {fmtClock(plan.arriveAt)} 약속
        </div>
      </div>
      <section className="fr-invite">
        <div>
          <div className="m-muted" style={{ color: 'var(--on-dark)' }}>초대 코드</div>
          <div className="fr-code">{code}</div>
        </div>
        <button type="button" className="fr-outline-light" onClick={() => setMsg('예시 화면이라 아직 보낼 수 없어요. 계정 기능이 붙으면 열려요.')}>
          링크 보내기
        </button>
      </section>
      <p className="fr-small" aria-live="polite">{msg}</p>
      <Visible />
      <section className="m-card">
        <label className="fr-check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          이 약속에서만 공유해요
        </label>
      </section>
      <p className="fr-small">약속이 끝나면 사라져요. 친구도 동의해야 보여요.</p>
      <div className="m-spacer" />
      <button type="button" className="fr-cta" disabled={!agree} onClick={onStart}>
        공유 시작
      </button>
    </div>
  );
}
