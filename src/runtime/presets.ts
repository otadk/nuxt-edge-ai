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
  'distilbert-sst2': {
    label: 'DistilBERT Sentiment',
    description: 'Sentiment analysis (positive/negative) using DistilBERT fine-tuned on SST-2.',
    model: {
      id: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      task: 'text-classification',
      allowRemote: true,
      dtype: 'fp32',
    },
  },
  'minilm-l6-v2': {
    label: 'MiniLM Embedding',
    description: '384-dimensional text embeddings using all-MiniLM-L6-v2. Ideal for semantic search and RAG.',
    model: {
      id: 'Xenova/all-MiniLM-L6-v2',
      task: 'feature-extraction',
      allowRemote: true,
      dtype: 'fp32',
    },
  },
  'distilbart-cnn': {
    label: 'DistilBART Summarization',
    description: 'Text summarization using DistilBART fine-tuned on CNN/DailyMail.',
    model: {
      id: 'Xenova/distilbart-cnn-6-6',
      task: 'summarization',
      allowRemote: true,
      dtype: 'fp32',
      generation: {
        ...defaultGeneration,
        maxNewTokens: 128,
      },
    },
  },
  'opus-mt-en-zh': {
    label: 'Opus-MT en→zh',
    description: 'English to Chinese translation using Helsinki-NLP Opus-MT.',
    model: {
      id: 'Xenova/opus-mt-en-zh',
      task: 'translation',
      allowRemote: true,
      dtype: 'fp32',
      generation: {
        ...defaultGeneration,
        maxNewTokens: 256,
      },
    },
  },
  'opus-mt-zh-en': {
    label: 'Opus-MT zh→en',
    description: 'Chinese to English translation using Helsinki-NLP Opus-MT.',
    model: {
      id: 'Xenova/opus-mt-zh-en',
      task: 'translation',
      allowRemote: true,
      dtype: 'fp32',
      generation: {
        ...defaultGeneration,
        maxNewTokens: 256,
      },
    },
  },
  'bert-base-uncased': {
    label: 'BERT Fill-Mask',
    description: 'Masked token prediction using BERT base uncased. Use [MASK] token in your text.',
    model: {
      id: 'Xenova/bert-base-uncased',
      task: 'fill-mask',
      allowRemote: true,
      dtype: 'fp32',
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
  const resolvedId = overrides?.id || base?.id || builtinModelPresets.distilgpt2!.model.id
  const resolvedTask = overrides?.task ?? base?.task ?? 'text-generation'

  return {
    id: resolvedId,
    task: resolvedTask,
    localPath: overrides?.localPath ?? base?.localPath,
    allowRemote: overrides?.allowRemote ?? base?.allowRemote ?? true,
    dtype: overrides?.dtype ?? base?.dtype,
    generation: resolveGenerationDefaults(base?.generation, overrides?.generation),
  }
}
