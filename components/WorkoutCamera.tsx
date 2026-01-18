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
import { extractJointAngles, JointAngles } from "@/lib/poseUtils";
import type { FormDetector } from "@/lib/form/FormDetector";

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

interface WorkoutCameraProps {
  isActive?: boolean;
}

export default function WorkoutCamera({ isActive = true }: WorkoutCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FormDetector | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentExercise = useCurrentExercise();
  const incrementAttempted = useRepCounterStore((state) => state.incrementAttempted);
  const incrementCompleted = useRepCounterStore((state) => state.incrementCompleted);
  const setPhase = useRepCounterStore((state) => state.setPhase);
  const resetRepCounter = useRepCounterStore((state) => state.reset);

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
    const exerciseId = currentExercise?.exercises.id;
    if (!exerciseId) {
      detectorRef.current = null;
      return;
    }

    const detector = getDetectorForExercise(exerciseId);
    if (detector) {
      detector.setCallbacks({
        onAttemptStarted: incrementAttempted,
        onRepCompleted: incrementCompleted,
        onPhaseChange: setPhase,
      });
    }
    detectorRef.current = detector;
    resetRepCounter();
  }, [currentExercise, incrementAttempted, incrementCompleted, setPhase, resetRepCounter]);

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
              if (detectorRef.current) {
                detectorRef.current.processFrame({
                  timestamp: performance.now(),
                  angles,
                });
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
    </div>
  );
}
