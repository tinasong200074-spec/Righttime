import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const BODY_MAX = 20_000_000;

// 개발 서버에서도 api/ 서버 함수를 부를 수 있게 한다(배포에서는 Vercel이 처리한다)
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''));
      server.middlewares.use(async (req, res, next) => {
        const name = req.url?.match(/^\/api\/([a-z-]+)/)?.[1];
        if (!name) return next();
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const c of req) {
            size += c.length;
            if (size > BODY_MAX) throw new Error('too large');
            chunks.push(c);
          }
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const handler = mod[req.method ?? 'GET'];
          if (!handler) return next();
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const out: Response = await handler(
            new Request(`http://localhost${req.url}`, {
              method: req.method,
              headers: req.headers as Record<string, string>,
              body: hasBody ? Buffer.concat(chunks) : undefined,
            }),
          );
          res.statusCode = out.status;
          out.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await out.arrayBuffer()));
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.end('{"error":"failed"}');
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    devApi(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '제때',
        short_name: '제때',
        description: '도착 시각에서 거꾸로, 알람과 출발 시각을 정해 드려요.',
        lang: 'ko',
        display: 'standalone',
        start_url: '/',
        theme_color: '#14181f',
        background_color: '#f3f4f6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
