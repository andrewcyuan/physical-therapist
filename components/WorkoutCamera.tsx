"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { useCurrentExercise } from "@/lib/stores/workoutStore";
import { useRepCounterStore } from "@/lib/stores/repCounterStore";
import { getDetectorForExercise } from "@/lib/form/detectors";
import { extractJointAngles, type ThresholdData as PoseThresholdData } from "@/lib/poseUtils";
import type { FormDetector, Position } from "@/lib/form/FormDetector";
import { toast } from "sonner";
import { useFormAlertSender } from "@/hooks/useFormAlertSender";

const LANDMARK_INDICES = {
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
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

function drawAngleLabel(
  ctx: CanvasRenderingContext2D,
  landmark: NormalizedLandmark,
  angle: number,
  label: string,
  canvasWidth: number,
  canvasHeight: number
) {
  const x = landmark.x * canvasWidth;
  const y = landmark.y * canvasHeight;

  ctx.save();
  ctx.translate(x + 10, y);
  ctx.scale(-1, 1);

  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;

  const text = `${label}: ${angle}°`;
  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);

  ctx.restore();
}

function checkLandmarksVisible(landmarks: NormalizedLandmark[], requiredIndices: number[], minVisibility = 0.5): boolean {
  for (const index of requiredIndices) {
    const landmark = landmarks[index];
    if (!landmark || landmark.visibility === undefined || landmark.visibility < minVisibility) {
      return false;
    }
  }
  return true;
}

interface WorkoutCameraProps {
  isActive?: boolean;
  enableRepCounting?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export default function WorkoutCamera({ isActive = true, enableRepCounting = true, onCanvasReady }: WorkoutCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FormDetector | null>(null);
  const previousPositionRef = useRef<"UP" | "DOWN" | null>(null);
  const lastRepTimeRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    elbow: number;
    shoulder: number;
    hip: number;
    percentage: number;
    position: Position | null;
    formFeedback: string | null;
  } | null>(null);

  const currentExercise = useCurrentExercise();
  const incrementHalfRep = useRepCounterStore((state) => state.incrementHalfRep);
  const setDirection = useRepCounterStore((state) => state.setDirection);
  const direction = useRepCounterStore((state) => state.direction);
  const setFeedback = useRepCounterStore((state) => state.setFeedback);
  const resetRepCounter = useRepCounterStore((state) => state.reset);
  const { sendFormAlert } = useFormAlertSender();

  const stopTracking = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  useEffect(() => {
    if (!enableRepCounting) {
      detectorRef.current = null;
      return;
    }

    const exerciseId = currentExercise?.exercises.id;
    const exerciseName = currentExercise?.exercises.name;
    const thresholdData = currentExercise?.exercises
      .threshold_data as PoseThresholdData | null | undefined;
    if (!exerciseId) {
      detectorRef.current = null;
      return;
    }

    const detector = getDetectorForExercise(
      exerciseId,
      exerciseName,
      thresholdData ?? undefined,
    );
    detectorRef.current = detector;
    previousPositionRef.current = null;
    lastRepTimeRef.current = 0;
    resetRepCounter();
  }, [currentExercise, enableRepCounting, resetRepCounter]);

