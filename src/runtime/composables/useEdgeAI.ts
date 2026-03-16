import { useNuxtApp, useRuntimeConfig } from '#app'
import type {
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPublicRuntimeConfig,
  EdgeAIPullResponse,
} from '../types'

export function useEdgeAI() {
  const config = useRuntimeConfig()
  const nuxtApp = useNuxtApp()
  const edgeAIService = nuxtApp.$edgeAI as unknown as {
    pull: () => Promise<EdgeAIPullResponse>
    generate: (payload: EdgeAIGenerateRequest) => Promise<EdgeAIGenerateResponse>
    health: () => Promise<EdgeAIHealthResponse>
  }
  const publicConfig = config.public.edgeAI as EdgeAIPublicRuntimeConfig
  const routeBase = publicConfig.routeBase
  const defaultModel = publicConfig.defaultModel
  const runtime = publicConfig.runtime

  return {
    routeBase,
    defaultModel,
    runtime,
    pull() {
      return edgeAIService.pull()
    },
    generate(payload: EdgeAIGenerateRequest) {
      return edgeAIService.generate(payload)
    },
    health() {
      return edgeAIService.health()
    },
  }
}
