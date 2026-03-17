import { access, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  EdgeAIChatCompletionRequest,
  EdgeAIChatCompletionResponse,
  EdgeAIGenerateRequest,
  EdgeAIGenerateResponse,
  EdgeAIGenerationOptions,
  EdgeAIHealthResponse,
  EdgeAIModelInfo,
  EdgeAIRemoteMessage,
  EdgeAIRemoteConfig,
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

interface MutableOnnxWasmConfig {
  numThreads?: number
  proxy?: boolean
  wasmPaths?: string | Record<string, string>
}

interface MutableTransformersEnv {
  backends?: {
    onnx?: {
      wasm?: MutableOnnxWasmConfig
    }
  }
}

interface RemoteChatCompletionResponse {
  id?: string
  model?: string
  choices?: Array<{
    message?: {
      role?: string
      content?: string | Array<{ type?: string, text?: string }>
      reasoning_details?: unknown
      [key: string]: unknown
    }
    text?: string
  }>
  output_text?: string
  output?: Array<{
    content?: Array<{
      text?: string
      type?: string
    }>
  }>
}

const state: RuntimeState = {
  loading: false,
  warmed: false,
}

const require = createRequire(resolve(process.cwd(), 'package.json'))
const vendoredModuleExtensions = ['.js', '.mjs'] as const

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

function isModuleResolutionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const hasResolutionCode = 'code' in error
    && (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'ENOENT')

  return hasResolutionCode
    || error.message.includes('Cannot find module')
    || error.message.includes('Could not resolve')
}

async function findVendoredFilePath(candidateDir: string, basename: string) {
  for (const extension of vendoredModuleExtensions) {
    const candidatePath = join(candidateDir, `${basename}${extension}`)
    try {
      await access(candidatePath)
      return candidatePath
    }
    catch {
      // Try the next extension.
    }
  }

  return undefined
}

function resolveVendoredCandidateDirs(subdirectory: string) {
  const candidates = new Set<string>()

  try {
    const moduleEntry = require.resolve('nuxt-edge-ai')
    candidates.add(join(dirname(moduleEntry), 'runtime', 'server', 'vendor', subdirectory))
  }
  catch {
    // Ignore package-resolution failures while developing the module itself.
  }

  candidates.add(resolve(process.cwd(), 'node_modules', 'nuxt-edge-ai', 'dist', 'runtime', 'server', 'vendor', subdirectory))
  candidates.add(resolve(process.cwd(), 'dist', 'runtime', 'server', 'vendor', subdirectory))
  candidates.add(resolve(process.cwd(), 'src', 'runtime', 'server', 'vendor', subdirectory))

  return [...candidates]
}

async function resolveVendoredFilePath(subdirectory: string, basename: string) {
  for (const candidateDir of resolveVendoredCandidateDirs(subdirectory)) {
    const candidatePath = await findVendoredFilePath(candidateDir, basename)
    if (candidatePath) {
      return candidatePath
    }
  }

  throw new Error(`Unable to locate vendored file "${subdirectory}/${basename}" on disk.`)
}

