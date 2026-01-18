import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { FormDetector, Position } from "../FormDetector";

const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
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

function averageAngle(angle1: number, angle2: number): number {
  return (angle1 + angle2) / 2;
}

export class SquatDetector implements FormDetector {
  private lastPosition: Position = "UP";

  detectPosition(landmarks: NormalizedLandmark[]): Position {
    const leftKneeAngle = calculateAngle(
      landmarks[LANDMARKS.LEFT_HIP],
      landmarks[LANDMARKS.LEFT_KNEE],
      landmarks[LANDMARKS.LEFT_ANKLE]
    );

    const rightKneeAngle = calculateAngle(
      landmarks[LANDMARKS.RIGHT_HIP],
      landmarks[LANDMARKS.RIGHT_KNEE],
      landmarks[LANDMARKS.RIGHT_ANKLE]
    );

    const kneeAngle = averageAngle(leftKneeAngle, rightKneeAngle);

    if (kneeAngle <= 100) {
      this.lastPosition = "DOWN";
      return "DOWN";
    }

    if (kneeAngle >= 150) {
      this.lastPosition = "UP";
      return "UP";
    }

    return this.lastPosition;
  }

  checkForm(landmarks: NormalizedLandmark[]): string | null {
    const leftKneeAngle = calculateAngle(
      landmarks[LANDMARKS.LEFT_HIP],
      landmarks[LANDMARKS.LEFT_KNEE],
      landmarks[LANDMARKS.LEFT_ANKLE]
    );

    const rightKneeAngle = calculateAngle(
      landmarks[LANDMARKS.RIGHT_HIP],
      landmarks[LANDMARKS.RIGHT_KNEE],
      landmarks[LANDMARKS.RIGHT_ANKLE]
    );

    const kneeAngle = averageAngle(leftKneeAngle, rightKneeAngle);

    const leftHipAngle = calculateAngle(
      landmarks[LANDMARKS.LEFT_SHOULDER],
      landmarks[LANDMARKS.LEFT_HIP],
      landmarks[LANDMARKS.LEFT_KNEE]
    );

    const rightHipAngle = calculateAngle(
      landmarks[LANDMARKS.RIGHT_SHOULDER],
      landmarks[LANDMARKS.RIGHT_HIP],
      landmarks[LANDMARKS.RIGHT_KNEE]
    );

    const hipAngle = averageAngle(leftHipAngle, rightHipAngle);

    const leftKneeY = landmarks[LANDMARKS.LEFT_KNEE].y;
    const leftAnkleY = landmarks[LANDMARKS.LEFT_ANKLE].y;
    const rightKneeY = landmarks[LANDMARKS.RIGHT_KNEE].y;
    const rightAnkleY = landmarks[LANDMARKS.RIGHT_ANKLE].y;

    if (kneeAngle < 100 && hipAngle > 100) {
      return "Sit back more - push your hips back as you squat";
    }

    if (leftKneeY < leftAnkleY || rightKneeY < rightAnkleY) {
      return "Don't let your knees go past your toes";
    }

    if (kneeAngle > 100 && kneeAngle < 140) {
      return "Go lower - aim for thighs parallel to the ground";
    }

    return null;
  }
}
