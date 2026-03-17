import type { EdgeAIGenerationOptions, EdgeAIModelPresetDefinition, EdgeAIModelResolvedConfig } from './types'

type PartialModelConfig = Partial<Omit<EdgeAIModelResolvedConfig, 'generation'>> & {
  generation?: Partial<EdgeAIGenerationOptions>
}

const defaultGeneration: EdgeAIGenerationOptions = {
  maxNewTokens: 96,
  temperature: 0.7,
  topP: 0.9,
  doSample: true,
  repetitionPenalty: 1.05,
}

export const builtinModelPresets: Record<string, EdgeAIModelPresetDefinition> = {
  distilgpt2: {
    label: 'DistilGPT2',
    description: 'Small baseline text-generation model for quick smoke tests.',
    model: {
      id: 'Xenova/distilgpt2',
      task: 'text-generation',
      allowRemote: true,
      dtype: 'q8',
      generation: {
        ...defaultGeneration,
      },
    },
  },
}

export function resolveGenerationDefaults(
  defaults?: Partial<EdgeAIGenerationOptions>,
  overrides?: Partial<EdgeAIGenerationOptions>,
): EdgeAIGenerationOptions {
  return {
    maxNewTokens: overrides?.maxNewTokens ?? defaults?.maxNewTokens ?? defaultGeneration.maxNewTokens,
    temperature: overrides?.temperature ?? defaults?.temperature ?? defaultGeneration.temperature,
    topP: overrides?.topP ?? defaults?.topP ?? defaultGeneration.topP,
    doSample: overrides?.doSample ?? defaults?.doSample ?? defaultGeneration.doSample,
    repetitionPenalty: overrides?.repetitionPenalty ?? defaults?.repetitionPenalty ?? defaultGeneration.repetitionPenalty,
  }
}

export function mergeModelConfig(
  base?: PartialModelConfig,
  overrides?: PartialModelConfig,
): EdgeAIModelResolvedConfig {
  const fallbackPreset = builtinModelPresets.distilgpt2!
  const source = overrides?.id || base?.id || fallbackPreset.model.id

  return {
    id: source,
    task: overrides?.task ?? base?.task ?? 'text-generation',
    localPath: overrides?.localPath ?? base?.localPath,
    allowRemote: overrides?.allowRemote ?? base?.allowRemote ?? true,
    dtype: overrides?.dtype ?? base?.dtype,
    generation: resolveGenerationDefaults(base?.generation, overrides?.generation),
  }
}
