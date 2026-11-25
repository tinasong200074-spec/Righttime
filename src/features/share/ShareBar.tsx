import { useState } from 'react';
import { useApp } from '../../app/store';
import { randomToken, shareExpiresAt } from '../../domain/share';
import type { ShareState } from '../../app/state';
import { closeShare, shareAvailable, shareUrl } from '../../infra/share';
import { Icon, OutlineButton, Pill, PrimaryButton } from '../../ui';
import './share.css';

const newToken = () => randomToken(crypto.getRandomValues(new Uint8Array(16)));

async function sendLink(url: string, name: string): Promise<string> {
  const text = `${name || '저'}의 도착 예정 시각이에요. 앱 없이 볼 수 있어요.`;
  try {
    if (navigator.share) {
      await navigator.share({ text, url });
      return '';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return '';
  }
  try {
    await navigator.clipboard.writeText(url);
    return '링크를 복사했어요. 메신저에 붙여넣어 보내세요.';
  } catch {
    return '아래 링크를 길게 눌러 복사해 주세요.';
  }
}

function ShareSetup({ arriveAt }: { arriveAt: number }) {
  const { shareName, actions } = useApp();
  const start = () =>
    actions.startShare({ token: newToken(), writeKey: newToken() + newToken(), showStage: true, showEta: true, expiresAt: shareExpiresAt(arriveAt) });
  return (
    <>
      <label className="share-field">
        상대에게 보일 내 이름
        <input value={shareName} maxLength={20} placeholder="예: 지민" onChange={(e) => actions.setShareName(e.target.value)} />
      </label>
      <p className="share-note">링크를 아는 사람은 누구나 볼 수 있어요. 단체방에 올리면 모두에게 보여요. 약속이 끝나면 한 시간 뒤에 링크가 닫혀요.</p>
      <PrimaryButton onClick={start}>공유 시작</PrimaryButton>
    </>
  );
}

function ShareActive({ share }: { share: ShareState }) {
  const { shareName, actions } = useApp();
  const [msg, setMsg] = useState('');
  const url = shareUrl(share.token);
  const stop = () => {
    void closeShare(share); // 서버에서 바로 지워 상대 화면에서 사라지게 한다
    actions.stopShare();
  };
  return (
    <>
      <label className="share-switch">
        <input type="checkbox" checked={share.showStage} onChange={(e) => actions.updateShare({ showStage: e.target.checked })} />
        지금 단계 보여 주기
      </label>
      <label className="share-switch">
        <input type="checkbox" checked={share.showEta} onChange={(e) => actions.updateShare({ showEta: e.target.checked })} />
        도착 예정 시각 보여 주기
      </label>
      <input className="share-url" readOnly value={url} aria-label="공유 링크" onFocus={(e) => e.target.select()} />
      <PrimaryButton onClick={async () => setMsg(await sendLink(url, shareName))}>링크 보내기</PrimaryButton>
      <OutlineButton onClick={stop}>공유 끄기</OutlineButton>
      <p className="share-note" role="status">
        {msg || '끄면 상대 화면에서 바로 사라져요. 상대가 몇 번 봤는지는 알려 주지 않아요.'}
      </p>
    </>
  );
}

// 준비 현황 링크 공유(명세 ⑩⑪). 알람을 켠 뒤부터 쓸 수 있다
export function ShareBar() {
  const { session, share } = useApp();
  const [open, setOpen] = useState(false);
  if (!shareAvailable || !session || session.demo) return null;

  if (!open) {
    return (
      <button type="button" className="share-strip" onClick={() => setOpen(true)} aria-expanded={false}>
        <Icon name="share" size={20} main="var(--ink)" det="var(--surface)" />
        {share ? '공유 중 · 상대에게 도착 예정이 보여요' : '도착 예정을 링크로 보여 주기'}
        {share && <Pill tone="soft">공유 중</Pill>}
      </button>
    );
  }

  return (
    <section className="share-card" aria-label="준비 현황 공유">
      <div className="share-head">
        <h2>{share ? '공유 중' : '링크로 보여 줄까요?'}</h2>
        <button type="button" className="share-close" onClick={() => setOpen(false)}>
          닫기
        </button>
      </div>
      <div className="share-pills">
        <Pill tone="soft">보임 · 지금 단계</Pill>
        <Pill tone="soft">보임 · 도착 예정</Pill>
        <Pill>안 보임 · 위치</Pill>
        <Pill>안 보임 · 알람 미루기</Pill>
        <Pill>안 보임 · 기록</Pill>
      </div>
      {share ? <ShareActive share={share} /> : <ShareSetup arriveAt={session.arriveAt} />}
    </section>
  );
}
