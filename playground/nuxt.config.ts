export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  devtools: { enabled: true },
  compatibilityDate: '2026-03-16',
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },
  edgeAI: {
    routeBase: '/api/edge-ai',
    cacheDir: './.cache/nuxt-edge-ai-playground',
    provider: 'local',
    preset: 'distilgpt2',
    remote: {
      enabled: true,
      fallback: true,
      baseUrl: process.env.NUXT_EDGE_AI_REMOTE_BASE_URL,
      apiKey: process.env.NUXT_EDGE_AI_REMOTE_API_KEY,
      model: process.env.NUXT_EDGE_AI_REMOTE_MODEL,
    },
  },
})
