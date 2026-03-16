# Third-party Runtime

`nuxt-edge-ai` currently vendors runtime assets from:

- `@huggingface/transformers`
- `onnxruntime-web`

## Why

The module must remain self-contained at runtime for consumers.

That means the published package needs to carry the exact JS/WASM assets it depends on.

## Vendored files

- patched `transformers.web.mjs`
- `ort.wasm.min.mjs`
- `ort-wasm-simd-threaded.mjs`
- `ort-wasm-simd-threaded.wasm`

## Source generation

Vendored assets are refreshed with:

```bash
pnpm vendor:runtime
```

## License notes

The vendoring script also copies available third-party license files into:

- `src/runtime/server/vendor/licenses/`

This should be reviewed before publish and expanded if additional vendored assets are added.
