"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

interface PoseTrackerProps {
  isActive: boolean;
  onClose: () => void;
}

export default function PoseTracker({ isActive, onClose }: PoseTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

        // Get webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
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
              // Draw connectors
              drawingUtils.drawConnectors(
                landmarks,
                PoseLandmarker.POSE_CONNECTIONS,
                { color: "#00FF00", lineWidth: 3 }
              );

              // Draw landmarks
              drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 1,
                radius: 4,
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

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-3xl">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 rounded-md bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
        >
          Close Camera
        </button>

        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-900">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
                <p>Initializing pose tracking...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <p className="mb-2 text-red-400">Error: {error}</p>
                <p className="text-sm text-gray-400">
                  Please ensure camera access is allowed
                </p>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            style={{ transform: "scaleX(-1)" }}
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ transform: "scaleX(-1)" }}
          />
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          Position yourself so your full body is visible in the frame
        </p>
      </div>
    </div>
  );
}
