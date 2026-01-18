import {
  FormDetector,
  JointAngles,
  ThresholdData,
} from "../FormDetector";
import { PushupDetector } from "./PushupDetector";
import { SquatDetector } from "./SquatDetector";

type JointKey = keyof JointAngles;

const JOINT_KEYS: JointKey[] = [
  "leftHip",
  "leftKnee",
  "rightHip",
  "leftAnkle",
  "leftElbow",
  "leftWrist",
  "rightKnee",
  "rightAnkle",
  "rightElbow",
  "rightWrist",
  "leftShoulder",
  "rightShoulder",
];

function averageAngles(frames: ThresholdData["frames"]): JointAngles {
  const count = frames.length || 1;

  const sum: Record<JointKey, number> = {
    leftHip: 0,
    leftKnee: 0,
    rightHip: 0,
    leftAnkle: 0,
    leftElbow: 0,
    leftWrist: 0,
    rightKnee: 0,
    rightAnkle: 0,
    rightElbow: 0,
    rightWrist: 0,
    leftShoulder: 0,
    rightShoulder: 0,
  };

  for (const frame of frames) {
    for (const key of JOINT_KEYS) {
      sum[key] += frame.angles[key] ?? 0;
    }
  }

  const result = {} as JointAngles;
  for (const key of JOINT_KEYS) {
    result[key] = sum[key] / count;
  }

  return result;
}

function getPrimaryJoint(frames: ThresholdData["frames"]): JointKey {
  let bestKey: JointKey = "leftHip";
  let bestRange = 0;

  for (const key of JOINT_KEYS) {
    const values = frames.map((f) => f.angles[key] ?? 0);
    if (!values.length) continue;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    if (range > bestRange) {
      bestRange = range;
      bestKey = key;
    }
  }

  return bestKey;
}

class ThresholdDetector extends FormDetector {
  constructor(thresholdData: ThresholdData) {
    const frames = thresholdData.frames;

    const duration = thresholdData.duration || frames[frames.length - 1]?.timestamp || 0;
    const startWindowEnd = duration * 0.2;
    const bottomWindowStart = duration * 0.4;
    const bottomWindowEnd = duration * 0.6;

    const startFrames =
      frames.filter((f) => f.timestamp <= startWindowEnd) || frames.slice(0, 3);
    const bottomFrames =
      frames.filter(
        (f) => f.timestamp >= bottomWindowStart && f.timestamp <= bottomWindowEnd,
      ) || [frames[Math.floor(frames.length / 2)]];

    const validStartFrames = startFrames.length ? startFrames : frames.slice(0, 3);
    const validBottomFrames = bottomFrames.length
      ? bottomFrames
      : [frames[Math.floor(frames.length / 2)]];

    const startAngles = averageAngles(validStartFrames);
    const bottomAngles = averageAngles(validBottomFrames);

    const primaryJoint = getPrimaryJoint(frames);
    const startPrimary = startAngles[primaryJoint];
    const bottomPrimary = bottomAngles[primaryJoint];
    const rawAmplitude = Math.abs(bottomPrimary - startPrimary);
    const amplitude = Math.max(rawAmplitude, 15);

    const direction = bottomPrimary >= startPrimary ? 1 : -1;

    const startTolerance = Math.max(10, amplitude * 0.25);
    const bottomTolerance = Math.max(10, amplitude * 0.25);
    const velocityThreshold = Math.max(1, amplitude * 0.02);

    const minRepDuration = Math.max(400, duration * 0.4);
    const maxRepDuration = Math.max(3000, duration * 3);
    const restThreshold = Math.max(800, duration * 0.8);
    const setEndThreshold = Math.max(3000, duration * 4);

    const isAtStart = (angles: JointAngles) =>
      Math.abs(angles[primaryJoint] - startPrimary) <= startTolerance;

    const isAtBottom = (angles: JointAngles) =>
      Math.abs(angles[primaryJoint] - bottomPrimary) <= bottomTolerance;

    const movingTowardBottom = (current: JointAngles, previous: JointAngles) =>
      direction * (current[primaryJoint] - previous[primaryJoint]) >= velocityThreshold;

    const movingTowardStart = (current: JointAngles, previous: JointAngles) =>
      direction * (current[primaryJoint] - previous[primaryJoint]) <= -velocityThreshold;

    super({
      name: "threshold-based",
      startPosition: (angles) => isAtStart(angles),
      eccentricStarted: (current, previous) => movingTowardBottom(current, previous),
      turnaroundReached: (angles) => isAtBottom(angles),
      concentricStarted: (current, previous) => movingTowardStart(current, previous),
      endPosition: (angles) => isAtStart(angles),
      minRepDuration,
      maxRepDuration,
      restThreshold,
      setEndThreshold,
    });
  }
}

export const detectorRegistry: Record<string, () => FormDetector> = {
  "f5da3aad-07b4-45b8-a4f2-c38e5dfb2825": () => new PushupDetector(),
  "5f3936b9-12e0-4bd3-bb61-6597758ce11e": () => new SquatDetector(),
};

export function getDetectorForExercise(
  exerciseId: string,
  exerciseName?: string,
  thresholdData?: ThresholdData | null,
): FormDetector | null {
  const factory = detectorRegistry[exerciseId];
  if (factory) {
    return factory();
  }

  const normalizedName = exerciseName?.toLowerCase() ?? "";

  if (
    normalizedName.includes("pushup") ||
    normalizedName.includes("push-up") ||
    normalizedName.includes("push up")
  ) {
    return new PushupDetector();
  }

  if (normalizedName.includes("squat")) {
    return new SquatDetector();
  }

  if (thresholdData && Array.isArray(thresholdData.frames) && thresholdData.frames.length) {
    return new ThresholdDetector(thresholdData);
  }

  return null;
}

export { PushupDetector } from "./PushupDetector";
export { SquatDetector } from "./SquatDetector";
