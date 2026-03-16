import { access, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIGenerationOptions,
  EdgeAIHealthResponse,
  EdgeAIModelInfo,
  EdgeAIServerRuntimeConfig,
  EdgeAIPullResponse,
} from '../../types'

interface TransformersRuntimeModule {
  env: {
    allowLocalModels: boolean
    allowRemoteModels: boolean
    cacheDir: string
    localModelPath: string
    useFS?: boolean
    useFSCache: boolean
    backends: {
      onnx: {
        wasm: {
          numThreads: number
          proxy: boolean
          wasmPaths?: string | Record<string, string>
        }
      }
    }
  }
  pipeline: (
    task: string,
    model: string,
    options: {
      device: 'wasm'
      dtype?: string
    },
  ) => Promise<(prompt: string, options: Record<string, unknown>) => Promise<unknown>>
}

type TransformersEnv = TransformersRuntimeModule['env']

interface RuntimeState {
  loading: boolean
  warmed: boolean
  lastError?: string
  modelKey?: string
  pipeline?: (prompt: string, options: Record<string, unknown>) => Promise<unknown>
  runtime?: TransformersRuntimeModule
  initPromise?: Promise<void>
  pipelinePromise?: Promise<(prompt: string, options: Record<string, unknown>) => Promise<unknown>>
}

interface OnnxRuntimeModule {
  env?: {
    wasm?: {
      numThreads?: number
      proxy?: boolean
      wasmPaths?: string | Record<string, string>
    }
  }
}

const state: RuntimeState = {
  loading: false,
  warmed: false,
}

const require = createRequire(import.meta.url)