async function importVendoredModule<T>(subdirectory: string, basename: string) {
  try {
    const modulePath = await resolveVendoredFilePath(subdirectory, basename)
    return await import(pathToFileURL(modulePath).href) as T
  }
  catch (error) {
    if (isModuleResolutionError(error)) {
      throw new Error(`Unable to resolve vendored module "${subdirectory}/${basename}"`)
    }

    throw error
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
  const runtimeModulePath = await resolveVendoredFilePath('onnxruntime', 'ort-wasm-simd-threaded')
  return `${pathToFileURL(dirname(runtimeModulePath)).href}/`
}

async function loadTransformersRuntime() {
  if (state.runtime) {
    return state.runtime
  }

  if (!state.initPromise) {
    state.initPromise = (async () => {
      installFileFetchShim()

      const ortModule = await importVendoredModule<{ InferenceSession?: unknown, default?: unknown }>('onnxruntime', 'ort.wasm.min')
      const ort = ((ortModule as { InferenceSession?: unknown }).InferenceSession
        ? ortModule
        : (ortModule as { default?: unknown }).default) ?? ortModule
      const globalWithOrt = globalThis as typeof globalThis & Record<symbol, unknown>
      globalWithOrt[Symbol.for('onnxruntime')] = ort

      const transformers = await importVendoredModule<TransformersRuntimeModule>('huggingface', 'transformers.web')
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
  const envWithMutableBackends = env as unknown as MutableTransformersEnv

  envWithMutableBackends.backends ??= {}
  envWithMutableBackends.backends.onnx ??= {}
  envWithMutableBackends.backends.onnx.wasm ??= {}

  return envWithMutableBackends.backends.onnx.wasm
}

function resolveLocalModelSource(config: EdgeAIServerRuntimeConfig, modelOverride?: string): EdgeAIModelInfo {
  const requestedModel = modelOverride?.trim()
  const source = requestedModel || config.model.localPath || config.model.id

  return {
    id: requestedModel || config.model.id,
    task: config.model.task,
    localPath: config.model.localPath,
    allowRemote: config.model.allowRemote,
    dtype: config.model.dtype,
    source,
    preset: config.preset,
  }
}

function resolveRemoteModelSource(config: EdgeAIServerRuntimeConfig, modelOverride?: string): EdgeAIModelInfo {
  const model = modelOverride?.trim() || config.remote.model

  return {
    id: model,
    task: 'text-generation',
    allowRemote: true,
    source: model,
  }
}

function currentEngineState(config: EdgeAIServerRuntimeConfig): EdgeAIHealthResponse['engine'] {
  if (config.provider === 'mock') {
    return {
      active: 'mock',
      ready: true,
      warmed: true,
      loading: false,
      lastError: state.lastError,
    }
  }

  if (config.provider === 'remote') {
    return {
      active: 'remote',
      ready: Boolean(resolveRemoteApiKey(config.remote) || config.remote.headers?.Authorization),
      warmed: false,
      loading: false,
      lastError: state.lastError,
    }
  }

  return {
    active: 'local',
    ready: Boolean(state.pipeline),
    warmed: state.warmed,
    loading: state.loading,
    cacheDir: config.cacheDir,
    lastError: state.lastError,
  }
}

async function ensureTransformersPipeline(config: EdgeAIServerRuntimeConfig, modelOverride?: string) {
  const model = resolveLocalModelSource(config, modelOverride)
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

function extractTextFromMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object' && 'text' in item) {
          return String(item.text ?? '')
        }

        return ''
      })
      .join('')
  }

  if (content == null) {
    return ''
  }

  return String(content)
}

function resolvePromptFromMessages(messages?: EdgeAIRemoteMessage[]) {
  const lastUserMessage = [...(messages || [])]
    .reverse()
    .find(message => message.role === 'user')

  if (!lastUserMessage) {
    return ''
  }

  return extractTextFromMessageContent(lastUserMessage.content).trim()
}

function resolvePrompt(input: EdgeAIGenerateRequest) {
  return input.prompt?.trim() || resolvePromptFromMessages(input.messages)
}

function buildRemoteMessages(config: EdgeAIServerRuntimeConfig, input: EdgeAIGenerateRequest) {
  if (input.messages?.length) {
    return input.messages
  }

  const prompt = resolvePrompt(input)
  return [
    ...(config.remote.systemPrompt
      ? [{ role: 'system', content: config.remote.systemPrompt }]
      : []),
    { role: 'user', content: prompt },
  ] satisfies EdgeAIRemoteMessage[]
}

function buildAssistantMessage(payload: RemoteChatCompletionResponse, text: string): EdgeAIRemoteMessage {
  const choiceMessage = payload.choices?.[0]?.message

  if (choiceMessage && typeof choiceMessage === 'object') {
    return {
      role: choiceMessage.role || 'assistant',
      ...choiceMessage,
      content: choiceMessage.content ?? text,
    }
  }

  return {
    role: 'assistant',
    content: text,
  }
}

function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 4))
}

