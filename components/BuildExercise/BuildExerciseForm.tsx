"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { ArrowLeft, Save } from "lucide-react";
import { extractJointAngles, type AngleFrame, type ThresholdData } from "@/lib/poseUtils";
import { createClient } from "@/lib/supabase/client";

interface BuildExerciseFormProps {
  userId: string;
}

type Step = "form" | "recording" | "trimming";

interface ExerciseFormData {
  name: string;
  description: string;
  orientationInstructions: string;
}

export default function BuildExerciseForm({ userId }: BuildExerciseFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: "",
    description: "",
    orientationInstructions: "",
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedFrames, setRecordedFrames] = useState<AngleFrame[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRef = useRef<number>(0);
  const currentLandmarksRef = useRef<ReturnType<typeof extractJointAngles> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const initializeCamera = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      poseLandmarkerRef.current = poseLandmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsInitializing(false);

      const detectPose = () => {
        if (!videoRef.current || !canvasRef.current || !poseLandmarkerRef.current) {
          return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (!ctx || video.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(detectPose);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const results = poseLandmarkerRef.current.detectForVideo(
          video,
          performance.now()
        );

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(ctx);

          for (const landmarks of results.landmarks) {
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

            currentLandmarksRef.current = extractJointAngles(landmarks);
          }
        }

        animationFrameRef.current = requestAnimationFrame(detectPose);
      };

      detectPose();
    } catch (err) {
      console.error("Camera initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize camera");
      setIsInitializing(false);
    }
  };

  const startRecording = () => {
    setRecordedFrames([]);
    setRecordingTime(0);
    recordedChunksRef.current = [];
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    recordingStartRef.current = performance.now();
    setIsRecording(true);

    if (streamRef.current) {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm;codecs=vp9",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
    }

    recordingIntervalRef.current = setInterval(() => {
      const elapsed = performance.now() - recordingStartRef.current;
      setRecordingTime(Math.floor(elapsed / 1000));

      if (currentLandmarksRef.current) {
        const frame: AngleFrame = {
          timestamp: Math.round(elapsed),
          angles: { ...currentLandmarksRef.current },
        };
        setRecordedFrames((prev) => [...prev, frame]);
      }
    }, 100);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
      };
      mediaRecorderRef.current.stop();
    }
  };

  const handleSaveExercise = async () => {
    const trimmedFrames = recordedFrames.slice(trimStart, trimEnd + 1);

    if (trimmedFrames.length === 0) {
      setError("No recording data to save");
      return;
    }

    setIsSaving(true);
    setError(null);

    const startTimestamp = trimmedFrames[0].timestamp;
    const normalizedFrames = trimmedFrames.map((frame) => ({
      ...frame,
      timestamp: frame.timestamp - startTimestamp,
    }));

    const thresholdData: ThresholdData = {
      duration: normalizedFrames[normalizedFrames.length - 1].timestamp,
      sampleRate: 100,
      frames: normalizedFrames,
    };

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase
        .from("exercises")
        .insert({
          name: formData.name,
          description: formData.description,
          orientation_instructions: formData.orientationInstructions,
          threshold_data: thresholdData,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      router.push("/home");
    } catch (err) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save exercise");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("recording");
    initializeCamera();
  };

  const handleGoToTrimming = () => {
    stopCamera();
    setTrimStart(0);
    setTrimEnd(recordedFrames.length - 1);
    setStep("trimming");
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [stopCamera, recordedVideoUrl]);

  const isFormValid =
    formData.name.trim() &&
    formData.description.trim() &&
    formData.orientationInstructions.trim();

  const canSave = step === "trimming" && trimEnd > trimStart;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header
        step={step}
        canSave={canSave}
        saving={isSaving}
        onSave={handleSaveExercise}
      />

      <main className="mx-auto max-w-4xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-100 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <FormStep
          step={step}
          formData={formData}
          setFormData={setFormData}
          isFormValid={!!isFormValid}
          onSubmit={handleFormSubmit}
        />

        <RecordingStep
          step={step}
          isInitializing={isInitializing}
          isRecording={isRecording}
          recordingTime={recordingTime}
          recordedFrames={recordedFrames}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onContinue={handleGoToTrimming}
          onBack={() => {
            stopCamera();
            setStep("form");
          }}
        />

        <TrimStep
          step={step}
          recordedFrames={recordedFrames}
          recordedVideoUrl={recordedVideoUrl}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onTrimStartChange={setTrimStart}
          onTrimEndChange={setTrimEnd}
          onBack={() => {
            setStep("recording");
            initializeCamera();
          }}
        />
      </main>
    </div>
  );
}

function Header({
  step,
  canSave,
  saving,
  onSave,
}: {
  step: Step;
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            Build Exercise
          </h1>
        </div>

        {step === "trimming" && (
          <button
            onClick={onSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Exercise"}
          </button>
        )}
      </div>
    </header>
  );
}

interface FormStepProps {
  step: Step;
  formData: ExerciseFormData;
  setFormData: React.Dispatch<React.SetStateAction<ExerciseFormData>>;
  isFormValid: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function FormStep({ step, formData, setFormData, isFormValid, onSubmit }: FormStepProps) {
  if (step !== "form") return null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Exercise Name
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          placeholder="e.g., Bicep Curl"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          placeholder="Describe the exercise and its benefits..."
        />
      </div>

      <div>
        <label
          htmlFor="orientation"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Orientation Instructions
        </label>
        <textarea
          id="orientation"
          value={formData.orientationInstructions}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, orientationInstructions: e.target.value }))
          }
          rows={2}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
          placeholder="e.g., Stand facing the camera with arms at your sides"
        />
      </div>

      <button
        type="submit"
        disabled={!isFormValid}
        className="rounded-lg bg-zinc-900 px-6 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        Continue to Recording
      </button>
    </form>
  );
}

