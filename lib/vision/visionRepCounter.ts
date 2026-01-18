import { RepCheckInstructions, VisionRepPhase } from "@/types/repCheckInstructions";

export function parsePhaseFromResponse(response: string): VisionRepPhase {
  const normalized = response.toUpperCase().trim();
  if (normalized.includes("START")) return "start";
  if (normalized.includes("END")) return "end";
  if (normalized.includes("MIDWAY")) return "midway";
  return "unknown";
}

export function buildRepCountingPrompt(instructions: RepCheckInstructions): string {
  return `Exercise: ${instructions.exerciseContext}. START position: ${instructions.startDescription}. END position: ${instructions.endDescription}. Which position is the person in? Reply with only START, END, or MIDWAY.`;
}
