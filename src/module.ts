import { isAbsolute, resolve } from 'node:path'
import {
  addImportsDir,
  addPlugin,
  addServerHandler,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'
import { builtinModelPresets, mergeModelConfig } from './runtime/presets'
import type {
  EdgeAIGenerationOptions,
  EdgeAIModelPresetDefinition,
  EdgeAIModelPresetSummary,
  EdgeAIModelResolvedConfig,
  EdgeAIPublicRuntimeConfig,
  EdgeAIProvider,
  EdgeAIRemoteConfig,
  EdgeAIServerRuntimeConfig,
} from './runtime/types'

export { EdgeAI } from './runtime/client'
export type { EdgeAIClientOptions } from './runtime/client'

export type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIRemoteMessage,
  EdgeAIRemoteReasoningOptions,
  EdgeAIPullResponse,
} from './runtime/types'

export interface EdgeAIModelOptions extends Partial<Omit<EdgeAIModelResolvedConfig, 'generation'>> {
  generation?: Partial<EdgeAIGenerationOptions>
}

export interface EdgeAIRemoteOptions extends Partial<EdgeAIRemoteConfig> {
  baseURL?: string
  headers?: Record<string, string>
}

export interface ModuleOptions {
  routeBase?: string
  provider?: EdgeAIProvider
  runtime?: 'transformers-wasm' | 'mock'
  cacheDir?: string
  warmup?: boolean
  preset?: string
  presets?: Record<string, Partial<EdgeAIModelPresetDefinition> & { model: EdgeAIModelOptions }>
  model?: EdgeAIModelOptions
  remote?: EdgeAIRemoteOptions
}

function resolveMaybeAbsolute(rootDir: string, value?: string) {
  if (!value) {
    return undefined
  }

  return isAbsolute(value) ? value : resolve(rootDir, value)
}

function normalizeRouteBase(routeBase?: string) {
  const normalized = routeBase?.trim().replace(/\/+$/, '')
  return normalized || '/api/edge-ai'
}

function resolveProvider(options: ModuleOptions): EdgeAIProvider {
  if (options.runtime === 'mock') {
    return 'mock'
  }

  return options.provider || 'local'
}

function resolveRuntime(provider: EdgeAIProvider) {
  if (provider === 'local') {
    return 'transformers-wasm' as const
  }

  return provider
}

function normalizePresetRegistry(
  presets?: ModuleOptions['presets'],
): Record<string, EdgeAIModelPresetDefinition> {
  const normalized: Record<string, EdgeAIModelPresetDefinition> = { ...builtinModelPresets }

  for (const [id, preset] of Object.entries(presets || {})) {
    normalized[id] = {
      label: preset.label || id,
      description: preset.description || `Custom preset "${id}".`,
      model: mergeModelConfig(builtinModelPresets.distilgpt2!.model, preset.model),
    }
  }

  return normalized
}

function toPresetSummary(id: string, preset: EdgeAIModelPresetDefinition): EdgeAIModelPresetSummary {
  return {
    id,
    label: preset.label,
    description: preset.description,
    model: {
      id: preset.model.id,
      task: preset.model.task,
      dtype: preset.model.dtype,
    },
  }
}

function resolveRemoteConfig(remote?: EdgeAIRemoteOptions): EdgeAIRemoteConfig {
  return {
    enabled: remote?.enabled ?? false,
    fallback: remote?.fallback ?? true,
    baseUrl: remote?.baseUrl || remote?.baseURL || 'https://api.openai.com/v1',
    apiKey: remote?.apiKey,
    path: remote?.path || '/chat/completions',
    model: remote?.model || 'gpt-4o-mini',
    headers: remote?.headers,
    systemPrompt: remote?.systemPrompt,
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-edge-ai',
    configKey: 'edgeAI',
  },
  defaults: {
    routeBase: '/api/edge-ai',
    provider: 'local',
    cacheDir: './.cache/nuxt-edge-ai',
    warmup: false,
    preset: 'distilgpt2',
    model: {},
    remote: {
      enabled: false,
      fallback: true,
      baseUrl: 'https://api.openai.com/v1',
      path: '/chat/completions',
      model: 'gpt-4o-mini',
    },
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const routeBase = normalizeRouteBase(options.routeBase)
    const provider = resolveProvider(options)
    const runtime = resolveRuntime(provider)
    const cacheDir = resolveMaybeAbsolute(nuxt.options.rootDir, options.cacheDir) ?? './.cache/nuxt-edge-ai'
    const presetRegistry = normalizePresetRegistry(options.presets)
    const presetId = options.preset || 'distilgpt2'
    const preset = presetRegistry[presetId]

    if (!preset) {
      throw new Error(
        `Unknown edgeAI preset "${presetId}". Available presets: ${Object.keys(presetRegistry).join(', ')}`,
      )
    }

    const model = mergeModelConfig(preset.model, options.model)
    const runtimeConfig = nuxt.options.runtimeConfig as unknown as {
      edgeAI?: EdgeAIServerRuntimeConfig
      public: {
        edgeAI?: EdgeAIPublicRuntimeConfig
      }
    }
    const presets = Object.entries(presetRegistry).map(([id, entry]) => toPresetSummary(id, entry))
    const serverModel: EdgeAIModelResolvedConfig = {
      ...model,
      localPath: resolveMaybeAbsolute(nuxt.options.rootDir, model.localPath),
    }
    const remote = resolveRemoteConfig(options.remote)
    const serverRuntimeConfig: EdgeAIServerRuntimeConfig = {
      routeBase,
      provider,
      runtime,
      cacheDir,
      warmup: Boolean(options.warmup),
      preset: provider === 'local' ? presetId : undefined,
      model: serverModel,
      remote,
      presets,
    }

    runtimeConfig.edgeAI = serverRuntimeConfig

    runtimeConfig.public.edgeAI = {
      routeBase,
      provider,
      runtime,
      defaultModel: provider === 'remote' ? remote.model : serverModel.id,
      remoteModel: remote.model,
      preset: provider === 'local' ? presetId : undefined,
      presets,
      remoteFallback: remote.fallback,
    }

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

    addServerHandler({
      route: `${routeBase}/chat/completions`,
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/chat-completions.post'),
    })

    addTypeTemplate({
      filename: 'types/nuxt-edge-ai.d.ts',
      getContents: () => `import type { NuxtApp } from '#app'
import type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
  EdgeAIClientOptions,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIHealthResponse,
  EdgeAIPullResponse
} from 'nuxt-edge-ai'
import type { EdgeAI } from 'nuxt-edge-ai'

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

export {}
`,
    })
  },
})
