export interface RepCheckInstructions {
  startDescription: string;
  endDescription: string;
  exerciseContext: string;
}

export type VisionRepPhase = "start" | "end" | "midway" | "unknown";
