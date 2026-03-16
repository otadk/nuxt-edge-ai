import EdgeAI from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    EdgeAI,
  ],
  compatibilityDate: '2026-03-16',
  edgeAI: {
    routeBase: '/api/edge-ai',
    runtime: 'mock',
    model: {
      id: 'mock-model',
      task: 'text-generation',
      allowRemote: false,
      generation: {
        maxNewTokens: 32,
        temperature: 0.1,
        topP: 1,
        doSample: false,
        repetitionPenalty: 1,
      },
    },
  },
})
