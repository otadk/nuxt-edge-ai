import type { NuxtApp } from '#app'
import type { EdgeAI } from './runtime/client'
import type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPublicRuntimeConfig,
  EdgeAIPullResponse,
  EdgeAIServerRuntimeConfig,
} from './runtime/types'

declare module '#app' {
  interface NuxtApp {
    $edgeAI: {
      routeBase: string
      provider: 'local' | 'remote' | 'mock'
      runtime: 'transformers-wasm' | 'remote' | 'mock'
      defaultModel: string
      remoteModel: string
      preset?: string
      remoteFallback: boolean
      client: EdgeAI
      pull: () => Promise<EdgeAIPullResponse>
      generate: (payload: EdgeAIGenerateRequest) => Promise<EdgeAIGenerateResponse>
      chatCompletions: (payload: EdgeAIChatCompletionRequest) => Promise<EdgeAIChatCompletionResponse>
      health: () => Promise<EdgeAIHealthResponse>
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $edgeAI: NuxtApp['$edgeAI']
  }
}

declare module '@nuxt/schema' {
  interface RuntimeConfig {
    edgeAI: EdgeAIServerRuntimeConfig
  }

  interface PublicRuntimeConfig {
    edgeAI: EdgeAIPublicRuntimeConfig
  }
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    edgeAI: EdgeAIServerRuntimeConfig
  }

  interface PublicRuntimeConfig {
    edgeAI: EdgeAIPublicRuntimeConfig
  }
}

export {}
