export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  devtools: { enabled: true },
  compatibilityDate: '2026-03-16',
  edgeAI: {
    routeBase: '/api/edge-ai',
    runtime: 'transformers-wasm',
    cacheDir: './.cache/nuxt-edge-ai-playground',
    model: {
      id: 'Xenova/distilgpt2',
      task: 'text-generation',
      allowRemote: true,
      dtype: 'q8',
      generation: {
        maxNewTokens: 80,
        temperature: 0.7,
        topP: 0.92,
        doSample: true,
        repetitionPenalty: 1.05,
      },
    },
  },
})
