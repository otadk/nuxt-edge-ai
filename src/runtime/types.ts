export type EdgeAIProvider = 'local' | 'remote' | 'mock'
export type EdgeAIRuntime = 'transformers-wasm' | 'remote' | 'mock'
export type EdgeAITask
  = | 'text-generation'
    | 'text-classification'
    | 'feature-extraction'
    | 'summarization'
    | 'translation'
    | 'fill-mask'
export type EdgeAIResponseProvider = 'transformers.js-wasm' | 'openai-compatible' | 'mock'

export interface EdgeAIRemoteMessage {
  role: string
  content: unknown
  reasoning_details?: unknown
  [key: string]: unknown
}

export interface EdgeAIRemoteReasoningOptions {
  enabled?: boolean
  [key: string]: unknown
}

export interface EdgeAIGenerateRequest {
  prompt?: string
  remote?: boolean
  model?: string
  task?: EdgeAITask
  messages?: EdgeAIRemoteMessage[]
  reasoning?: EdgeAIRemoteReasoningOptions
  remoteBody?: Record<string, unknown>
  generation?: Partial<EdgeAIGenerationOptions>
  stream?: boolean
}

export interface EdgeAIChatCompletionRequest {
  model?: string
  messages: EdgeAIRemoteMessage[]
  remote?: boolean
  reasoning?: EdgeAIRemoteReasoningOptions
  stream?: boolean
  max_tokens?: number
  temperature?: number
  top_p?: number
  remoteBody?: Record<string, unknown>
  [key: string]: unknown
}

export interface EdgeAIGenerationOptions {
  maxNewTokens: number
  temperature: number
  topP: number
  doSample: boolean
  repetitionPenalty: number
}

export interface EdgeAIMetrics {
  latencyMs: number
  promptLength: number
  completionLength: number
}

export interface EdgeAIModelResolvedConfig {
  id: string
  task: EdgeAITask
  localPath?: string
  allowRemote: boolean
  dtype?: string
  generation?: EdgeAIGenerationOptions
}

export interface EdgeAIModelPresetDefinition {
  label: string
  description: string
  model: EdgeAIModelResolvedConfig
}

export interface EdgeAIModelPresetSummary {
  id: string
  label: string
  description: string
  model: {
    id: string
    task: EdgeAITask
    dtype?: string
  }
}

export interface EdgeAIModelInfo {
  id: string
  task: EdgeAITask
  localPath?: string
  allowRemote: boolean
  dtype?: string
  source: string
  preset?: string
}

export interface EdgeAIRemoteConfig {
  enabled: boolean
  fallback: boolean
  baseUrl: string
  apiKey?: string
  path: string
  model: string
  headers?: Record<string, string>
  systemPrompt?: string
}

export interface EdgeAIServerRuntimeConfig {
  routeBase: string
  provider: EdgeAIProvider
  runtime: EdgeAIRuntime
  cacheDir: string
  warmup: boolean
  preset?: string
  model: EdgeAIModelResolvedConfig
  remote: EdgeAIRemoteConfig
  presets: EdgeAIModelPresetSummary[]
  rag?: {
    storePath?: string
    chunkSize?: number
    chunkOverlap?: number
  }
}

export interface EdgeAIPublicRuntimeConfig {
  routeBase: string
  provider: EdgeAIProvider
  runtime: EdgeAIRuntime
  defaultModel: string
  remoteModel: string
  preset?: string
  presets: EdgeAIModelPresetSummary[]
  remoteFallback: boolean
}

export interface EdgeAIEngineState {
  active: EdgeAIProvider
  ready: boolean
  warmed: boolean
  loading: boolean
  cacheDir?: string
  lastError?: string
}

export interface EdgeAIHealthResponse {
  status: 'ok'
  runtime: EdgeAIRuntime
  provider: EdgeAIProvider
  model: EdgeAIModelInfo
  defaults: EdgeAIGenerationOptions
  engine: EdgeAIEngineState
  presets: EdgeAIModelPresetSummary[]
  remoteFallback: boolean
}

export interface EdgeAIPullResponse {
  status: 'ready'
  runtime: EdgeAIRuntime
  provider: EdgeAIProvider
  model: EdgeAIModelInfo
  engine: EdgeAIEngineState
  loadedNow: boolean
  fellBackToRemote?: boolean
}

