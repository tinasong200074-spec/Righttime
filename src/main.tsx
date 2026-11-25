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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
