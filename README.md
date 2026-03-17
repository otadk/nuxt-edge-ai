# nuxt-edge-ai

[![npm version](https://img.shields.io/npm/v/nuxt-edge-ai/latest.svg)](https://www.npmjs.com/package/nuxt-edge-ai)
[![npm downloads](https://img.shields.io/npm/dm/nuxt-edge-ai.svg)](https://www.npmjs.com/package/nuxt-edge-ai)
[![license](https://img.shields.io/npm/l/nuxt-edge-ai.svg)](./LICENSE)
[![nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com/)
[![ci](https://github.com/otadk/nuxt-edge-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/otadk/nuxt-edge-ai/actions/workflows/ci.yml)

`nuxt-edge-ai` is a Nuxt module for building local-first AI applications with a real server-side WASM inference runtime and an optional remote API fallback.

It ships:

- a Nuxt module install surface
- Nitro API routes for health, model pull, and generation
- a client composable for app-side usage
- an `EdgeAI` SDK with an OpenAI-like `chat.completions.create()` surface
- switchable `local`, `remote`, and `mock` providers behind one module API
- a vendored `transformers.js` + `onnxruntime-web` runtime inside the package
- no Ollama, no `llama.cpp`, no Rust/C++/native runtime dependency for consumers

The model weights are not bundled. Users either point the module at a local model directory or allow it to download and cache the model on first run.

## Features

- Nuxt module install surface designed for app integration
- Nitro endpoints for health, pull, and generate workflows
- local-first server-side inference with bundled WASM runtime assets
- optional OpenAI-compatible remote provider for stronger hosted models
- OpenAI-compatible `chat/completions` endpoint for SDK-style integration
- published package includes vendored inference runtime files
- no consumer requirement for Ollama, Rust, C++, Python, or native AI runtimes

## Why this exists

The goal is to make `nuxt-edge-ai` a credible, publishable Nuxt module:

- installable in a regular Nuxt app
- able to run a real local model
- packaged as JS/TS + WASM only

## Current runtime

Current local runtime path:

- `transformers.js` web build
- `onnxruntime-web` WASM backend
- server-side execution through Nitro

Built-in local preset:

- `distilgpt2`

The local path is intentionally conservative now. When local inference is not enough, the module can fall back to a remote OpenAI-compatible API.

## Install

```bash
pnpm add nuxt-edge-ai
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  edgeAI: {
    provider: 'local',
    cacheDir: './.cache/nuxt-edge-ai',
    preset: 'distilgpt2',
    remote: {
      enabled: true,
      fallback: true,
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
    },
  },
})
```

```vue
<script setup lang="ts">
const edgeAI = useEdgeAI()

await edgeAI.pull()

const result = await edgeAI.generate({
  prompt: 'Write a pitch for a local-first Nuxt AI module.',
})
</script>
```

## Configuration

Top-level module options:

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `routeBase` | `string` | `/api/edge-ai` | Base path for module endpoints |
| `provider` | `'local' \| 'remote' \| 'mock'` | `local` | Runtime backend selector |
| `runtime` | `'transformers-wasm' \| 'mock'` | legacy | Backward-compatible alias for older configs |
| `cacheDir` | `string` | `./.cache/nuxt-edge-ai` | Cache and model asset directory |
| `warmup` | `boolean` | `false` | Warm the runtime on health checks |
| `preset` | `string` | `distilgpt2` | Local model preset |
| `presets` | `Record<string, ...>` | `undefined` | Register additional local presets |
| `model` | `object` | see below | Override the local model preset |
| `remote` | `object` | see below | Remote provider and fallback settings |

Local model options:

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | `string` | `Xenova/distilgpt2` | Model identifier used when no local path is set |
| `task` | `'text-generation'` | `text-generation` | Current supported task |
| `localPath` | `string \| undefined` | `undefined` | Local model directory |
| `allowRemote` | `boolean` | `true` | Allow first-run download from remote model source |
| `dtype` | `string \| undefined` | `q8` | Runtime dtype passed to Transformers.js |
| `generation.maxNewTokens` | `number` | `96` | Max generated tokens |
| `generation.temperature` | `number` | `0.7` | Sampling temperature |
| `generation.topP` | `number` | `0.9` | Top-p sampling |
| `generation.doSample` | `boolean` | `true` | Enable sampling |
| `generation.repetitionPenalty` | `number` | `1.05` | Repetition penalty |

Remote provider options:

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `false` | Enable remote provider settings |
| `fallback` | `boolean` | `true` | Fall back to remote if local pull/generate fails |
| `baseUrl` | `string` | `https://api.openai.com/v1` | Remote API base URL |
| `path` | `string` | `/chat/completions` | OpenAI-compatible endpoint path |
| `model` | `string` | `gpt-4o-mini` | Default remote model ID |
| `apiKey` | `string \| undefined` | `undefined` | Inline API key |
| `headers` | `Record<string, string> \| undefined` | `undefined` | Extra request headers |
| `systemPrompt` | `string \| undefined` | `undefined` | Optional system instruction |

## Provider examples

Local-only mode:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  edgeAI: {
    provider: 'local',
    preset: 'distilgpt2',
    remote: {
      enabled: false,
    },
  },
})
```

Local with automatic remote fallback:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  edgeAI: {
    provider: 'local',
    preset: 'distilgpt2',
    remote: {
      enabled: true,
      fallback: true,
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
    },
  },
})
```

Custom preset registration:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  edgeAI: {
    presets: {
      'team-default': {
        label: 'Team Default',
        description: 'Project-specific local preset',
        model: {
          id: 'Xenova/distilgpt2',
          dtype: 'q8',
          generation: {
            maxNewTokens: 120,
          },
        },
      },
    },
    preset: 'team-default',
  },
})
```

## Consumer runtime guarantees

Consumers do not need to install:

- Ollama
- Rust
- C++
- Python
- `llama.cpp`
- extra runtime npm packages beyond this module

What consumers do need:

- a Node/Nitro server runtime
- a model path or permission to download a compatible model

## API surface

- `GET /api/edge-ai/health`
- `POST /api/edge-ai/pull`
- `POST /api/edge-ai/generate`
- `POST /api/edge-ai/chat/completions`
- `useEdgeAI().health()`
- `useEdgeAI().pull()`
- `useEdgeAI().generate()`
- `useEdgeAI().chatCompletions()`

Health responses also expose:

- `provider`
- `presets`
- `remoteFallback`
- `engine.ready`
- `engine.lastError`

## OpenAI-compatible chat completions

You can either point the official OpenAI client at the module's Nitro route, or use the package's own `EdgeAI` client with the same calling style.

Using `EdgeAI` directly:

```ts
import { EdgeAI } from 'nuxt-edge-ai'

const client = new EdgeAI({
  baseURL: 'http://localhost:3000/api/edge-ai',
})

const response = await client.chat.completions.create({
  model: 'openai/gpt-oss-20b:free',
  messages: [
    {
      role: 'user',
      content: "How many r's are in strawberry?",
    },
  ],
  reasoning: { enabled: true },
})
```

Using the OpenAI SDK against the same route:

```ts
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'http://localhost:3000/api/edge-ai',
  apiKey: 'local-dev-token',
})

const response = await client.chat.completions.create({
  model: 'openai/gpt-oss-20b:free',
  messages: [
    {
      role: 'user',
      content: "How many r's are in strawberry?",
    },
  ],
  reasoning: { enabled: true },
})
```

Inside a Nuxt app you can also use `useEdgeAI().client.chat.completions.create(...)`.

When the module is using a remote OpenAI-compatible backend, it forwards `messages`, `reasoning`, and any extra `remoteBody` fields. If the upstream provider returns `reasoning_details`, the module preserves them on `choices[0].message`.

Example OpenRouter-style config:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  edgeAI: {
    provider: 'remote',
    remote: {
      enabled: true,
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: 'openai/gpt-oss-20b:free',
    },
  },
})
```

## Troubleshooting

Common checks:

- Run `POST /api/edge-ai/health` first to confirm route wiring and runtime config.
- Use `provider: 'mock'` to separate module wiring issues from model/runtime issues.
- Remote fallback requires `edgeAI.remote.enabled: true` plus `edgeAI.remote.apiKey`.
- If `pull` fails, inspect server logs first. Most early failures are model-path or packaged-runtime issues.
- After changing vendored runtime files, always run `pnpm prepack` before validating a published-style install.

## Local development

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm vendor:runtime
pnpm lint
pnpm test
pnpm test:types
pnpm prepack
```

## Docs

See [`docs/index.md`](./docs/index.md) for the project docs tree.

Key docs:

- [`docs/getting-started.md`](./docs/getting-started.md)
- [`docs/api.md`](./docs/api.md)
- [`docs/models.md`](./docs/models.md)
- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/third-party.md`](./docs/third-party.md)

## Repository shape

- `src/module.ts`: module entry and runtime config wiring
- `src/runtime/`: composables, plugin, and Nitro runtime code
- `playground/`: interactive demo app
- `test/fixtures/`: module consumer fixtures
- `docs/`: module documentation
- `scripts/vendor-runtime.mjs`: vendored runtime generation

## Status

This is still an MVP, but it now supports three execution modes behind one API: `local`, `remote`, and `mock`.