export interface EdgeAIGenerateResponse {
  text: string
  model: string
  runtime: EdgeAIRuntime
  provider: EdgeAIResponseProvider
  generation: EdgeAIGenerationOptions
  metrics: EdgeAIMetrics
  fellBackToRemote?: boolean
  assistantMessage?: EdgeAIRemoteMessage
}

export interface EdgeAIChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Array<{
    index: number
    message: EdgeAIRemoteMessage
    finish_reason: 'stop'
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  provider: EdgeAIResponseProvider
  runtime: EdgeAIRuntime
  fellBackToRemote?: boolean
}

// Task-specific request types
export interface EdgeAIClassifyRequest {
  text: string
  model?: string
  remote?: boolean
}

export interface EdgeAIEmbedRequest {
  texts: string | string[]
  pooling?: 'mean' | 'cls'
  model?: string
  remote?: boolean
}

export interface EdgeAISummarizeRequest {
  text: string
  model?: string
  remote?: boolean
  generation?: Partial<EdgeAIGenerationOptions>
}

export interface EdgeAITranslateRequest {
  text: string
  srcLang?: string
  tgtLang?: string
  model?: string
  remote?: boolean
}

export interface EdgeAIFillMaskRequest {
  text: string
  model?: string
  topK?: number
  remote?: boolean
}

// Task-specific response types
export interface EdgeAIClassifyResponse {
  predictions: Array<{ label: string, score: number }>
  model: string
  runtime: EdgeAIRuntime
  provider: EdgeAIResponseProvider
}

export interface EdgeAIEmbedResponse {
  embeddings: number[][]
  shape: [number, number]
  model: string
  runtime: EdgeAIRuntime
  provider: EdgeAIResponseProvider
}

export interface EdgeAISummarizeResponse {
  summary: string
  model: string
  runtime: EdgeAIRuntime
  provider: EdgeAIResponseProvider
  generation: EdgeAIGenerationOptions
  metrics: EdgeAIMetrics
}

export interface EdgeAITranslateResponse {
  translation: string
  model: string
  runtime: EdgeAIRuntime
  provider: EdgeAIResponseProvider
  metrics: EdgeAIMetrics
}

export interface EdgeAIFillMaskResponse {
  results: Array<{
    sequence: string
    score: number
    token: number
    tokenStr: string
  }>
  model: string
  runtime: EdgeAIRuntime
  provider: EdgeAIResponseProvider
}

// RAG types
export interface EdgeAIRagIngestRequest {
  files?: Array<{ name: string, content: string, type?: string }>
  url?: string
  chunkSize?: number
  chunkOverlap?: number
}

export interface EdgeAIRagIngestResponse {
  ingested: number
  chunks: number
  sources: string[]
  embedded: boolean
}

export interface EdgeAIRagQueryRequest {
  question: string
  topK?: number
  model?: string
  systemPrompt?: string
}

export interface EdgeAIRagQueryResponse extends EdgeAIGenerateResponse {
  sources: Array<{
    text: string
    similarity: number
    metadata: Record<string, unknown>
  }>
}

// Streaming types
export interface EdgeAIChatCompletionStreamResponse {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: Array<{
    index: number
    delta: Partial<EdgeAIRemoteMessage>
    finish_reason: 'stop' | null
  }>
}

export interface EdgeAIStreamCallbacks {
  onStart?: () => void
  onToken?: (token: string) => void
  onCompletion?: (text: string) => void
  onError?: (error: Error) => void
  onAbort?: (reason: string) => void
}

export interface EdgeAIStreamState {
  isLoading: boolean
  isStreaming: boolean
  text: string
  abortController: AbortController | null
}

// AI SDK Data Stream Protocol types
export interface DataStreamPart {
  type: string
  [key: string]: unknown
}

export interface TextStartPart extends DataStreamPart {
  type: 'text-start'
  id: string
}

export interface TextDeltaPart extends DataStreamPart {
  type: 'text-delta'
  id: string
  delta: string
}

export interface TextEndPart extends DataStreamPart {
  type: 'text-end'
  id: string
}

export interface StartPart extends DataStreamPart {
  type: 'start'
  messageId: string
}

export interface FinishPart extends DataStreamPart {
  type: 'finish'
  messageId?: string
}

export interface ErrorPart extends DataStreamPart {
  type: 'error'
  errorText: string
}

export type StreamPart = TextStartPart | TextDeltaPart | TextEndPart | StartPart | FinishPart | ErrorPart | DataStreamPart
