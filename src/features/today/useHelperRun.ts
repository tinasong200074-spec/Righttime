import { useState } from 'react';
import { useApp } from '../../app/store';
import type { HelperInput } from '../../domain/ai';
import { fmtClock, fmtDay } from '../../domain/format';
import { AI_ERROR_TEXT, AiError, fileToImagePart, readPlanWithAi } from '../../infra/ai';

// 안내문 글·사진을 AI로 읽는다. 글과 사진 원본은 이 호출 안에서만 쓰고 상태·저장소에 남기지 않는다
export function useHelperRun() {
  const { plan, actions } = useApp();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const run = async (notes: string, images: File[]): Promise<boolean> => {
    setBusy(true);
    setMsg('읽는 중이에요…');
    try {
      const parts = await Promise.all(images.map(fileToImagePart));
      const input: HelperInput = {
        kind: plan.kind,
        title: plan.title,
        arriveText: `${fmtDay(plan.arriveAt)} ${fmtClock(plan.arriveAt)}`,
        notes: notes.trim(),
      };
      const result = await readPlanWithAi(input, parts);
      actions.setHelper(result);
      if (result.notice.length > 0) actions.addMemoItems(result.notice, 'notice');
      setMsg(result.notice.length > 0 ? `안내문에 적힌 ${result.notice.length}개를 챙길 것에 넣었어요.` : '정리했어요. 아래를 확인해 주세요.');
      return true;
    } catch (e) {
      setMsg(AI_ERROR_TEXT[e instanceof AiError ? e.code : 'bad_request']);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, msg, run };
}
