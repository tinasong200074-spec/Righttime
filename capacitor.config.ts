import type { CapacitorConfig } from '@capacitor/cli';

// 안드로이드 앱은 배포된 웹앱을 그대로 띄우는 껍데기다. 서버 함수(/api)와 공유 링크가 같은 주소에서 돌아가야 해서 주소를 고정한다
// 시험할 때만 CAP_SERVER_URL=bundled 로 주소 없이 dist를 앱에 담아 띄운다(/api는 동작하지 않는다)
const url = process.env.CAP_SERVER_URL || 'https://righttime-alpha.vercel.app';

const config: CapacitorConfig = {
  appId: 'app.righttime.jette',
  appName: '제때',
  webDir: 'dist',
  ...(url === 'bundled' ? {} : { server: { url, cleartext: false } }),
  plugins: {
    LocalNotifications: { sound: 'jette_alarm.wav' },
  },
};

export default config;
