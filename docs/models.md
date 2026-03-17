# Models

## Built-in local presets

- `distilgpt2`
  Fast smoke-test preset based on `Xenova/distilgpt2`.

## What this module can actually run

This module is not a generic “all Hugging Face models” launcher.

The local provider is designed for:

- `Transformers.js` compatible tasks
- ONNX-backed models
- model repositories that work with the bundled WASM runtime

So the right strategy is:

- ship a minimal verified preset
- let users override the model ID
- let teams register their own presets in `nuxt.config.ts`

## Local model fields

- `model.id`: remote model ID
- `model.localPath`: optional local model directory
- `model.allowRemote`: whether remote download is allowed
- `model.dtype`: runtime dtype hint
- `model.generation.*`: default generation parameters

## Custom preset registration

```ts
export default defineNuxtConfig({
  modules: ['nuxt-edge-ai'],
  edgeAI: {
    provider: 'local',
    preset: 'team-default',
    presets: {
      'team-default': {
        label: 'Team Default',
        description: 'Project-specific verified ONNX model',
        model: {
          id: 'Xenova/distilgpt2',
          dtype: 'q8',
          generation: {
            maxNewTokens: 120,
          },
        },
      },
    },
  },
})
```

## Local model strategy

Two supported modes:

1. Remote-first
   - set `model.id`
   - keep `allowRemote: true`
   - let the module download and cache files

2. Local-first
   - set `model.localPath`
   - optionally disable remote download
   - point at a prepared model directory

## Remote provider strategy

If local WASM quality or latency is not enough, either switch to `provider: 'remote'` or keep `provider: 'local'` and enable remote fallback.

That keeps:

- the same Nuxt module
- the same Nitro routes
- the same composable API

But replaces local inference with a hosted OpenAI-compatible backend.

## Notes

- model weights are intentionally excluded from the npm package
- cache location is configured through `edgeAI.cacheDir`
- larger instruct models should be introduced as verified presets, not as undocumented “maybe works” IDs
