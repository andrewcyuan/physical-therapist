"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RealtimeVision } from "@overshoot/sdk";
import { RepCheckInstructions, VisionRepPhase } from "@/types/repCheckInstructions";
import { parsePhaseFromResponse, buildRepCountingPrompt } from "@/lib/vision/visionRepCounter";
import { useRepCounterStore } from "@/lib/stores/repCounterStore";
import { RepPhase } from "@/lib/form/FormDetector";
import { useVisionSystemStore } from "@/lib/vision/visionSystemStore";

interface UseOvershootVisionOptions {
  enabled?: boolean;
  repCheckInstructions: RepCheckInstructions;
}

export type OvershootStatus = "idle" | "loading" | "active" | "error";

export function useOvershootVision({
  enabled = true,
  repCheckInstructions,
}: UseOvershootVisionOptions) {
  const visionRef = useRef<RealtimeVision | null>(null);
  const [status, setStatus] = useState<OvershootStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<string>("");
  const previousPhaseRef = useRef<VisionRepPhase>("unknown");

  const incrementAttempted = useRepCounterStore((state) => state.incrementAttempted);
  const incrementCompleted = useRepCounterStore((state) => state.incrementCompleted);
  const setPhase = useRepCounterStore((state) => state.setPhase);

  const incrementFailureCount = useVisionSystemStore((state) => state.incrementFailureCount);
  const recordSuccess = useVisionSystemStore((state) => state.recordSuccess);

  const overshootApiKey = process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY;

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

  const initializeOvershoot = useCallback(async () => {
    if (visionRef.current) {
      return;
    }

    if (!overshootApiKey) {
      const msg = "No Overshoot API key configured (NEXT_PUBLIC_OVERSHOOT_API_KEY). Vision will not start.";
      console.warn("[OvershootVision] " + msg);
      setError(msg);
      setStatus("error");
      return;
    }

    const prompt = buildRepCountingPrompt(repCheckInstructions);

    try {
      setStatus("loading");
      console.log("[OvershootVision] Initializing with prompt:", prompt.substring(0, 100));

      const vision = new RealtimeVision({
        apiUrl: "https://cluster1.overshoot.ai/api/v0.2",
        apiKey: overshootApiKey,
        model: "Qwen/Qwen3-VL-30B-A3B-Instruct",
        prompt,
        source: { type: "camera", cameraFacing: "user" },
        processing: {
          clip_length_seconds: 0.75,
          delay_seconds: 1,
          fps: 30,
          sampling_ratio: 0.1,
        },
        onResult: (result) => {
          try {
            const context = result.result;
            setCurrentContext(context);

            if (!result.ok) {
              console.error("[Overshoot] Inference error:", result.error);
              incrementFailureCount();
              return;
            }

            const detectedPhase = parsePhaseFromResponse(context);

            if (detectedPhase === "unknown") {
              incrementFailureCount();
            } else {
              recordSuccess();
            }

            handleRepCounting(detectedPhase);
          } catch (err) {
            console.error("[Overshoot] Processing error:", err);
            incrementFailureCount();
          }
        },
      });

      visionRef.current = vision;

      await vision.start();
      setStatus("active");
    } catch (err) {
      console.error("[OvershootVision] Init failed:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error initializing vision");
      incrementFailureCount();
    }
  }, [overshootApiKey, repCheckInstructions, handleRepCounting, incrementFailureCount, recordSuccess]);

  useEffect(() => {
    if (!enabled) {
      if (visionRef.current) {
        visionRef.current.stop().catch(console.error);
        visionRef.current = null;
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      void initializeOvershoot();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      if (visionRef.current) {
        visionRef.current.stop().catch(console.error);
        visionRef.current = null;
      }
    };
  }, [enabled, initializeOvershoot]);

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
