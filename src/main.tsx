import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { Viewer } from './features/share/Viewer';
import { tokenFromHash } from './infra/share';
import './app/tokens.css';
import './app/app.css';

// 주소가 #s=토큰이면 앱 대신 읽기 전용 화면을 보여 준다(앱 없이 링크로 보기)
const shareToken = tokenFromHash(location.hash);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shareToken ? <Viewer token={shareToken} /> : <App />}
  </StrictMode>,
);
