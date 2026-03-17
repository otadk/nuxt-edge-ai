import { defineNuxtPlugin, useRequestURL, useRuntimeConfig } from '#app'
import { EdgeAI } from './client'
import type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPublicRuntimeConfig,
  EdgeAIPullResponse,
} from './types'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const publicConfig = config.public.edgeAI as unknown as EdgeAIPublicRuntimeConfig
  const routeBase = publicConfig.routeBase
  const provider = publicConfig.provider
  const runtime = publicConfig.runtime
  const defaultModel = publicConfig.defaultModel
  const remoteModel = publicConfig.remoteModel
  const preset = publicConfig.preset
  const remoteFallback = publicConfig.remoteFallback
  const requestURL = useRequestURL()
  const client = new EdgeAI({
    baseURL: routeBase.startsWith('http') ? routeBase : new URL(routeBase, requestURL.origin).toString(),
  })

  return {
    provide: {
      edgeAI: {
        routeBase,
        provider,
        runtime,
        defaultModel,
        remoteModel,
        preset,
        remoteFallback,
        client,
        pull() {
          return $fetch<EdgeAIPullResponse>(`${routeBase}/pull`, {
            method: 'POST',
          })
        },
        generate(payload: EdgeAIGenerateRequest) {
          return $fetch<EdgeAIGenerateResponse>(`${routeBase}/generate`, {
            method: 'POST',
            body: payload,
          })
        },
        chatCompletions(payload: EdgeAIChatCompletionRequest) {
          return $fetch<EdgeAIChatCompletionResponse>(`${routeBase}/chat/completions`, {
            method: 'POST',
            body: payload,
          })
        },
        health() {
          return $fetch<EdgeAIHealthResponse>(`${routeBase}/health`)
        },
      },
    },
  }
})
