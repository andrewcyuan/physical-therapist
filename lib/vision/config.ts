export interface VisionConfig {
  failureThreshold: number;
  inferenceInterval: number;
  imageQuality: number;
  imageSize: number;
  requestTimeout: number;
  enableFallback: boolean;
  modelVersion: string;
}

export const VISION_CONFIG: VisionConfig = {
  failureThreshold: 3,
  inferenceInterval: 1000,
  imageQuality: 0.7,
  imageSize: 512,
  requestTimeout: 5000,
  enableFallback: true,
  modelVersion: "gpt-5-nano",
};
