"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { useMaybeRoomContext } from "@livekit/components-react";
import type { FormAlertMessage } from "@/types/agentMessages";

const MOCK_ALERTS = [
  "keep_back_straight",
  "bend_knees_more",
  "slow_down_movement",
  "maintain_balance",
];

interface WorkoutCameraProps {
  isActive?: boolean;
}

export default function WorkoutCamera({ isActive = true }: WorkoutCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const room = useMaybeRoomContext();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

          // Detect pose
          const results = poseLandmarkerRef.current.detectForVideo(
            video,
            performance.now()
          );

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw landmarks
          if (results.landmarks && results.landmarks.length > 0) {
            const drawingUtils = new DrawingUtils(ctx);

            for (const landmarks of results.landmarks) {
              // Draw connectors (skeleton lines)
              drawingUtils.drawConnectors(
                landmarks,
                PoseLandmarker.POSE_CONNECTIONS,
                { color: "#22c55e", lineWidth: 3 }
              );

              // Draw landmarks (joint dots)
              drawingUtils.drawLandmarks(landmarks, {
                color: "#ffffff",
                lineWidth: 1,
                radius: 5,
              });
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

  useEffect(() => {
    if (!isActive || !room?.localParticipant) return;

    const sendMockAlert = () => {
      const randomAlert = MOCK_ALERTS[Math.floor(Math.random() * MOCK_ALERTS.length)];
      const message: FormAlertMessage = {
        type: "form_alert",
        alert: randomAlert,
        severity: "info",
      };

      const encoder = new TextEncoder();
      room.localParticipant.publishData(
        encoder.encode(JSON.stringify(message)),
        { reliable: true }
      );
    };

    const interval = setInterval(sendMockAlert, 20000);
    return () => clearInterval(interval);
  }, [isActive, room]);

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
