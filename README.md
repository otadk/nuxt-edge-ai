# nuxt-edge-ai

`nuxt-edge-ai` is a Nuxt module for building local-first AI applications with a real server-side WASM inference runtime.

It ships:

- a Nuxt module install surface
- Nitro API routes for health, model pull, and generation
- a client composable for app-side usage
- a vendored `transformers.js` + `onnxruntime-web` runtime inside the package
- no Ollama, no `llama.cpp`, no Rust/C++/native runtime dependency for consumers

The model weights are not bundled. Users either point the module at a local model directory or allow it to download and cache the model on first run.

## Why this exists

The goal is to make `nuxt-edge-ai` a credible, publishable Nuxt module:

- installable in a regular Nuxt app
- able to run a real local model
- packaged as JS/TS + WASM only
- suitable as a strong portfolio / resume project

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

## Repository shape

This repository follows a Nuxt modules-style layout:

- `src/module.ts`: module entry and runtime config wiring
- `src/runtime/`: composables, plugin, and Nitro runtime code
- `playground/`: interactive demo app
- `test/fixtures/`: module consumer fixtures
- `docs/`: module documentation
- `scripts/vendor-runtime.mjs`: vendored runtime generation

## Status

This is an MVP, but it now runs a real model instead of mock text when `runtime: 'transformers-wasm'` is enabled.
