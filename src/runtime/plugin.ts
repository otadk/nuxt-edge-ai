import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import type {
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPublicRuntimeConfig,
  EdgeAIPullResponse,
} from './types'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const publicConfig = config.public.edgeAI as EdgeAIPublicRuntimeConfig
  const routeBase = publicConfig.routeBase
  const runtime = publicConfig.runtime
  const defaultModel = publicConfig.defaultModel

  return {
    provide: {
      edgeAI: {
        routeBase,
        runtime,
        defaultModel,
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
        health() {
          return $fetch<EdgeAIHealthResponse>(`${routeBase}/health`)
        },
      },
    },
  }
})
