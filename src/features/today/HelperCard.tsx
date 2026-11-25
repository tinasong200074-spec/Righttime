import { Card, Icon } from '../../ui';
import { HelperForm } from './HelperForm';
import { HelperResult } from './HelperResult';

// 일정 준비 도우미: 안내문 글·사진을 AI가 읽어 준비물을 정리한다
export function HelperCard() {
  return (
    <Card>
      <div className="f-row">
        <Icon name="bag" main="var(--ink)" det="var(--surface)" size={28} />
        <h2 className="f-title">일정 준비 도우미</h2>
      </div>
      <details>
        <summary className="t-summary">글이나 사진으로 준비물 정리하기</summary>
        <HelperForm />
      </details>
      <HelperResult />
    </Card>
  );
}
