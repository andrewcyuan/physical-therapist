import { RepCheckInstructions, VisionRepPhase } from "@/types/repCheckInstructions";

export function parsePhaseFromResponse(response: string): VisionRepPhase {
  const normalized = response.toUpperCase().trim();
  if (normalized.includes("PREPARATION")) return "preparation";
  if (normalized.includes("START")) return "start";
  if (normalized.includes("END")) return "end";
  if (normalized.includes("MIDWAY")) return "midway";
  return "unknown";
}

export function buildRepCountingPrompt(instructions: RepCheckInstructions): string {
  return `You are analyzing a ${instructions.exerciseContext} exercise.

POSITIONS TO DETECT:
1. PREPARATION - Person is visible but NOT doing the exercise yet (standing, sitting, or getting ready)
2. START - ${instructions.startDescription}
3. MIDWAY - Person is between start and end positions (halfway through the movement)
4. END - ${instructions.endDescription}

RULES:
- If you see only a face or upper body with no exercise movement, answer PREPARATION
- If the person is not in an exercise position, answer PREPARATION
- If the person matches the START description exactly, answer START
- If the person matches the END description exactly, answer END
- If the person is between START and END, answer MIDWAY
- Look at body position, joint angles, and limb placement
- Be precise and consistent

Look at the image. Which position is the person in right now?`;
}

export function buildOrientationCheckPrompt(orientationInstructions: string): string {
  return `You are checking if the person in the image is following these orientation instructions for their exercise:

INSTRUCTIONS TO CHECK:
${orientationInstructions}

RULES:
- Look at the person's body position, camera angle, and overall setup
- Check if they match the orientation instructions above
- Only answer YES if the person is clearly following the instructions
- Answer NO if the person is not visible, not positioned correctly, or you cannot verify

Is the person following the orientation instructions? Answer only YES or NO.`;
}

export function parseOrientationResponse(response: string): boolean {
  const normalized = response.toUpperCase().trim();
  return normalized.includes("YES");
}
