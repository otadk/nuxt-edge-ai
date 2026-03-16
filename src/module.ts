import { isAbsolute, resolve } from 'node:path'
import {
  addImportsDir,
  addPlugin,
  addServerHandler,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
import type {
  EdgeAIGenerationOptions,
  EdgeAIPublicRuntimeConfig,
  EdgeAIServerRuntimeConfig,
} from './runtime/types'

export type {
  EdgeAIPullResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
} from './runtime/types'

export interface EdgeAIModelOptions {
  id: string
  task: 'text-generation'
  localPath?: string
  allowRemote: boolean
  dtype?: string
  generation: EdgeAIGenerationOptions
}

export interface ModuleOptions {
  routeBase: string
  runtime: 'transformers-wasm' | 'mock'
  cacheDir: string
  warmup: boolean
  model: EdgeAIModelOptions
}

function resolveMaybeAbsolute(rootDir: string, value?: string) {
  if (!value) {
    return undefined
  }

  return isAbsolute(value) ? value : resolve(rootDir, value)
}

function normalizeRouteBase(routeBase: string) {
  const normalized = routeBase.trim().replace(/\/+$/, '')
  return normalized || '/api/edge-ai'
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-edge-ai',
    configKey: 'edgeAI',
  },
  defaults: {
    routeBase: '/api/edge-ai',
    runtime: 'transformers-wasm',
    cacheDir: './.cache/nuxt-edge-ai',
    warmup: false,
    model: {
      id: 'Xenova/distilgpt2',
      task: 'text-generation',
      allowRemote: true,
      dtype: 'q8',
      generation: {
        maxNewTokens: 96,
        temperature: 0.7,
        topP: 0.9,
        doSample: true,
        repetitionPenalty: 1.05,
      },
    },
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const routeBase = normalizeRouteBase(options.routeBase)
    const cacheDir = resolveMaybeAbsolute(nuxt.options.rootDir, options.cacheDir) ?? options.cacheDir
    const modelLocalPath = resolveMaybeAbsolute(nuxt.options.rootDir, options.model.localPath)
    const runtimeConfig = nuxt.options.runtimeConfig as typeof nuxt.options.runtimeConfig & {
      edgeAI?: EdgeAIServerRuntimeConfig
      public: typeof nuxt.options.runtimeConfig.public & {
        edgeAI?: EdgeAIPublicRuntimeConfig
      }
    }

    runtimeConfig.edgeAI = {
      routeBase,
      runtime: options.runtime,
      cacheDir,
      warmup: options.warmup,
      model: {
        id: options.model.id,
        task: options.model.task,
        localPath: modelLocalPath,
        allowRemote: options.model.allowRemote,
        dtype: options.model.dtype,
        generation: {
          maxNewTokens: options.model.generation.maxNewTokens,
          temperature: options.model.generation.temperature,
          topP: options.model.generation.topP,
          doSample: options.model.generation.doSample,
          repetitionPenalty: options.model.generation.repetitionPenalty,
        },
      },
    } as EdgeAIServerRuntimeConfig

    runtimeConfig.public.edgeAI = {
      routeBase,
      runtime: options.runtime,
      defaultModel: options.model.id,
    } as EdgeAIPublicRuntimeConfig

    addImportsDir(resolver.resolve('./runtime/composables'))
    addPlugin(resolver.resolve('./runtime/plugin'))

    addServerHandler({
      route: `${routeBase}/health`,
      method: 'get',
      handler: resolver.resolve('./runtime/server/api/health.get'),
    })

    addServerHandler({
      route: `${routeBase}/pull`,
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/pull.post'),
    })

    addServerHandler({
      route: `${routeBase}/generate`,
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/generate.post'),
    })

    addTypeTemplate({
      filename: 'types/nuxt-edge-ai.d.ts',
      getContents: () => `import type { NuxtApp } from '#app'
import type {
  EdgeAIPullResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse
} from 'nuxt-edge-ai'

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

export {}
`,
    })
  },
})
