import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only: mounts the Vercel serverless functions under src/../api/*.js onto the Vite
// dev server, so `npm run dev` can exercise them locally without needing `vercel dev`.
// Production deploys ignore this — Vercel serves api/*.js natively as serverless functions.
function apiRoutesDevPlugin() {
  return {
    name: 'api-routes-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()

        const routePath = req.url.split('?')[0]
        const modulePath = `./api${routePath.replace(/^\/api/, '')}.js`

        let handlerModule
        try {
          handlerModule = await server.ssrLoadModule(modulePath)
        } catch {
          return next()
        }

        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            req.body = body ? JSON.parse(body) : {}
          } catch {
            req.body = {}
          }
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (payload) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
          }
          try {
            await handlerModule.default(req, res)
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message || 'Dev API route error' }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side dev API routes (api/*.js) read secrets via process.env, same as they would
  // on Vercel — but Vite only auto-loads .env into import.meta.env for client code, so pull
  // the raw values into process.env here for the dev-only api middleware above.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiRoutesDevPlugin(),
    ],
    base: "./", // Add this if assets are not loading
    build: {
      outDir: "dist",
    },
  }
})
