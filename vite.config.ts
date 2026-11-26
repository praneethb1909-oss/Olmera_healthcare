import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function localApiMiddlewarePlugin(): Plugin {
  const mountApi = (middlewares: any, loadMod: (p: string) => Promise<any>) => {
    middlewares.use(async (req: any, res: any, next: any) => {
      const urlPath = (req.url || '').split('?')[0];
      const routeMap: Record<string, string> = {
        '/api/auth/rate-limit': '/api/auth/rate-limit.ts',
        '/api/payments/verify': '/api/payments/verify.ts',
        '/api/llm': '/api/llm.ts',
      };
      const modulePath = routeMap[urlPath];
      if (!modulePath) return next();

      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        req.body = Buffer.concat(chunks).toString('utf8');

        // Adapt Node's ServerResponse to the Vercel handler res.status().json() / .end() API
        const wrappedRes: any = res;
        wrappedRes.status = (code: number) => {
          res.statusCode = code;
          return wrappedRes;
        };
        wrappedRes.json = (payload: unknown) => {
          if (!res.getHeader('Content-Type')) {
            res.setHeader('Content-Type', 'application/json');
          }
          res.end(JSON.stringify(payload));
          return wrappedRes;
        };

        const mod = await loadMod(modulePath);
        await mod.default(req, wrappedRes);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Local API middleware error.' }));
        console.error('Local API error:', err);
      }
    });
  };

  return {
    name: 'olmera-local-api-middleware',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }
      mountApi(server.middlewares, (p) => server.ssrLoadModule(p));
    },
    configurePreviewServer(server) {
      mountApi(server.middlewares, (p) => import(`.${p}`));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localApiMiddlewarePlugin()],
});
