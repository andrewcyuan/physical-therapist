import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type Position = "UP" | "DOWN";

export interface FormDetector {
  detectPosition(landmarks: NormalizedLandmark[]): Position;
  checkForm(landmarks: NormalizedLandmark[]): string | null;
}
