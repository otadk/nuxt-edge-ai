# API

## Runtime surfaces

`nuxt-edge-ai` exposes the same capabilities through four surfaces:

- Nitro routes under `edgeAI.routeBase`
- `useEdgeAI()` inside a Nuxt app
- `nuxtApp.$edgeAI` from the injected plugin
- the exported `EdgeAI` client class for SDK-style usage

## Nitro routes

### `GET {routeBase}/health`

Returns module wiring and runtime state.

Important fields:

- `runtime`: resolved runtime mode, such as `transformers-wasm`, `remote`, or `mock`
- `provider`: requested execution provider, such as `local`, `remote`, or `mock`
- `model`: active model info, including `source` and optional `preset`
- `defaults`: default generation settings resolved for the module
- `engine`: readiness, warm state, loading flag, cache directory, and last error
- `presets`: public summaries of the available local presets
- `remoteFallback`: whether local execution may fall back to the remote provider

### `POST {routeBase}/pull`

Warms the active provider.

- `local`: initializes the Transformers.js pipeline and downloads model files if needed
- `remote`: returns remote-provider readiness metadata without loading a local model
- `mock`: returns immediately for tests and fixture validation

Important fields:

- `loadedNow`: `true` when the local pipeline was initialized by this request
- `fellBackToRemote`: `true` when local warmup failed and remote fallback was used instead

### `POST {routeBase}/generate`

Accepts a text-generation request.

Request fields:

- `prompt?: string`
- `messages?: EdgeAIRemoteMessage[]`
- `model?: string`
- `remote?: boolean`
- `reasoning?: { enabled?: boolean, ... }`
- `remoteBody?: Record<string, unknown>`
- `generation?: Partial<{ maxNewTokens, temperature, topP, doSample, repetitionPenalty }>`

Notes:

- either `prompt` or `messages` is required
- in local mode, `remote: true` forces the request through the remote provider if remote execution is enabled
- when using a remote backend, `messages`, `reasoning`, and `remoteBody` are forwarded to the upstream OpenAI-compatible API

Response fields:

- `text`
- `model`
- `runtime`
- `provider`
- `generation`
- `metrics`
- `fellBackToRemote?`
- `assistantMessage?`

### `POST {routeBase}/chat/completions`

Accepts an OpenAI-compatible chat request and returns a `chat.completion` response.

Supported request fields:

- `model?`
- `messages`
- `remote?`
- `reasoning?`
- `max_tokens?`
- `temperature?`
- `top_p?`
- `remoteBody?`

Current limitation:

- `stream: true` is rejected; streaming is not implemented yet

## Nuxt composable and plugin

`useEdgeAI()` and `nuxtApp.$edgeAI` expose:

- `routeBase`
- `provider`
- `runtime`
- `defaultModel`
- `remoteModel`
- `preset`
- `presets`
- `remoteFallback`
- `client`
- `pull()`
- `generate()`
- `chatCompletions()`
- `health()`

The `client` field is an `EdgeAI` instance already pointed at the module route base.

## `EdgeAI` client

The exported client class mirrors the route surface:

```ts
import { EdgeAI } from 'nuxt-edge-ai'

const client = new EdgeAI({
  baseURL: 'http://localhost:3000/api/edge-ai',
})

await client.health()
await client.pull()
await client.generate({ prompt: 'Describe the module.' })
await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Describe the module.' }],
})
```

Available methods:

- `health()`
- `pull()`
- `generate(payload)`
- `chat.completions.create(payload)`
- `responses.create(payload)` as an alias to `chat.completions.create(payload)`

## Provider behavior

- `provider: 'local'`: runs the vendored Transformers.js + ONNX Runtime WASM pipeline
- `provider: 'remote'`: skips local inference and forwards requests to the configured OpenAI-compatible backend
- `provider: 'mock'`: returns deterministic mock text for tests, CI, and wiring checks
