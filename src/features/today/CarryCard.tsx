import { useApp } from '../../app/store';
import { Card, Icon, Pill } from '../../ui';

// "챙길 것": 적어 둔 챙길 것과 날씨로 들어온 항목을 보여 준다
export function CarryCard() {
  const { checklist } = useApp();
  return (
    <Card>
      <div className="f-row">
        <Icon name="bag" main="var(--ink)" det="var(--surface)" size={28} />
        <h2 className="f-title">챙길 것</h2>
      </div>
      {checklist.length === 0 ? (
        <p className="f-sub">맨 위에 챙길 것을 적어 두면 출발할 때 “챙겼어요?”로 알려 줘요.</p>
      ) : (
        <ul className="f-chips" aria-label="출발할 때 알려 줄 것">
          {checklist.map((c) => (
            <li key={c.key}>
              <Pill tone={c.src === 'weather' ? 'soft' : 'chip'}>
                {c.text}
                {c.src === 'weather' && <span className="t-src"> 날씨</span>}
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