interface RecordingStepProps {
  step: Step;
  isInitializing: boolean;
  isRecording: boolean;
  recordingTime: number;
  recordedFrames: AngleFrame[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onContinue: () => void;
  onBack: () => void;
}

function RecordingStep({
  step,
  isInitializing,
  isRecording,
  recordingTime,
  recordedFrames,
  videoRef,
  canvasRef,
  onStartRecording,
  onStopRecording,
  onContinue,
  onBack,
}: RecordingStepProps) {
  if (step !== "recording") return null;

  const hasRecording = recordedFrames.length > 0;

  return (
    <div className="space-y-6">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
              <p>Initializing camera...</p>
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

        {isRecording && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-white"></div>
            <span className="text-sm font-medium text-white">
              {recordingTime}s
            </span>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Position yourself so your full body is visible, then perform the exercise
      </p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isRecording}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back
        </button>

        {!isRecording && !hasRecording && (
          <button
            onClick={onStartRecording}
            disabled={isInitializing}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Recording
          </button>
        )}

        {isRecording && (
          <button
            onClick={onStopRecording}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
          >
            Stop Recording
          </button>
        )}

        {!isRecording && hasRecording && (
          <>
            <button
              onClick={onStartRecording}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Re-record
            </button>
            <button
              onClick={onContinue}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Continue to Trim
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface TrimStepProps {
  step: Step;
  recordedFrames: AngleFrame[];
  recordedVideoUrl: string | null;
  trimStart: number;
  trimEnd: number;
  onTrimStartChange: (value: number) => void;
  onTrimEndChange: (value: number) => void;
  onBack: () => void;
}

function TrimStep({
  step,
  recordedFrames,
  recordedVideoUrl,
  trimStart,
  trimEnd,
  onTrimStartChange,
  onTrimEndChange,
  onBack,
}: TrimStepProps) {
  const trimVideoRef = useRef<HTMLVideoElement>(null);
  const [currentFrame, setCurrentFrame] = useState(trimStart);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!trimVideoRef.current || !recordedFrames[currentFrame]) return;
    const targetTime = recordedFrames[currentFrame].timestamp / 1000;
    trimVideoRef.current.currentTime = targetTime;
  }, [currentFrame, recordedFrames]);

  useEffect(() => {
    if (!isPlaying || !trimVideoRef.current) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= trimEnd) {
          setIsPlaying(false);
          return trimStart;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, trimStart, trimEnd]);

  if (step !== "trimming") return null;

  const totalFrames = recordedFrames.length;
  const totalDuration = totalFrames > 0 ? recordedFrames[totalFrames - 1].timestamp : 0;
  const trimmedDuration = trimEnd >= trimStart && recordedFrames[trimEnd] && recordedFrames[trimStart]
    ? recordedFrames[trimEnd].timestamp - recordedFrames[trimStart].timestamp
    : 0;

  const formatTime = (ms: number) => {
    const seconds = ms / 1000;
    return seconds.toFixed(1) + "s";
  };

  const startTime = recordedFrames[trimStart]?.timestamp ?? 0;
  const endTime = recordedFrames[trimEnd]?.timestamp ?? 0;

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentFrame >= trimEnd) {
        setCurrentFrame(trimStart);
      }
      setIsPlaying(true);
    }
  };

  const handleScrub = (frameIndex: number) => {
    setCurrentFrame(frameIndex);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-6">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
        {recordedVideoUrl && (
          <video
            ref={trimVideoRef}
            src={recordedVideoUrl}
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            muted
            playsInline
          />
        )}

        {!recordedVideoUrl && (
          <div className="flex h-full items-center justify-center text-white">
            Loading video...
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30"
          >
            {isPlaying ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
          <span className="text-sm font-medium text-white">
            {formatTime(recordedFrames[currentFrame]?.timestamp ?? 0)}
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            Total: {formatTime(totalDuration)}
          </span>
          <span className="font-medium text-zinc-900 dark:text-white">
            Selected: {formatTime(trimmedDuration)} ({trimEnd - trimStart + 1} frames)
          </span>
        </div>

        <div className="relative mb-4 h-10 rounded bg-zinc-300 dark:bg-zinc-700">
          <div
            className="absolute h-full bg-zinc-500/50"
            style={{
              left: `${(trimStart / Math.max(totalFrames - 1, 1)) * 100}%`,
              width: `${((trimEnd - trimStart) / Math.max(totalFrames - 1, 1)) * 100}%`,
            }}
          />

          <div
            className="absolute top-0 h-full w-0.5 bg-white"
            style={{ left: `${(currentFrame / Math.max(totalFrames - 1, 1)) * 100}%` }}
          />

          <input
            type="range"
            min={0}
            max={totalFrames - 1}
            value={currentFrame}
            onChange={(e) => handleScrub(parseInt(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-green-600 dark:text-green-400">
                Start: {formatTime(startTime)}
              </label>
              <button
                onClick={() => onTrimStartChange(currentFrame)}
                className="text-xs text-green-600 hover:underline dark:text-green-400"
              >
                Set to current
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={trimStart}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value < trimEnd) {
                  onTrimStartChange(value);
                  handleScrub(value);
                }
              }}
              className="w-full accent-green-500"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-red-600 dark:text-red-400">
                End: {formatTime(endTime)}
              </label>
              <button
                onClick={() => onTrimEndChange(currentFrame)}
                className="text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Set to current
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={trimEnd}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value > trimStart) {
                  onTrimEndChange(value);
                  handleScrub(value);
                }
              }}
              className="w-full accent-red-500"
            />
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Drag the sliders to trim the beginning and end of your recording
      </p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Re-record
        </button>
      </div>
    </div>
  );
}
