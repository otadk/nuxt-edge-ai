import { defineNuxtPlugin, useRequestURL, useRuntimeConfig } from '#app'
import { EdgeAI } from './client'
import type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
  EdgeAIClassifyRequest,
  EdgeAIClassifyResponse,
  EdgeAIEmbedRequest,
  EdgeAIEmbedResponse,
  EdgeAIFillMaskRequest,
  EdgeAIFillMaskResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPublicRuntimeConfig,
  EdgeAIPullResponse,
  EdgeAISummarizeRequest,
  EdgeAISummarizeResponse,
  EdgeAITranslateRequest,
  EdgeAITranslateResponse,
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
        classify(payload: EdgeAIClassifyRequest) {
          return $fetch<EdgeAIClassifyResponse>(`${routeBase}/classify`, {
            method: 'POST',
            body: payload,
          })
        },
        embed(payload: EdgeAIEmbedRequest) {
          return $fetch<EdgeAIEmbedResponse>(`${routeBase}/embed`, {
            method: 'POST',
            body: payload,
          })
        },
        summarize(payload: EdgeAISummarizeRequest) {
          return $fetch<EdgeAISummarizeResponse>(`${routeBase}/summarize`, {
            method: 'POST',
            body: payload,
          })
        },
        translate(payload: EdgeAITranslateRequest) {
          return $fetch<EdgeAITranslateResponse>(`${routeBase}/translate`, {
            method: 'POST',
            body: payload,
          })
        },
        fillMask(payload: EdgeAIFillMaskRequest) {
          return $fetch<EdgeAIFillMaskResponse>(`${routeBase}/fill-mask`, {
            method: 'POST',
            body: payload,
          })
        },
      },
    },
  }
})
