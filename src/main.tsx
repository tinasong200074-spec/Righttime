import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { Viewer } from './features/share/Viewer';
import { tokenFromHash } from './infra/share';
import './app/tokens.css';
import './app/app.css';

// 주소가 #s=토큰이면 앱 대신 읽기 전용 화면을 보여 준다(앱 없이 링크로 보기).
// 앱이 열린 탭에서 링크를 열면 새로고침 없이 주소만 바뀌므로 hashchange도 듣는다
function Root() {
  const [token, setToken] = useState(() => tokenFromHash(location.hash));
  useEffect(() => {
    const onHash = () => setToken(tokenFromHash(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return token ? <Viewer token={token} /> : <App />;
}

// 새 버전이 배포되면 서비스 워커가 바뀐다. 그때 한 번 새로고침해서 예전 화면이 남지 않게 한다.
// 진행 중인 상태는 기기에 저장돼 있어서 새로고침해도 이어진다
if ('serviceWorker' in navigator) {
  let controlled = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) location.reload();
    controlled = true;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
