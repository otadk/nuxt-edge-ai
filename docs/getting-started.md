# Getting Started

## 1. Install

```bash
pnpm add nuxt-edge-ai
```

## 2. Register the module

```ts
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

## 3. Warm the model

```ts
const edgeAI = useEdgeAI()
await edgeAI.pull()
```

The first pull may download model files into the configured cache directory.

## 4. Generate text

```ts
const result = await edgeAI.generate({
  prompt: 'Describe a local-first Nuxt AI product.',
})
```

## 5. Health check

```ts
const health = await edgeAI.health()
```

Useful fields:

- `health.engine.ready`
- `health.engine.warmed`
- `health.engine.lastError`

## Mock mode for tests

Use mock mode in CI and fixture tests:

```ts
edgeAI: {
  runtime: 'mock',
  model: {
    id: 'mock-model',
    task: 'text-generation',
    allowRemote: false,
    generation: {
      maxNewTokens: 32,
      temperature: 0.1,
      topP: 1,
      doSample: false,
      repetitionPenalty: 1,
    },
  },
}
```
