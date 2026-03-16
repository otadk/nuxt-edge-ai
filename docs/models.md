# Models

## Default quick-start model

For fast validation:

- `Xenova/distilgpt2`

Pros:

- small
- fast first run
- easy to verify the runtime works

Cons:

- not instruction-tuned
- weak quality for product demos

## Better portfolio target

For a stronger demo after the module is stable:

- `onnx-community/Qwen2.5-0.5B-Instruct-ONNX`

This is the direction to move toward for a better interview demo.

## Configuration fields

- `model.id`: remote model ID
- `model.localPath`: optional local model directory
- `model.allowRemote`: whether remote download is allowed
- `model.dtype`: runtime dtype hint
- `model.generation.*`: default generation parameters

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

## Notes

- model weights are intentionally excluded from the npm package
- cache location is configured through `edgeAI.cacheDir`
- larger instruct models should be introduced after the MVP path is stable
