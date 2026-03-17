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
    provider: 'local',
    cacheDir: './.cache/nuxt-edge-ai',
    preset: 'distilgpt2',
    remote: {
      enabled: true,
      fallback: true,
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
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

## 4.1 OpenAI-style client usage

```ts
import { EdgeAI } from 'nuxt-edge-ai'

const client = new EdgeAI({
  baseURL: 'http://localhost:3000/api/edge-ai',
})

const completion = await client.chat.completions.create({
  messages: [
    {
      role: 'user',
      content: 'Describe a local-first Nuxt AI product.',
    },
  ],
})
```

In Nuxt runtime code:

```ts
const edgeAI = useEdgeAI()

const completion = await edgeAI.client.chat.completions.create({
  messages: [
    {
      role: 'user',
      content: 'Describe a local-first Nuxt AI product.',
    },
  ],
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

## Remote provider for stronger hosted models

```ts
export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  edgeAI: {
    provider: 'remote',
    remote: {
      enabled: true,
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
    },
  },
})
```

The module keeps the same `useEdgeAI().generate()` call surface. Only the backend provider changes.

## OpenAI-compatible route

The module also exposes an OpenAI-style chat endpoint at:

```text
POST /api/edge-ai/chat/completions
```

Example with the official SDK:

```ts
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'http://localhost:3000/api/edge-ai',
  apiKey: 'dev-token',
})

const completion = await client.chat.completions.create({
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

For remote OpenAI-compatible providers such as OpenRouter, `messages`, `reasoning`, and provider-specific fields passed through `remoteBody` are forwarded as-is.

## Mock mode for tests

```ts
edgeAI: {
  provider: 'mock',
}
```

## Presets and overrides

Built-in local preset:

- `distilgpt2`

You can override a preset without redefining everything:

```ts
edgeAI: {
  preset: 'distilgpt2',
  model: {
    generation: {
      maxNewTokens: 96,
      temperature: 0.4,
    },
  },
}
```
