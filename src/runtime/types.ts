export interface EdgeAIGenerateRequest {
  prompt: string
  model?: string
  generation?: Partial<EdgeAIGenerationOptions>
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

export interface EdgeAIModelInfo {
  id: string
  task: 'text-generation'
  localPath?: string
  allowRemote: boolean
  dtype?: string
  source: string
}

export interface EdgeAIServerRuntimeConfig {
  routeBase: string
  runtime: 'transformers-wasm' | 'mock'
  cacheDir: string
  warmup: boolean
  model: {
    id: string
    task: 'text-generation'
    localPath?: string
    allowRemote: boolean
    dtype?: string
    generation: EdgeAIGenerationOptions
  }
}

export interface EdgeAIPublicRuntimeConfig {
  routeBase: string
  runtime: 'transformers-wasm' | 'mock'
  defaultModel: string
}

export interface EdgeAIEngineState {
  active: 'transformers-wasm' | 'mock'
  ready: boolean
  warmed: boolean
  loading: boolean
  cacheDir?: string
  lastError?: string
}

export interface EdgeAIHealthResponse {
  status: 'ok'
  runtime: 'transformers-wasm' | 'mock'
  model: EdgeAIModelInfo
  defaults: EdgeAIGenerationOptions
  engine: EdgeAIEngineState
}

export interface EdgeAIPullResponse {
  status: 'ready'
  runtime: 'transformers-wasm' | 'mock'
  model: EdgeAIModelInfo
  engine: EdgeAIEngineState
  loadedNow: boolean
}

export interface EdgeAIGenerateResponse {
  text: string
  model: string
  runtime: 'transformers-wasm' | 'mock'
  provider: 'transformers.js-wasm' | 'mock'
  generation: EdgeAIGenerationOptions
  metrics: EdgeAIMetrics
}
