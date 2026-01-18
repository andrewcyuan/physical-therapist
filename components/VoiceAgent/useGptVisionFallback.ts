"use client";

import { useEffect, useRef, useState } from "react";
import { useMaybeRoomContext } from "@livekit/components-react";
import { buildOrientationCheckPrompt, parseOrientationResponse } from "@/lib/vision/visionRepCounter";
import { captureCanvasFrame, cleanupTempCanvas } from "@/lib/vision/canvasFrameCapture";
import { VISION_CONFIG } from "@/lib/vision/config";
import { OvershootStatus } from "./useOvershootVision";
import type { OrientationAlertMessage } from "@/types/agentMessages";

const ALERT_COOLDOWN_MS = 15000;

interface UseGptVisionFallbackOptions {
  enabled?: boolean;
  orientationInstructions: string | null;
  canvasRef: HTMLCanvasElement | null;
}

export function useGptVisionFallback({
  enabled = true,
  orientationInstructions,
  canvasRef,
}: UseGptVisionFallbackOptions) {
  const [status, setStatus] = useState<OvershootStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const roomRef = useRef<ReturnType<typeof useMaybeRoomContext>>(null);
  const orientationInstructionsRef = useRef<string | null>(null);
  const canvasRefRef = useRef<HTMLCanvasElement | null>(null);

  const room = useMaybeRoomContext();

  roomRef.current = room;
  orientationInstructionsRef.current = orientationInstructions;
  canvasRefRef.current = canvasRef;

  useEffect(() => {
    console.log("[GPT Vision] Effect triggered");
    console.log("[GPT Vision] enabled:", enabled);
    console.log("[GPT Vision] canvasRef:", !!canvasRef);
    console.log("[GPT Vision] orientationInstructions:", !!orientationInstructions);

    if (!enabled || !canvasRef || !orientationInstructions) {
      console.log("[GPT Vision] Conditions not met, not starting loop");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setStatus("idle");
      }
      return;
    }

    const performInference = async () => {
      const currentCanvas = canvasRefRef.current;
      const currentInstructions = orientationInstructionsRef.current;
      const currentRoom = roomRef.current;

      console.log("[GPT Vision] ========== INFERENCE START ==========");

      if (!currentCanvas || !currentInstructions) {
        console.warn("[GPT Vision] Missing canvasRef or orientationInstructions, skipping");
        return;
      }

      try {
        const imageData = await captureCanvasFrame(
          currentCanvas,
          VISION_CONFIG.imageSize,
          VISION_CONFIG.imageQuality
        );

        if (!imageData) {
          console.warn("[GPT Vision] Failed to capture frame from canvas");
          return;
        }

        console.log("[GPT Vision] Frame captured, length:", imageData.length);

        const prompt = buildOrientationCheckPrompt(currentInstructions);

        const response = await fetch("/api/vision/infer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData, prompt }),
          signal: AbortSignal.timeout(VISION_CONFIG.requestTimeout),
        });

        console.log("[GPT Vision] API response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[GPT Vision] API error:", response.status, errorData);
          return;
        }

        const data = await response.json();
        const answer = data.position;
        console.log("[GPT Vision] Answer:", answer);

        setCurrentContext(answer);

        const isFollowingOrientation = parseOrientationResponse(answer);
        console.log("[GPT Vision] isFollowingOrientation:", isFollowingOrientation);

        if (!isFollowingOrientation) {
          const now = Date.now();
          const timeSinceLastAlert = now - lastAlertTimeRef.current;
          console.log("[GPT Vision] Time since last alert:", timeSinceLastAlert, "ms");

          if (timeSinceLastAlert < ALERT_COOLDOWN_MS) {
            console.log("[GPT Vision] Skipping alert due to cooldown");
            return;
          }

          if (!currentRoom || currentRoom.state !== "connected") {
            console.warn("[GPT Vision] Room not connected, skipping alert");
            return;
          }

          lastAlertTimeRef.current = now;

          const message: OrientationAlertMessage = {
            type: "orientation_alert",
            context: currentInstructions,
          };

          const encoder = new TextEncoder();
          const payload = encoder.encode(JSON.stringify(message));
          currentRoom.localParticipant.publishData(payload, { reliable: true });
          console.log("[GPT Vision] ✅ Orientation alert sent!");
        }

        console.log("[GPT Vision] ========== INFERENCE END ==========");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.warn("[GPT Vision] Request timeout - frame skipped");
        } else {
          console.error("[GPT Vision] Inference error:", err);
        }
      }
    };

    console.log("[GPT Vision] ✅ Starting orientation check loop");
    console.log("[GPT Vision] Inference interval:", VISION_CONFIG.inferenceInterval, "ms");
    setStatus("active");
    setError(null);

    performInference();

    intervalRef.current = setInterval(performInference, VISION_CONFIG.inferenceInterval);

    return () => {
      console.log("[GPT Vision] Cleaning up interval");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      cleanupTempCanvas();
    };
  }, [enabled, canvasRef, orientationInstructions]);

  return {
    isInitialized: status === "active",
    status,
    error,
    currentContext,
  };
}