  useEffect(() => {
    if (!isActive) {
      stopTracking();
      return;
    }

    let isMounted = true;

    const initializePoseTracking = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize MediaPipe
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        if (!isMounted) return;

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        if (!isMounted) {
          poseLandmarker.close();
          return;
        }

        poseLandmarkerRef.current = poseLandmarker;

        // Get webcam access - request higher resolution for fullscreen
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsLoading(false);

        // Start detection loop
        const detectPose = () => {
          if (
            !isMounted ||
            !videoRef.current ||
            !canvasRef.current ||
            !poseLandmarkerRef.current
          ) {
            return;
          }

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          if (!ctx || video.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(detectPose);
            return;
          }

          // Match canvas size to video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const poseResults = poseLandmarkerRef.current.detectForVideo(
            video,
            performance.now()
          );

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw landmarks and process for rep detection
          if (poseResults.landmarks && poseResults.landmarks.length > 0) {
            const drawingUtils = new DrawingUtils(ctx);

            for (const landmarks of poseResults.landmarks) {
              drawingUtils.drawConnectors(
                landmarks,
                PoseLandmarker.POSE_CONNECTIONS,
                { color: "#22c55e", lineWidth: 3 }
              );

              drawingUtils.drawLandmarks(landmarks, {
                color: "#ffffff",
                lineWidth: 1,
                radius: 5,
              });

              const angles = extractJointAngles(landmarks);

              // Draw angle labels at each joint
              const L = LANDMARK_INDICES;
              drawAngleLabel(ctx, landmarks[L.LEFT_ELBOW], angles.leftElbow, "L Elbow", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.RIGHT_ELBOW], angles.rightElbow, "R Elbow", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.LEFT_SHOULDER], angles.leftShoulder, "L Shoulder", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.RIGHT_SHOULDER], angles.rightShoulder, "R Shoulder", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.LEFT_HIP], angles.leftHip, "L Hip", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.RIGHT_HIP], angles.rightHip, "R Hip", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.LEFT_KNEE], angles.leftKnee, "L Knee", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.RIGHT_KNEE], angles.rightKnee, "R Knee", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.LEFT_ANKLE], angles.leftAnkle, "L Ankle", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.RIGHT_ANKLE], angles.rightAnkle, "R Ankle", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.LEFT_WRIST], angles.leftWrist, "L Wrist", canvas.width, canvas.height);
              drawAngleLabel(ctx, landmarks[L.RIGHT_WRIST], angles.rightWrist, "R Wrist", canvas.width, canvas.height);

              // Process through form detector if available
              if (detectorRef.current && enableRepCounting) {
                const keyLandmarks = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26];
                const landmarksVisible = checkLandmarksVisible(landmarks, keyLandmarks, 0.6);

                if (!landmarksVisible) {
                  setDebugInfo(null);
                  setFeedback("Move into camera view");
                  return;
                }

                const currentPosition = detectorRef.current.detectPosition(landmarks);
                const formFeedback = detectorRef.current.checkForm(landmarks);

                const calculateAngle = (a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark) => {
                  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
                  let angle = Math.abs(radians * 180.0 / Math.PI);
                  if (angle > 180.0) angle = 360 - angle;
                  return Math.round(angle);
                };

                const elbow = Math.round((
                  calculateAngle(landmarks[11], landmarks[13], landmarks[15]) +
                  calculateAngle(landmarks[12], landmarks[14], landmarks[16])
                ) / 2);

                const shoulder = Math.round((
                  calculateAngle(landmarks[13], landmarks[11], landmarks[23]) +
                  calculateAngle(landmarks[14], landmarks[12], landmarks[24])
                ) / 2);

                const hip = Math.round((
                  calculateAngle(landmarks[11], landmarks[23], landmarks[25]) +
                  calculateAngle(landmarks[12], landmarks[24], landmarks[26])
                ) / 2);

                const percentage = Math.round(((elbow - 90) * 100) / (160 - 90));

                setDebugInfo({
                  elbow,
                  shoulder,
                  hip,
                  percentage: Math.max(0, Math.min(100, percentage)),
                  position: currentPosition,
                  formFeedback,
                });

                if (previousPositionRef.current === null) {
                  previousPositionRef.current = currentPosition;
                  toast.info(`Starting position: ${currentPosition}`);
                  sendFormAlert(`User in starting position: ${currentPosition}`, "info");
                } else if (previousPositionRef.current !== currentPosition) {
                  const now = Date.now();
                  const minTimeBetweenReps = 300;
                  const timeSinceLastRep = now - lastRepTimeRef.current;

                  if (timeSinceLastRep < minTimeBetweenReps) {
                    return;
                  }

                  if (currentPosition === "DOWN" && direction === 0) {
                    if (!formFeedback) {
                      incrementHalfRep();
                      setDirection(1);
                      setFeedback("Up");
                      toast.success("Phase: DOWN → Push back up!");
                      sendFormAlert("Good form - completed down phase", "info");
                      lastRepTimeRef.current = now;
                    } else {
                      setFeedback("Fix Form");
                      toast.error("Fix your form before counting");
                      sendFormAlert(formFeedback, "warning");
                    }
                  } else if (currentPosition === "UP" && direction === 1) {
                    if (!formFeedback) {
                      incrementHalfRep();
                      setDirection(0);
                      setFeedback("Down");
                      toast.success("Phase: UP → Go down!");
                      sendFormAlert("Good form - completed up phase", "info");
                      lastRepTimeRef.current = now;
                    } else {
                      setFeedback("Fix Form");
                      toast.error("Fix your form before counting");
                      sendFormAlert(formFeedback, "warning");
                    }
                  }
                  previousPositionRef.current = currentPosition;
                }
              }
            }
          }

          animationFrameRef.current = requestAnimationFrame(detectPose);
        };

        detectPose();
      } catch (err) {
        if (isMounted) {
          console.error("Pose tracking error:", err);
          setError(
            err instanceof Error ? err.message : "Failed to initialize camera"
          );
          setIsLoading(false);
        }
      }
    };

    initializePoseTracking();

    return () => {
      isMounted = false;
      stopTracking();
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, [isActive, stopTracking]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
            <p className="text-lg">Initializing camera...</p>
            <p className="mt-2 text-sm text-white/60">
              Please allow camera access when prompted
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="max-w-md text-center text-white">
            <p className="mb-2 text-xl text-red-400">Camera Error</p>
            <p className="text-white/80">{error}</p>
            <p className="mt-4 text-sm text-white/60">
              Please ensure camera access is allowed in your browser settings
            </p>
          </div>
        </div>
      )}

      {/* Video Feed - Full screen with cover */}
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        style={{ transform: "scaleX(-1)" }}
      />

      {/* Pose Overlay Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />

      {/* Debug Info Overlay */}
      {debugInfo && enableRepCounting && (
        <div className="pointer-events-none absolute inset-0 p-4">
          {/* Feedback Banner */}
          <div className="absolute right-4 top-4 rounded-lg bg-white px-6 py-3 text-center shadow-lg">
            <p className="text-2xl font-bold text-green-600">
              {debugInfo.formFeedback || "Good Form"}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="absolute right-4 top-20 flex h-80 w-6 flex-col-reverse overflow-hidden rounded-full border-4 border-green-500 bg-zinc-800">
            <div
              className="w-full bg-green-500 transition-all duration-100"
              style={{ height: `${debugInfo.percentage}%` }}
            />
          </div>
          <div className="absolute right-2 top-[420px] text-center">
            <p className="text-2xl font-bold text-white drop-shadow-lg">
              {debugInfo.percentage}%
            </p>
          </div>

          {/* Angle Info */}
          <div className="absolute bottom-4 left-4 space-y-2 rounded-lg bg-black/70 p-4 text-white">
            <div className="text-sm">
              <div>Elbow: {debugInfo.elbow}°</div>
              <div>Shoulder: {debugInfo.shoulder}°</div>
              <div>Hip: {debugInfo.hip}°</div>
              <div>Position: {debugInfo.position}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
