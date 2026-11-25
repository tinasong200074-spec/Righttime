import { useEffect, useState } from 'react';
import { clearSharedFlag, hasSharedFlag, takeShared, type SharedContent } from '../../infra/shareTarget';
import { OutlineButton, PrimaryButton } from '../../ui';
import { useHelperRun } from '../today/useHelperRun';
import '../share/share.css';

// 갤러리·메신저에서 "공유 → 제때"로 보낸 사진과 글을 받는다(명세 9.8).
// 받은 즉시 읽지 않고, 무엇을 보내는지 보여 준 뒤 눌러야 AI로 보낸다
export function SharedInbox() {
  const [shared, setShared] = useState<SharedContent | null>(null);
  const { busy, msg, run } = useHelperRun();

  useEffect(() => {
    if (!hasSharedFlag()) return;
    clearSharedFlag();
    void takeShared().then(setShared);
  }, []);

  if (!shared) return null;

  const read = async () => {
    if (await run(shared.text, shared.images)) setShared(null); // 결과는 오늘 화면의 준비 도우미에 나온다
  };

  return (
    <section className="share-card" aria-label="공유받은 내용">
      <div className="share-head">
        <h2>공유받은 내용을 읽을까요?</h2>
      </div>
      <p>
        사진 {shared.images.length}장{shared.text ? ' · 글 있음' : ''}
      </p>
      <p className="share-note">글과 사진은 AI로 전송돼요. 개인 정보가 있는 부분이 있으면 취소하고 가린 뒤 다시 보내 주세요.</p>
      <PrimaryButton onClick={read} disabled={busy}>
        읽고 정리하기
      </PrimaryButton>
      <OutlineButton onClick={() => setShared(null)} disabled={busy}>
        취소
      </OutlineButton>
      <p className="share-note" role="status">
        {msg || '정리한 결과는 직접 확인하고 담을 수 있어요. 날짜와 시각은 눌러야 반영돼요.'}
      </p>
    </section>
  );
}
