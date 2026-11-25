import { useApp } from '../../app/store';
import { Card, Icon, Pill } from '../../ui';

// "챙겼어요? n/m". 체크 상태는 이번 아침(세션)에서만 쓴다.
export function Checklist() {
  const { session: s, checklist, actions } = useApp();
  if (!s) return null;
  const done = checklist.filter((c) => s.checked[c.key]).length;
  const all = checklist.length > 0 && done === checklist.length;

  return (
    <Card>
      <h2 className="morning-h">
        챙겼어요? {done}/{checklist.length}
      </h2>
      {checklist.length === 0 && <p className="morning-note">적어 둔 챙길 것이 없어요.</p>}
      <ul className="morning-check">
        {checklist.map((c) => {
          const on = !!s.checked[c.key];
          return (
            <li key={c.key}>
              <button type="button" aria-pressed={on} onClick={() => actions.toggleCheck(c.key)}>
                <span className={`morning-box ${on ? 'is-on' : ''}`} aria-hidden="true">
                  {on && <Icon name="check" main="var(--ink)" size={16} />}
                </span>
                <span className={on ? 'is-struck' : ''}>{c.text}</span>
                {c.src === 'weather' && <Pill tone="soft">날씨</Pill>}
                <span className="morning-sr">{on ? '챙겼어요' : '아직 안 챙겼어요'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {all && (
        <p className="morning-note" role="status">
          챙길 것을 모두 확인했어요.
        </p>
      )}
    </Card>
  );
}
