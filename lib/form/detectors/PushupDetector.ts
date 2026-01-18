import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { FormDetector, Position } from "../FormDetector";

const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
};

function calculateAngle(
  pointA: NormalizedLandmark,
  pointB: NormalizedLandmark,
  pointC: NormalizedLandmark
): number {
  const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
                  Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return angle;
}

function averageAngle(angle1: number, angle2: number): number {
  return (angle1 + angle2) / 2;
}

function interpolate(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export class PushupDetector implements FormDetector {
  private formValidated = false;
  private lastPosition: Position = "UP";

  detectPosition(landmarks: NormalizedLandmark[]): Position {
    const leftElbowAngle = calculateAngle(
      landmarks[LANDMARKS.LEFT_SHOULDER],
      landmarks[LANDMARKS.LEFT_ELBOW],
      landmarks[LANDMARKS.LEFT_WRIST]
    );

    const rightElbowAngle = calculateAngle(
      landmarks[LANDMARKS.RIGHT_SHOULDER],
      landmarks[LANDMARKS.RIGHT_ELBOW],
      landmarks[LANDMARKS.RIGHT_WRIST]
    );

    const elbowAngle = averageAngle(leftElbowAngle, rightElbowAngle);

    const leftShoulderAngle = calculateAngle(
      landmarks[LANDMARKS.LEFT_ELBOW],
      landmarks[LANDMARKS.LEFT_SHOULDER],
      landmarks[LANDMARKS.LEFT_HIP]
    );

    const rightShoulderAngle = calculateAngle(
      landmarks[LANDMARKS.RIGHT_ELBOW],
      landmarks[LANDMARKS.RIGHT_SHOULDER],
      landmarks[LANDMARKS.RIGHT_HIP]
    );

    const shoulderAngle = averageAngle(leftShoulderAngle, rightShoulderAngle);

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

    if (!this.formValidated) {
      if (elbowAngle > 160 && shoulderAngle > 40 && hipAngle > 160) {
        this.formValidated = true;
      }
    }

    const percentage = interpolate(elbowAngle, 90, 160, 0, 100);

    if (percentage <= 20) {
      this.lastPosition = "DOWN";
      return "DOWN";
    }

    if (percentage >= 80) {
      this.lastPosition = "UP";
      return "UP";
    }

    return this.lastPosition;
  }

  checkForm(landmarks: NormalizedLandmark[]): string | null {
    if (!this.formValidated) {
      return "Get into starting position: Arms straight, body aligned";
    }

    const leftElbowAngle = calculateAngle(
      landmarks[LANDMARKS.LEFT_SHOULDER],
      landmarks[LANDMARKS.LEFT_ELBOW],
      landmarks[LANDMARKS.LEFT_WRIST]
    );

    const rightElbowAngle = calculateAngle(
      landmarks[LANDMARKS.RIGHT_SHOULDER],
      landmarks[LANDMARKS.RIGHT_ELBOW],
      landmarks[LANDMARKS.RIGHT_WRIST]
    );

    const elbowAngle = averageAngle(leftElbowAngle, rightElbowAngle);

    const leftShoulderAngle = calculateAngle(
      landmarks[LANDMARKS.LEFT_ELBOW],
      landmarks[LANDMARKS.LEFT_SHOULDER],
      landmarks[LANDMARKS.LEFT_HIP]
    );

    const rightShoulderAngle = calculateAngle(
      landmarks[LANDMARKS.RIGHT_ELBOW],
      landmarks[LANDMARKS.RIGHT_SHOULDER],
      landmarks[LANDMARKS.RIGHT_HIP]
    );

    const shoulderAngle = averageAngle(leftShoulderAngle, rightShoulderAngle);

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

    const percentage = interpolate(elbowAngle, 90, 160, 0, 100);

    if (percentage <= 20) {
      if (elbowAngle <= 100 && hipAngle > 160) {
        return null;
      }
      return "Fix Form";
    }

    if (percentage >= 80) {
      if (elbowAngle > 150 && shoulderAngle > 40 && hipAngle > 160) {
        return null;
      }
      return "Fix Form";
    }

    return null;
  }
}