function toChatCompletionResponse(
  request: EdgeAIChatCompletionRequest,
  result: EdgeAIGenerateResponse,
): EdgeAIChatCompletionResponse {
  const promptText = resolvePromptFromMessages(request.messages)
  const message = result.assistantMessage || {
    role: 'assistant',
    content: result.text,
  }

  return {
    id: `chatcmpl_${Date.now().toString(36)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: result.model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: estimateTokenCount(promptText),
      completion_tokens: estimateTokenCount(result.text),
      total_tokens: estimateTokenCount(promptText) + estimateTokenCount(result.text),
    },
    provider: result.provider,
    runtime: result.runtime,
    fellBackToRemote: result.fellBackToRemote,
  }
}

function runMockInference(config: EdgeAIServerRuntimeConfig, input: EdgeAIGenerateRequest): EdgeAIGenerateResponse {
  const generation = resolveGenerationOptions(config.model.generation, input.generation)
  const prompt = resolvePrompt(input)
  const text = [
    `Mock provider for "${input.model || config.model.id}".`,
    `Prompt received: ${prompt}`,
    'Switch `edgeAI.provider` to `local` or `remote` to run a real model.',
  ].join(' ')

  return {
    text,
    model: input.model || config.model.id,
    runtime: 'mock',
    provider: 'mock',
    generation,
    metrics: {
      latencyMs: 0,
      promptLength: prompt.length,
      completionLength: text.length,
    },
    assistantMessage: {
      role: 'assistant',
      content: text,
    },
  }
}

function resolveRemoteApiKey(config: EdgeAIRemoteConfig) {
  if (config.apiKey?.trim()) {
    return config.apiKey.trim()
  }

  return undefined
}

function joinUrl(baseURL: string, path: string) {
  const normalizedBase = baseURL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

function extractRemoteText(payload: RemoteChatCompletionResponse) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  const choice = payload.choices?.[0]
  if (typeof choice?.message?.content === 'string' && choice.message.content.trim()) {
    return choice.message.content.trim()
  }

  if (Array.isArray(choice?.message?.content)) {
    const text = choice.message.content
      .map(item => item.text || '')
      .join('')
      .trim()

    if (text) {
      return text
    }
  }

  if (typeof choice?.text === 'string' && choice.text.trim()) {
    return choice.text.trim()
  }

  const outputText = payload.output?.[0]?.content
    ?.map(item => item.text || '')
    .join('')
    .trim()

  if (outputText) {
    return outputText
  }

  return JSON.stringify(payload)
}

async function runRemoteInference(
  config: EdgeAIServerRuntimeConfig,
  input: EdgeAIGenerateRequest,
): Promise<EdgeAIGenerateResponse> {
  const generation = resolveGenerationOptions(config.model.generation, input.generation)
  const apiKey = resolveRemoteApiKey(config.remote)

  if (!apiKey && !config.remote.headers?.Authorization) {
    throw new Error(
      'Missing remote API key. Set edgeAI.remote.apiKey.',
    )
  }

  const start = performance.now()
  const body = {
    model: input.model || config.remote.model,
    messages: buildRemoteMessages(config, input),
    temperature: generation.temperature,
    top_p: generation.topP,
    max_tokens: generation.maxNewTokens,
    stream: false,
    ...(input.reasoning ? { reasoning: input.reasoning } : {}),
    ...(input.remoteBody || {}),
  }
  const response = await fetch(joinUrl(config.remote.baseUrl, config.remote.path), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      ...config.remote.headers,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Remote inference failed with ${response.status}: ${errorText}`)
  }

  const payload = await response.json() as RemoteChatCompletionResponse
  const text = extractRemoteText(payload)
  const assistantMessage = buildAssistantMessage(payload, text)
  const prompt = resolvePrompt(input)
  state.lastError = undefined

  return {
    text,
    model: payload.model || input.model || config.remote.model,
    runtime: 'remote',
    provider: 'openai-compatible',
    generation,
    metrics: {
      latencyMs: Number((performance.now() - start).toFixed(2)),
      promptLength: prompt.length,
      completionLength: text.length,
    },
    assistantMessage,
  }
}

function shouldUseRemoteFallback(config: EdgeAIServerRuntimeConfig) {
  return config.provider === 'local' && config.remote.enabled && config.remote.fallback
}

function shouldForceRemote(config: EdgeAIServerRuntimeConfig, input: EdgeAIGenerateRequest) {
  return Boolean(input.remote && config.remote.enabled)
}

async function withRemoteFallback<T>(
  config: EdgeAIServerRuntimeConfig,
  action: () => Promise<T>,
  fallback: () => Promise<T>,
) {
  try {
    return await action()
  }
  catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error)

    if (!shouldUseRemoteFallback(config)) {
      throw error
    }

    return fallback()
  }
}

