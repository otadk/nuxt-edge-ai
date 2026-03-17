# nuxt-edge-ai docs

This docs directory describes the current module surface as implemented in `src/` and exercised by the fixture tests.

## Current update summary

- runtime selection is now provider-driven: `local`, `remote`, and `mock`
- local model config is now organized around named presets plus partial `model` overrides
- the module now exposes an OpenAI-compatible `chat/completions` route and an exported `EdgeAI` client SDK
- local execution can fall back to a remote OpenAI-compatible provider when enabled
- runtime metadata now reports provider state, preset summaries, and remote-fallback availability
- the old Rust proof-of-concept path has been removed; the published runtime remains JS/WASM only

## Core concepts

- `provider`: selects `local`, `remote`, or `mock` execution
- `preset`: selects a named local model definition such as `distilgpt2`
- `model`: overrides fields on top of the selected preset
- `remote`: configures the hosted OpenAI-compatible backend and fallback behavior
- `EdgeAI`: a small client SDK for calling the module routes with an OpenAI-like `chat.completions.create()` surface

## Docs map

- `getting-started.md`: install, configure, warm, and call the module from a Nuxt app
- `api.md`: Nitro routes, request and response shapes, and client/composable surfaces
- `models.md`: built-in presets, model strategy, and local versus remote execution choices
- `architecture.md`: runtime loading, provider flow, and packaging decisions
- `third-party.md`: vendored runtime assets, patches, and license notes

## Suggested next additions

- `examples.md`
- `roadmap.md`
- `publishing.md`
