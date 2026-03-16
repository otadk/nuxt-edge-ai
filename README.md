# nuxt-edge-ai

[![npm version](https://img.shields.io/npm/v/nuxt-edge-ai/latest.svg)](https://www.npmjs.com/package/nuxt-edge-ai)
[![npm downloads](https://img.shields.io/npm/dm/nuxt-edge-ai.svg)](https://www.npmjs.com/package/nuxt-edge-ai)
[![license](https://img.shields.io/npm/l/nuxt-edge-ai.svg)](./LICENSE)
[![nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com/)
[![ci](https://github.com/otadk/nuxt-edge-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/otadk/nuxt-edge-ai/actions/workflows/ci.yml)

`nuxt-edge-ai` is a Nuxt module for building local-first AI applications with a real server-side WASM inference runtime.

It ships:

- a Nuxt module install surface
- Nitro API routes for health, model pull, and generation
- a client composable for app-side usage
- a vendored `transformers.js` + `onnxruntime-web` runtime inside the package
- no Ollama, no `llama.cpp`, no Rust/C++/native runtime dependency for consumers

The model weights are not bundled. Users either point the module at a local model directory or allow it to download and cache the model on first run.

## Features

- Nuxt module install surface designed for app integration
- Nitro endpoints for health, pull, and generate workflows
- local-first server-side inference with bundled WASM runtime assets
- published package includes vendored inference runtime files
- no consumer requirement for Ollama, Rust, C++, Python, or native AI runtimes

## Why this exists

The goal is to make `nuxt-edge-ai` a credible, publishable Nuxt module:

- installable in a regular Nuxt app
- able to run a real local model
- packaged as JS/TS + WASM only

## Current runtime

Current real runtime path:

- `transformers.js` web build
- `onnxruntime-web` WASM backend
- server-side execution through Nitro

Recommended first demo model:

- `Xenova/distilgpt2` for quick validation

Recommended next upgrade target:

- `onnx-community/Qwen2.5-0.5B-Instruct-ONNX`

## Install

```bash
pnpm add nuxt-edge-ai
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  edgeAI: {
    runtime: 'transformers-wasm',
    cacheDir: './.cache/nuxt-edge-ai',
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
| `runtime` | `'transformers-wasm' \| 'mock'` | `transformers-wasm` | Use `mock` for smoke tests and fixture validation |
| `cacheDir` | `string` | `./.cache/nuxt-edge-ai` | Cache and model asset directory |
| `warmup` | `boolean` | `false` | Warm the runtime on health checks |
| `model` | `object` | see below | Model runtime configuration |

Model options:

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
- `useEdgeAI().health()`
- `useEdgeAI().pull()`
- `useEdgeAI().generate()`

## Troubleshooting

Common checks:

- Run `POST /api/edge-ai/health` first to confirm route wiring and runtime config.
- Use `runtime: 'mock'` to separate module wiring issues from model/runtime issues.
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

This is an MVP, but it now runs a real model instead of mock text when `runtime: 'transformers-wasm'` is enabled.
