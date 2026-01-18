import { FormDetector } from "../FormDetector";
import { PushupDetector } from "./PushupDetector";
import { SquatDetector } from "./SquatDetector";

export const detectorRegistry: Record<string, () => FormDetector> = {
  "PLACEHOLDER_PUSHUP_ID": () => new PushupDetector(),
  "PLACEHOLDER_SQUAT_ID": () => new SquatDetector(),
};

export function getDetectorForExercise(exerciseId: string): FormDetector | null {
  const factory = detectorRegistry[exerciseId];
  return factory ? factory() : null;
}

export { PushupDetector } from "./PushupDetector";
export { SquatDetector } from "./SquatDetector";
