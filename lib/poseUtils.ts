import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface JointAngles {
  leftElbow: number;
  rightElbow: number;
  leftShoulder: number;
  rightShoulder: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  leftAnkle: number;
  rightAnkle: number;
  leftWrist: number;
  rightWrist: number;
}

export interface AngleFrame {
  timestamp: number;
  angles: JointAngles;
}

export interface ThresholdData {
  duration: number;
  sampleRate: number;
  frames: AngleFrame[];
}

const LANDMARK_INDICES = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

function calculateAngle(
  pointA: NormalizedLandmark,
  pointB: NormalizedLandmark,
  pointC: NormalizedLandmark
): number {
  const vectorBA = {
    x: pointA.x - pointB.x,
    y: pointA.y - pointB.y,
    z: pointA.z - pointB.z,
  };

  const vectorBC = {
    x: pointC.x - pointB.x,
    y: pointC.y - pointB.y,
    z: pointC.z - pointB.z,
  };

  const dotProduct =
    vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y + vectorBA.z * vectorBC.z;

  const magnitudeBA = Math.sqrt(
    vectorBA.x ** 2 + vectorBA.y ** 2 + vectorBA.z ** 2
  );
  const magnitudeBC = Math.sqrt(
    vectorBC.x ** 2 + vectorBC.y ** 2 + vectorBC.z ** 2
  );

  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return 0;
  }

  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRadians = Math.acos(clampedCos);
  const angleDegrees = (angleRadians * 180) / Math.PI;

  return Math.round(angleDegrees * 10) / 10;
}

export function extractJointAngles(
  landmarks: NormalizedLandmark[]
): JointAngles {
  const L = LANDMARK_INDICES;

  return {
    leftElbow: calculateAngle(
      landmarks[L.LEFT_SHOULDER],
      landmarks[L.LEFT_ELBOW],
      landmarks[L.LEFT_WRIST]
    ),
    rightElbow: calculateAngle(
      landmarks[L.RIGHT_SHOULDER],
      landmarks[L.RIGHT_ELBOW],
      landmarks[L.RIGHT_WRIST]
    ),
    leftShoulder: calculateAngle(
      landmarks[L.LEFT_ELBOW],
      landmarks[L.LEFT_SHOULDER],
      landmarks[L.LEFT_HIP]
    ),
    rightShoulder: calculateAngle(
      landmarks[L.RIGHT_ELBOW],
      landmarks[L.RIGHT_SHOULDER],
      landmarks[L.RIGHT_HIP]
    ),
    leftHip: calculateAngle(
      landmarks[L.LEFT_SHOULDER],
      landmarks[L.LEFT_HIP],
      landmarks[L.LEFT_KNEE]
    ),
    rightHip: calculateAngle(
      landmarks[L.RIGHT_SHOULDER],
      landmarks[L.RIGHT_HIP],
      landmarks[L.RIGHT_KNEE]
    ),
    leftKnee: calculateAngle(
      landmarks[L.LEFT_HIP],
      landmarks[L.LEFT_KNEE],
      landmarks[L.LEFT_ANKLE]
    ),
    rightKnee: calculateAngle(
      landmarks[L.RIGHT_HIP],
      landmarks[L.RIGHT_KNEE],
      landmarks[L.RIGHT_ANKLE]
    ),
    leftAnkle: calculateAngle(
      landmarks[L.LEFT_KNEE],
      landmarks[L.LEFT_ANKLE],
      landmarks[L.LEFT_FOOT_INDEX]
    ),
    rightAnkle: calculateAngle(
      landmarks[L.RIGHT_KNEE],
      landmarks[L.RIGHT_ANKLE],
      landmarks[L.RIGHT_FOOT_INDEX]
    ),
    leftWrist: calculateAngle(
      landmarks[L.LEFT_ELBOW],
      landmarks[L.LEFT_WRIST],
      landmarks[L.LEFT_INDEX]
    ),
    rightWrist: calculateAngle(
      landmarks[L.RIGHT_ELBOW],
      landmarks[L.RIGHT_WRIST],
      landmarks[L.RIGHT_INDEX]
    ),
  };
}
