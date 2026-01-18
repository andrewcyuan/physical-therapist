"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RealtimeVision } from "@overshoot/sdk";

interface UseOvershootVisionOptions {
  enabled?: boolean;
}

export function useOvershootVision({
  enabled = true,
}: UseOvershootVisionOptions = {}) {
  const room = useRoomContext();
  const visionRef = useRef<RealtimeVision | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentContext, setCurrentContext] = useState<string>("");

  const overshootApiKey = process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY;

  const sendVisionContext = useCallback(
    (context: string) => {
      if (!room) {
        console.warn("[OvershootVision] ⚠ No room available");
        return;
      }

      if (room.state !== "connected") {
        console.warn(
          "[OvershootVision] ⚠ Room not connected. State:",
          room.state,
        );
        return;
      }

      if (!room.localParticipant) {
        console.warn("[OvershootVision] ⚠ No local participant");
        return;
      }

      const message = {
        type: "vision-context",
        context,
      };

      try {
        const encoder = new TextEncoder();
        const messageStr = JSON.stringify(message);
        const dataBuffer = encoder.encode(messageStr);

        console.log(
          "[OvershootVision] 📤 Sending vision context to agent...",
        );
        console.log(
          "[OvershootVision] 📦 Message:",
          messageStr.substring(0, 200) + "...",
        );

        room.localParticipant.publishData(dataBuffer, {
          reliable: true,
        });

        console.log(
          "[OvershootVision] ✓✓✓ Vision context SENT successfully (",
          dataBuffer.length,
          "bytes)",
        );
      } catch (error) {
        console.error("[OvershootVision] ✗✗✗ ERROR sending vision context:", error);
        if (error instanceof Error) {
          console.error(
            "[OvershootVision] Error details:",
            error.message,
            error.stack,
          );
        }
      }
    },
    [room],
  );

  const initializeOvershoot = useCallback(async () => {
    if (visionRef.current) {
      return;
    }

    if (!overshootApiKey) {
      console.warn(
        "[OvershootVision] ⚠ No Overshoot API key configured. Make sure NEXT_PUBLIC_OVERSHOOT_API_KEY is set in your environment variables (e.g. Vercel Project Settings).",
      );
      return;
    } else {
      console.log(
        "[OvershootVision] 🔑 API Key found (starts with: " +
          overshootApiKey.substring(0, 8) +
          "...)",
      );
    }

    try {
      console.log(
        "[OvershootVision] 🎬 Initializing Overshoot RealtimeVision...",
      );

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
          setIsInitialized(true);
          sendVisionContext(context);
          console.log(
            "[OvershootVision] 📊 Analysis result:",
            context.substring(0, 150) + "...",
          );
          console.log(
            "[OvershootVision] ⏱️ Latency - Inference:",
            result.inference_latency_ms,
            "ms, Total:",
            result.total_latency_ms,
            "ms",
          );
        },
      });

      visionRef.current = vision;

      await vision.start();
      console.log("[OvershootVision] ✅ Vision stream started successfully");
    } catch (error) {
      console.error("[OvershootVision] ✗ Failed to initialize:", error);
    }
  }, [overshootApiKey, sendVisionContext]);

  useEffect(() => {
    if (!enabled || !room) {
      if (visionRef.current) {
        visionRef.current.stop().catch(console.error);
        visionRef.current = null;
      }
      return;
    }

    const handleConnected = async () => {
      // Small delay to ensure connection is stable and data channels are ready
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await initializeOvershoot();
    };

    if (room.state === "connected") {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        initializeOvershoot();
      }, 1000);
    } else {
      room.on("connected", handleConnected);
    }

    return () => {
      room?.off("connected", handleConnected);
      if (visionRef.current) {
        visionRef.current.stop().catch(console.error);
        visionRef.current = null;
      }
    };
  }, [enabled, room, initializeOvershoot]);

  return {
    isInitialized,
    currentContext,
  };
}