function contentTypeForExtension(extension: string) {
  switch (extension) {
    case '.json':
      return 'application/json'
    case '.wasm':
      return 'application/wasm'
    case '.txt':
      return 'text/plain; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

function installFileFetchShim() {
  const globalWithShim = globalThis as typeof globalThis & { __nuxtEdgeAIFileFetchShim?: boolean }
  if (globalWithShim.__nuxtEdgeAIFileFetchShim) {
    return
  }

  const originalFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url

    if (url.startsWith('file://')) {
      const fileUrl = new URL(url)
      const buffer = await readFile(fileUrl)
      return new Response(buffer, {
        headers: {
          'content-type': contentTypeForExtension(extname(fileUrl.pathname).toLowerCase()),
        },
      })
    }

    return originalFetch(input, init)
  }

  globalWithShim.__nuxtEdgeAIFileFetchShim = true
}

async function resolveVendoredOnnxRuntimeBaseUrl() {
  const candidates = new Set<string>()

  try {
    const moduleEntry = require.resolve('nuxt-edge-ai')
    candidates.add(join(dirname(moduleEntry), 'runtime', 'server', 'vendor', 'onnxruntime'))
  }
  catch {
    // Ignore package-resolution failures while developing the module itself.
  }

  candidates.add(resolve(process.cwd(), 'node_modules', 'nuxt-edge-ai', 'dist', 'runtime', 'server', 'vendor', 'onnxruntime'))
  candidates.add(resolve(process.cwd(), 'dist', 'runtime', 'server', 'vendor', 'onnxruntime'))
  candidates.add(resolve(process.cwd(), 'src', 'runtime', 'server', 'vendor', 'onnxruntime'))

  for (const candidate of candidates) {
    try {
      await access(join(candidate, 'ort-wasm-simd-threaded.mjs'))
      return `${pathToFileURL(candidate).href}/`
    }
    catch {
      // Keep scanning fallback locations.
    }
  }

  throw new Error('Unable to locate vendored onnxruntime-web assets on disk.')
}

async function loadTransformersRuntime() {
  if (state.runtime) {
    return state.runtime
  }

  if (!state.initPromise) {
    state.initPromise = (async () => {
      installFileFetchShim()

      const ortModule = await import('../vendor/onnxruntime/ort.wasm.min.mjs')
      const ort = ((ortModule as { InferenceSession?: unknown }).InferenceSession
        ? ortModule
        : (ortModule as { default?: unknown }).default) ?? ortModule
      const globalWithOrt = globalThis as typeof globalThis & Record<symbol, unknown>
      globalWithOrt[Symbol.for('onnxruntime')] = ort

      const transformers = await import('../vendor/huggingface/transformers.web.mjs') as TransformersRuntimeModule
      state.runtime = transformers
    })().catch((error) => {
      state.lastError = error instanceof Error ? error.message : String(error)
      state.initPromise = undefined
      throw error
    })
  }

  await state.initPromise
  return state.runtime as unknown as TransformersRuntimeModule
}

function ensureOnnxWasmEnv(env: TransformersEnv) {
  const envWithMutableBackends = env as TransformersEnv & {
    backends?: {
      onnx?: {
        wasm?: {
          numThreads?: number
          proxy?: boolean
          wasmPaths?: string | Record<string, string>
        }
      }
    }
  }

  envWithMutableBackends.backends ??= {}
  envWithMutableBackends.backends.onnx ??= {}
  envWithMutableBackends.backends.onnx.wasm ??= {}

  return envWithMutableBackends.backends.onnx.wasm
}

function resolveModelSource(config: EdgeAIServerRuntimeConfig, modelOverride?: string): EdgeAIModelInfo {
  const requestedModel = modelOverride?.trim()
  const source = requestedModel || config.model.localPath || config.model.id

  return {
    id: requestedModel || config.model.id,
    task: config.model.task,
    localPath: config.model.localPath,
    allowRemote: config.model.allowRemote,
    dtype: config.model.dtype,
    source,
  }
}

function currentEngineState(config: EdgeAIServerRuntimeConfig): EdgeAIHealthResponse['engine'] {
  return {
    active: config.runtime,
    ready: config.runtime === 'mock' || Boolean(state.pipeline),
    warmed: config.runtime === 'mock' || state.warmed,
    loading: state.loading,
    cacheDir: config.cacheDir,
    lastError: state.lastError,
  }
}

async function ensureTransformersPipeline(config: EdgeAIServerRuntimeConfig, modelOverride?: string) {
  const model = resolveModelSource(config, modelOverride)
  const modelKey = `${model.source}::${model.dtype ?? 'default'}`

  if (state.pipeline && state.modelKey === modelKey) {
    return { pipeline: state.pipeline, loadedNow: false, model }
  }

  if (!state.pipelinePromise || state.modelKey !== modelKey) {
    state.loading = true
    state.pipelinePromise = (async () => {
      const transformers = await loadTransformersRuntime()
      transformers.env.allowLocalModels = Boolean(config.model.localPath)
      transformers.env.allowRemoteModels = config.model.allowRemote
      transformers.env.useFS = false
      transformers.env.useFSCache = false

      if (transformers.env.useFSCache) {
        transformers.env.cacheDir = config.cacheDir
      }

      if (config.model.localPath) {
        transformers.env.localModelPath = config.model.localPath
      }

      const wasmBaseUrl = await resolveVendoredOnnxRuntimeBaseUrl()
      const onnxWasmEnv = ensureOnnxWasmEnv(transformers.env)
      onnxWasmEnv.wasmPaths = wasmBaseUrl
      onnxWasmEnv.numThreads = 1
      onnxWasmEnv.proxy = false

      const ortRuntime = (globalThis as typeof globalThis & Record<symbol, OnnxRuntimeModule | undefined>)[Symbol.for('onnxruntime')]
      if (ortRuntime) {
        ortRuntime.env ??= {}
        ortRuntime.env.wasm ??= {}
        ortRuntime.env.wasm.wasmPaths = wasmBaseUrl
        ortRuntime.env.wasm.numThreads = 1
        ortRuntime.env.wasm.proxy = false
      }

      return transformers.pipeline(config.model.task, model.source, {
        device: 'wasm',
        dtype: model.dtype,
      })
    })()
      .then((pipeline) => {
        state.pipeline = pipeline
        state.modelKey = modelKey
        state.warmed = true
        state.lastError = undefined
        return pipeline
      })
      .catch((error) => {
        state.lastError = error instanceof Error ? error.message : String(error)
        state.pipeline = undefined
        state.modelKey = undefined
        throw error
      })
      .finally(() => {
        state.loading = false
      })
  }

  const pipeline = await state.pipelinePromise
  return { pipeline, loadedNow: true, model }
}

function resolveGenerationOptions(
  defaults: EdgeAIGenerationOptions,
  overrides?: EdgeAIGenerateRequest['generation'],
) {
  return {
    maxNewTokens: overrides?.maxNewTokens ?? defaults.maxNewTokens,
    temperature: overrides?.temperature ?? defaults.temperature,
    topP: overrides?.topP ?? defaults.topP,
    doSample: overrides?.doSample ?? defaults.doSample,
    repetitionPenalty: overrides?.repetitionPenalty ?? defaults.repetitionPenalty,
  } satisfies EdgeAIGenerationOptions
}

function extractGeneratedText(prompt: string, output: unknown) {
  const firstItem = Array.isArray(output) ? output[0] : output

  if (firstItem && typeof firstItem === 'object' && 'generated_text' in firstItem) {
    const generatedText = String(firstItem.generated_text ?? '')
    return generatedText.startsWith(prompt) ? generatedText.slice(prompt.length).trim() : generatedText.trim()
  }

  if (typeof firstItem === 'string') {
    return firstItem.trim()
  }

  return JSON.stringify(output)
}

function runMockInference(config: EdgeAIServerRuntimeConfig, input: EdgeAIGenerateRequest): EdgeAIGenerateResponse {
  const generation = resolveGenerationOptions(config.model.generation, input.generation)
  const text = [
    `Mock runtime for "${input.model || config.model.id}".`,
    `Prompt received: ${input.prompt}`,
    'Switch `edgeAI.runtime` to `transformers-wasm` to run the real WASM model runtime.',
  ].join(' ')

  return {
    text,
    model: input.model || config.model.id,
    runtime: 'mock',
    provider: 'mock',
    generation,
    metrics: {
      latencyMs: 0,
      promptLength: input.prompt.length,
      completionLength: text.length,
    },
  }
}

export async function getEdgeAIHealth(config: EdgeAIServerRuntimeConfig): Promise<EdgeAIHealthResponse> {
  const model = resolveModelSource(config)

  if (config.runtime === 'transformers-wasm' && config.warmup && !state.pipeline && !state.loading) {
    try {
      await ensureTransformersPipeline(config)
    }
    catch {
      // Health should still return status even if warmup fails.
    }
  }

  return {
    status: 'ok',
    runtime: config.runtime,
    model,
    defaults: config.model.generation,
    engine: currentEngineState(config),
  }
}

export async function pullEdgeAIModel(config: EdgeAIServerRuntimeConfig): Promise<EdgeAIPullResponse> {
  if (config.runtime === 'mock') {
    return {
      status: 'ready',
      runtime: 'mock',
      model: resolveModelSource(config),
      engine: currentEngineState(config),
      loadedNow: false,
    }
  }

  const { loadedNow, model } = await ensureTransformersPipeline(config)

  return {
    status: 'ready',
    runtime: 'transformers-wasm',
    model,
    engine: currentEngineState(config),
    loadedNow,
  }
}

export async function generateEdgeAIText(
  config: EdgeAIServerRuntimeConfig,
  input: EdgeAIGenerateRequest,
): Promise<EdgeAIGenerateResponse> {
  if (config.runtime === 'mock') {
    return runMockInference(config, input)
  }

  const generation = resolveGenerationOptions(config.model.generation, input.generation)
  const start = performance.now()
  const { pipeline, model } = await ensureTransformersPipeline(config, input.model)
  const output = await pipeline(input.prompt, {
    max_new_tokens: generation.maxNewTokens,
    temperature: generation.temperature,
    top_p: generation.topP,
    do_sample: generation.doSample,
    repetition_penalty: generation.repetitionPenalty,
  })

  const text = extractGeneratedText(input.prompt, output)

  return {
    text,
    model: model.id,
    runtime: 'transformers-wasm',
    provider: 'transformers.js-wasm',
    generation,
    metrics: {
      latencyMs: Number((performance.now() - start).toFixed(2)),
      promptLength: input.prompt.length,
      completionLength: text.length,
    },
  }
}
