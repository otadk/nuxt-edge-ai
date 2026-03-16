import type { NuxtApp } from '#app'
import type {
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
      runtime: 'transformers-wasm' | 'mock'
      defaultModel: string
      pull: () => Promise<EdgeAIPullResponse>
      generate: (payload: EdgeAIGenerateRequest) => Promise<EdgeAIGenerateResponse>
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
