// 보내기: 공유창 → 복사 → (둘 다 안 되면) 선택 가능한 입력 상자. 앱이 대신 보내지 않는다.
export type SendResult = 'shared' | 'copied' | 'manual' | 'cancelled';

export async function sendText(text: string): Promise<SendResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'; // 사용자가 공유창을 닫음
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}

export const RESULT_TEXT: Record<SendResult, string> = {
  shared: '공유창으로 보냈어요. 받는 사람은 직접 골랐어요.',
  copied: '문구를 복사했어요. 메신저에 붙여 넣어 주세요.',
  manual: '아래 문구를 길게 눌러 복사해 주세요.',
  cancelled: '',
};
