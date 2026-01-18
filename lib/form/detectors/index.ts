import { FormDetector } from "../FormDetector";
import { PushupDetector } from "./PushupDetector";
import { SquatDetector } from "./SquatDetector";

export const detectorRegistry: Record<string, () => FormDetector> = {
  "f5da3aad-07b4-45b8-a4f2-c38e5dfb2825": () => new PushupDetector(),
  "5f3936b9-12e0-4bd3-bb61-6597758ce11e": () => new SquatDetector(),
};

export function getDetectorForExercise(exerciseId: string): FormDetector | null {
  const factory = detectorRegistry[exerciseId];
  return factory ? factory() : null;
}

export { PushupDetector } from "./PushupDetector";
export { SquatDetector } from "./SquatDetector";
