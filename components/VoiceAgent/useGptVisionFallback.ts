"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RealtimeVision } from "@overshoot/sdk";
import { RepCheckInstructions, VisionRepPhase } from "@/types/repCheckInstructions";
import { parsePhaseFromResponse, buildRepCountingPrompt } from "@/lib/vision/visionRepCounter";
import { useRepCounterStore } from "@/lib/stores/repCounterStore";
import { RepPhase } from "@/lib/form/FormDetector";
import { captureCanvasFrame, cleanupTempCanvas } from "@/lib/vision/canvasFrameCapture";
import { VISION_CONFIG } from "@/lib/vision/config";
import { OvershootStatus } from "./useOvershootVision";

interface UseGptVisionFallbackOptions {
  enabled?: boolean;
  repCheckInstructions?: RepCheckInstructions | null;
  canvasRef: HTMLCanvasElement | null;
}

export function useGptVisionFallback({
  enabled = true,
  repCheckInstructions,
  canvasRef,
}: UseGptVisionFallbackOptions) {
  const [status, setStatus] = useState<OvershootStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<string>("");
  const previousPhaseRef = useRef<VisionRepPhase>("unknown");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const incrementAttempted = useRepCounterStore((state) => state.incrementAttempted);
  const incrementCompleted = useRepCounterStore((state) => state.incrementCompleted);
  const setPhase = useRepCounterStore((state) => state.setPhase);

  const handleRepCounting = useCallback(
    (detectedPhase: VisionRepPhase) => {
      const prevPhase = previousPhaseRef.current;

      if (prevPhase === "start" && detectedPhase === "end") {
        incrementAttempted();
        setPhase(RepPhase.Turnaround);
      }

      if (prevPhase === "end" && detectedPhase === "start") {
        incrementCompleted();
        setPhase(RepPhase.End);
      }

      if (detectedPhase === "midway") {
        setPhase(RepPhase.Eccentric);
      }

      if (detectedPhase !== "unknown") {
        previousPhaseRef.current = detectedPhase;
      }
    },
    [incrementAttempted, incrementCompleted, setPhase]
  );

  const performInference = useCallback(async () => {
    if (!canvasRef || !repCheckInstructions) {
      return;
    }

    try {
      const imageData = await captureCanvasFrame(
        canvasRef,
        VISION_CONFIG.imageSize,
        VISION_CONFIG.imageQuality
      );

      if (!imageData) {
        console.warn("[GPT Vision] Failed to capture frame from canvas");
        return;
      }

      const prompt = buildRepCountingPrompt(repCheckInstructions);

      const response = await fetch("/api/vision/infer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData, prompt }),
        signal: AbortSignal.timeout(VISION_CONFIG.requestTimeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[GPT Vision] API error:", response.status, errorData);
        return;
      }

      const data = await response.json();
      const position = data.position;

      setCurrentContext(position);

      const detectedPhase = parsePhaseFromResponse(position);
      handleRepCounting(detectedPhase);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.error("[GPT Vision] Request timeout");
      } else {
        console.error("[GPT Vision] Inference error:", err);
      }
    }
  }, [canvasRef, repCheckInstructions, handleRepCounting]);

  useEffect(() => {
    if (!enabled || !canvasRef || !repCheckInstructions) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setStatus("idle");
      }
      return;
    }

    console.log("[GPT Vision] Starting inference loop");
    setStatus("active");
    setError(null);

    performInference();

    intervalRef.current = setInterval(() => {
      performInference();
    }, VISION_CONFIG.inferenceInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      cleanupTempCanvas();
    };
  }, [enabled, canvasRef, repCheckInstructions, performInference]);

  useEffect(() => {
    previousPhaseRef.current = "unknown";
  }, [repCheckInstructions]);

  return {
    isInitialized: status === "active",
    status,
    error,
    currentContext,
  };
}
