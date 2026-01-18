"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  PoseLandmarker,
  FaceLandmarker,
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

interface WorkoutCameraProps {
  isActive?: boolean;
}

export default function WorkoutCamera({ isActive = true }: WorkoutCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
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

        const faceLandmarker = await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
          },
        );

        const handLandmarker = await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
          },
        );

        if (!isMounted) {
          poseLandmarker.close();
          faceLandmarker.close();
          handLandmarker.close();
          return;
        }

        poseLandmarkerRef.current = poseLandmarker;
        faceLandmarkerRef.current = faceLandmarker;
        handLandmarkerRef.current = handLandmarker;

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

          const faceResults = faceLandmarkerRef.current
            ? faceLandmarkerRef.current.detectForVideo(video, performance.now())
            : null;

          const handResults = handLandmarkerRef.current
            ? handLandmarkerRef.current.detectForVideo(video, performance.now())
            : null;

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

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
            }
          }

          if (
            faceResults &&
            faceResults.faceLandmarks &&
            faceResults.faceLandmarks.length > 0
          ) {
            const drawingUtils = new DrawingUtils(ctx);

            for (const faceLandmarks of faceResults.faceLandmarks) {
              drawingUtils.drawLandmarks(faceLandmarks, {
                color: "#38bdf8",
                lineWidth: 1,
                radius: 2,
              });
            }
          }

          if (
            handResults &&
            handResults.landmarks &&
            handResults.landmarks.length > 0
          ) {
            const drawingUtils = new DrawingUtils(ctx);

            for (const landmarks of handResults.landmarks) {
              drawingUtils.drawConnectors(
                landmarks,
                HandLandmarker.HAND_CONNECTIONS,
                { color: "#f97316", lineWidth: 3 },
              );

              drawingUtils.drawLandmarks(landmarks, {
                color: "#fed7aa",
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
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
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