export async function getEdgeAIHealth(config: EdgeAIServerRuntimeConfig): Promise<EdgeAIHealthResponse> {
  const model = config.provider === 'remote'
    ? resolveRemoteModelSource(config)
    : resolveLocalModelSource(config)

  if (config.provider === 'local' && config.warmup && !state.pipeline && !state.loading) {
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
    provider: config.provider,
    model,
    defaults: config.model.generation,
    engine: currentEngineState(config),
    presets: config.presets,
    remoteFallback: config.remote.fallback,
  }
}

export async function pullEdgeAIModel(config: EdgeAIServerRuntimeConfig): Promise<EdgeAIPullResponse> {
  if (config.provider === 'mock') {
    return {
      status: 'ready',
      runtime: 'mock',
      provider: 'mock',
      model: resolveLocalModelSource(config),
      engine: currentEngineState(config),
      loadedNow: false,
    }
  }

  if (config.provider === 'remote') {
    return {
      status: 'ready',
      runtime: 'remote',
      provider: 'remote',
      model: resolveRemoteModelSource(config),
      engine: currentEngineState(config),
      loadedNow: false,
    }
  }

  return withRemoteFallback(
    config,
    async (): Promise<EdgeAIPullResponse> => {
      const { loadedNow, model } = await ensureTransformersPipeline(config)

      return {
        status: 'ready' as const,
        runtime: 'transformers-wasm' as const,
        provider: 'local' as const,
        model,
        engine: currentEngineState(config),
        loadedNow,
      }
    },
    async (): Promise<EdgeAIPullResponse> => ({
      status: 'ready' as const,
      runtime: 'remote' as const,
      provider: 'remote' as const,
      model: resolveRemoteModelSource(config),
      engine: {
        active: 'remote',
        ready: true,
        warmed: false,
        loading: false,
        lastError: state.lastError,
      },
      loadedNow: false,
      fellBackToRemote: true,
    }),
  )
}

export async function generateEdgeAIText(
  config: EdgeAIServerRuntimeConfig,
  input: EdgeAIGenerateRequest,
): Promise<EdgeAIGenerateResponse> {
  if (config.provider === 'mock') {
    return runMockInference(config, input)
  }

  if (config.provider === 'remote') {
    return runRemoteInference(config, input)
  }

  if (shouldForceRemote(config, input)) {
    const remoteResponse = await runRemoteInference(config, input)
    return {
      ...remoteResponse,
      fellBackToRemote: true,
    }
  }

  return withRemoteFallback(
    config,
    async (): Promise<EdgeAIGenerateResponse> => {
      const generation = resolveGenerationOptions(config.model.generation, input.generation)
      const start = performance.now()
      const { pipeline, model } = await ensureTransformersPipeline(config, input.model)
      const prompt = resolvePrompt(input)
      const output = await pipeline(prompt, {
        max_new_tokens: generation.maxNewTokens,
        temperature: generation.temperature,
        top_p: generation.topP,
        do_sample: generation.doSample,
        repetition_penalty: generation.repetitionPenalty,
      })

      const text = extractGeneratedText(prompt, output)

      return {
        text,
        model: model.id,
        runtime: 'transformers-wasm' as const,
        provider: 'transformers.js-wasm' as const,
        generation,
        metrics: {
          latencyMs: Number((performance.now() - start).toFixed(2)),
          promptLength: prompt.length,
          completionLength: text.length,
        },
        assistantMessage: {
          role: 'assistant',
          content: text,
        },
      }
    },
    async (): Promise<EdgeAIGenerateResponse> => {
      const fallback = await runRemoteInference(config, input)
      return {
        ...fallback,
        fellBackToRemote: true,
      }
    },
  )
}

export async function createEdgeAIChatCompletion(
  config: EdgeAIServerRuntimeConfig,
  input: EdgeAIChatCompletionRequest,
): Promise<EdgeAIChatCompletionResponse> {
  const prompt = resolvePromptFromMessages(input.messages)
  const generation: EdgeAIGenerateRequest['generation'] = {
    ...(typeof input.max_tokens === 'number' ? { maxNewTokens: input.max_tokens } : {}),
    ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
    ...(typeof input.top_p === 'number' ? { topP: input.top_p } : {}),
  }

  const result = await generateEdgeAIText(config, {
    prompt,
    remote: input.remote,
    model: input.model,
    messages: input.messages,
    reasoning: input.reasoning,
    remoteBody: input.remoteBody,
    generation,
  })

  return toChatCompletionResponse(input, result)
}
