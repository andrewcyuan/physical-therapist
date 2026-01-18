"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RealtimeVision } from "@overshoot/sdk";

interface UseOvershootVisionOptions {
  enabled?: boolean;
}

export type OvershootStatus = "idle" | "loading" | "active" | "error";

export function useOvershootVision({
  enabled = true,
}: UseOvershootVisionOptions = {}) {
  const visionRef = useRef<RealtimeVision | null>(null);
  const [status, setStatus] = useState<OvershootStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<string>("");

  const overshootApiKey = process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY;

  const initializeOvershoot = useCallback(async () => {
    if (visionRef.current) {
      return;
    }

    if (!overshootApiKey) {
      const msg = "No Overshoot API key configured (NEXT_PUBLIC_OVERSHOOT_API_KEY). Vision will not start.";
      console.warn("[OvershootVision] ⚠ " + msg);
      setError(msg);
      setStatus("error");
      return;
    }

    try {
      setStatus("loading");

      const vision = new RealtimeVision({
        apiUrl: "https://cluster1.overshoot.ai/api/v0.2",
        apiKey: overshootApiKey,
        model: "Qwen/Qwen3-VL-30B-A3B-Instruct",
        prompt:
          "Analyze this image of a person doing a physical therapy exercise. Describe their body position, form, alignment, and any specific details about their posture or movements. Be specific about joint angles, spinal alignment, limb positions, and any potential form issues. Focus on exercise technique and provide actionable feedback. Keep the response concise (2-3 sentences).",
        source: { type: "camera", cameraFacing: "user" },
        processing: {
          clip_length_seconds: 1,
          delay_seconds: 2,
          fps: 30,
          sampling_ratio: 0.1,
        },
        onResult: (result) => {
          const context = result.result;
          setCurrentContext(context);
        },
      });

      visionRef.current = vision;

      await vision.start();
      setStatus("active");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error initializing vision");
    }
  }, [overshootApiKey]);

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

  return {
    isInitialized: status === "active",
    status,
    error,
    currentContext,
  };
}
