"use client";

import { useEffect, useRef, useState } from "react";
import { RealtimeVision } from "@overshoot/sdk";
import { RepCheckInstructions, VisionRepPhase } from "@/types/repCheckInstructions";
import { parsePhaseFromResponse, buildRepCountingPrompt } from "@/lib/vision/visionRepCounter";
import { useRepCounterStore } from "@/lib/stores/repCounterStore";
import { useVisionSystemStore } from "@/lib/vision/visionSystemStore";

const OVERSHOOT_INIT_TIMEOUT_MS = 10000;

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
  const initStartedRef = useRef(false);

  const repCounterStoreRef = useRef(useRepCounterStore.getState());
  const visionSystemStoreRef = useRef(useVisionSystemStore.getState());

  useEffect(() => {
    return useRepCounterStore.subscribe((state) => {
      repCounterStoreRef.current = state;
    });
  }, []);

  useEffect(() => {
    return useVisionSystemStore.subscribe((state) => {
      visionSystemStoreRef.current = state;
    });
  }, []);

  const overshootApiKey = process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY;

  useEffect(() => {
    if (!enabled) {
      if (visionRef.current) {
        visionRef.current.stop().catch(console.error);
        visionRef.current = null;
      }
      initStartedRef.current = false;
      setStatus("idle");
      return;
    }

    if (initStartedRef.current || visionRef.current) {
      return;
    }

    if (!overshootApiKey) {
      const msg = "No Overshoot API key configured";
      console.warn("[OvershootVision] " + msg);
      setError(msg);
      setStatus("error");
      return;
    }

    initStartedRef.current = true;
    setStatus("loading");

    const prompt = buildRepCountingPrompt(repCheckInstructions);
    console.log("[OvershootVision] Initializing with prompt:", prompt.substring(0, 100));

    let timeoutId: NodeJS.Timeout | null = null;
    let isTimedOut = false;

    const initVision = async () => {
      try {
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
                visionSystemStoreRef.current.incrementFailureCount();
                return;
              }

              const detectedPhase = parsePhaseFromResponse(context);

              if (detectedPhase === "unknown") {
                visionSystemStoreRef.current.incrementFailureCount();
              } else {
                visionSystemStoreRef.current.recordSuccess();
              }

              const prevPhase = previousPhaseRef.current;
              const store = repCounterStoreRef.current;

              if (detectedPhase === "preparation") {
                store.setFeedback("");
              } else if (prevPhase === "start" && detectedPhase === "end") {
                if (store.direction === 1) {
                  store.incrementHalfRep();
                  store.setDirection(0);
                  store.setFeedback("Down");
                }
              } else if (prevPhase === "end" && detectedPhase === "start") {
                if (store.direction === 0) {
                  store.incrementHalfRep();
                  store.setDirection(1);
                  store.setFeedback("Up");
                }
              }

              if (detectedPhase === "start" || detectedPhase === "end") {
                previousPhaseRef.current = detectedPhase;
              }
            } catch (err) {
              console.error("[Overshoot] Processing error:", err);
              visionSystemStoreRef.current.incrementFailureCount();
            }
          },
        });

        visionRef.current = vision;

        timeoutId = setTimeout(() => {
          isTimedOut = true;
          console.error("[OvershootVision] start() timed out after", OVERSHOOT_INIT_TIMEOUT_MS, "ms");
          setStatus("error");
          setError("Overshoot initialization timed out");
          visionSystemStoreRef.current.incrementFailureCount();
          if (visionRef.current) {
            visionRef.current.stop().catch(console.error);
            visionRef.current = null;
          }
        }, OVERSHOOT_INIT_TIMEOUT_MS);

        await vision.start();

        if (timeoutId) clearTimeout(timeoutId);

        if (!isTimedOut) {
          console.log("[OvershootVision] Started successfully");
          setStatus("active");
        }
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!isTimedOut) {
          console.error("[OvershootVision] Init failed:", err);
          setStatus("error");
          setError(err instanceof Error ? err.message : "Unknown error initializing vision");
          visionSystemStoreRef.current.incrementFailureCount();
        }
      }
    };

    initVision();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (visionRef.current) {
        visionRef.current.stop().catch(console.error);
        visionRef.current = null;
      }
    };
  }, [enabled, overshootApiKey, repCheckInstructions]);

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
