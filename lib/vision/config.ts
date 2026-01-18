export interface VisionConfig {
  failureThreshold: number;
  inferenceInterval: number;
  imageQuality: number;
  imageSize: number;
  requestTimeout: number;
  enableFallback: boolean;
  modelVersion: string;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  seed: number;
  maxCompletionTokens: number;
}

export const VISION_CONFIG: VisionConfig = {
  failureThreshold: 3,
  inferenceInterval: 1000,
  imageQuality: 0.7,
  imageSize: 512,
  requestTimeout: 8000,
  enableFallback: true,
  modelVersion: "gpt-5-nano-2025-08-07",
  temperature: 0,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  seed: 42,
  maxCompletionTokens: 100,
};
