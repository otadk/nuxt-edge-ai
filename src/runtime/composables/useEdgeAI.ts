import { useNuxtApp, useRuntimeConfig } from '#app'
import type { EdgeAI } from '../client'
import type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
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
    client: EdgeAI
    pull: () => Promise<EdgeAIPullResponse>
    generate: (payload: EdgeAIGenerateRequest) => Promise<EdgeAIGenerateResponse>
    chatCompletions: (payload: EdgeAIChatCompletionRequest) => Promise<EdgeAIChatCompletionResponse>
    health: () => Promise<EdgeAIHealthResponse>
  }
  const publicConfig = config.public.edgeAI as unknown as EdgeAIPublicRuntimeConfig
  const routeBase = publicConfig.routeBase
  const provider = publicConfig.provider
  const defaultModel = publicConfig.defaultModel
  const remoteModel = publicConfig.remoteModel
  const runtime = publicConfig.runtime
  const preset = publicConfig.preset
  const presets = publicConfig.presets
  const remoteFallback = publicConfig.remoteFallback

  return {
    routeBase,
    provider,
    defaultModel,
    remoteModel,
    runtime,
    preset,
    presets,
    remoteFallback,
    client: edgeAIService.client,
    pull() {
      return edgeAIService.pull()
    },
    generate(payload: EdgeAIGenerateRequest) {
      return edgeAIService.generate(payload)
    },
    chatCompletions(payload: EdgeAIChatCompletionRequest) {
      return edgeAIService.chatCompletions(payload)
    },
    health() {
      return edgeAIService.health()
    },
  }
}
