import { useCallback, useEffect, useRef, useState } from 'react';

export interface Nav<T> {
  view: T;
  push: (next: T) => void; // 하위 화면으로 들어간다(뒤로 가기 한 번이 한 단계가 된다)
  replace: (next: T) => void; // 이동 기록은 그대로 두고 화면만 바꾼다
  back: (fallback: T) => void; // 한 단계 뒤로. 쌓인 기록이 없으면 fallback으로 간다
}

// 화면 안에서 단계를 오갈 때 브라우저 이동 기록(history)을 함께 쌓는다.
// 안드로이드 뒤로 버튼과 브라우저 뒤로 가기가 앱을 닫지 않고 이전 화면으로 돌아오게 한다.
export function useHistoryState<T>(initial: T | (() => T)): Nav<T> {
  const [view, setView] = useState<T>(initial);
  const current = useRef(view);
  const stack = useRef<T[]>([]);

  useEffect(() => {
    const onPop = () => {
      const prev = stack.current.pop();
      if (prev === undefined) return;
      current.current = prev;
      setView(prev);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // 다른 탭으로 옮겨 이 화면이 사라질 때, 쌓아 둔 기록을 걷어 낸다(뒤로 가기가 헛돌지 않게)
      const left = stack.current.length;
      if (left > 0) history.go(-left);
    };
  }, []);

  const push = useCallback((next: T) => {
    stack.current.push(current.current);
    history.pushState({ jette: true }, '');
    current.current = next;
    setView(next);
  }, []);

  const replace = useCallback((next: T) => {
    current.current = next;
    setView(next);
  }, []);

  const back = useCallback(
    (fallback: T) => {
      if (stack.current.length > 0) history.back();
      else replace(fallback);
    },
    [replace],
  );

  return { view, push, replace, back };
}
