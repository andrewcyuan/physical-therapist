"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useWorkoutStore, useCurrentExercise, type Workout } from "@/lib/stores/workoutStore";
import { useRepCounterStore } from "@/lib/stores/repCounterStore";
import { VoiceAgentProvider } from "./VoiceAgent";
import WorkoutCamera from "./WorkoutCamera";
import WorkoutOverlay from "./WorkoutOverlay";
import { useOvershootVision } from "./VoiceAgent/useOvershootVision";
import { useGptVisionFallback } from "./VoiceAgent/useGptVisionFallback";
import { RepCheckInstructions } from "@/types/repCheckInstructions";
import { useVisionSystemStore } from "@/lib/vision/visionSystemStore";
import { VISION_CONFIG } from "@/lib/vision/config";

interface WorkoutContentProps {
  workout: Workout;
}

function VisionRepCounter({ repCheckInstructions, orientationInstructions, canvasRef }: { repCheckInstructions: RepCheckInstructions, orientationInstructions: string | null, canvasRef: HTMLCanvasElement | null }) {
  const activeProvider = useVisionSystemStore((state) => state.activeProvider);
  const failureCount = useVisionSystemStore((state) => state.overshootConsecutiveFailures);
  const setActiveProvider = useVisionSystemStore((state) => state.setActiveProvider);

  const overshoot = useOvershootVision({
    enabled: activeProvider === "overshoot",
    repCheckInstructions,
  });

  const gptFallback = useGptVisionFallback({
    enabled: true,
    orientationInstructions,
    canvasRef,
  });

  useEffect(() => {
    if (overshoot.status === "error" || failureCount >= VISION_CONFIG.failureThreshold) {
      const reason = overshoot.status === "error"
        ? "initialization error"
        : `${failureCount} consecutive failures`;

      console.log(`[VisionCoordinator] Switching to GPT fallback (${reason})`);
      toast.warning("Vision System Fallback", {
        description: `Switching to GPT-5-nano due to ${reason}`,
      });

      setActiveProvider("gpt");
    }
  }, [overshoot.status, failureCount, setActiveProvider]);

  useEffect(() => {
    console.log(`[VisionCoordinator] Active provider: ${activeProvider}`);

    if (activeProvider === "overshoot") {
      toast.success("Vision System Active", {
        description: "Using Overshoot AI for rep counting",
      });
    } else if (activeProvider === "gpt") {
      toast.info("Vision System Active", {
        description: "Using GPT-5-nano for rep counting",
      });
    }
  }, [activeProvider]);

  return null;
}

export default function WorkoutContent({ workout }: WorkoutContentProps) {
  const setWorkout = useWorkoutStore((state) => state.setWorkout);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const next = useWorkoutStore((state) => state.next);
  const startCelebration = useWorkoutStore((state) => state.startCelebration);
  const endCelebration = useWorkoutStore((state) => state.endCelebration);
  const reset = useWorkoutStore((state) => state.reset);
  const resetVisionSystem = useVisionSystemStore((state) => state.reset);
  const currentExercise = useCurrentExercise();
  const repCount = useRepCounterStore((state) => state.repCount);
  const resetRepCounter = useRepCounterStore((state) => state.reset);
  const repCheckInstructions = currentExercise?.exercises.rep_check_instructions;
  const orientationInstructions = currentExercise?.exercises.orientation_instructions ?? null;
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

  const targetReps = currentExercise?.num_reps ?? 0;
  const completedReps = Math.floor(repCount);

  useEffect(() => {
    if (completedReps > 0 && completedReps >= targetReps) {
      startCelebration();

      const celebrationTimer = setTimeout(() => {
        endCelebration();
        resetRepCounter();
        next();
      }, 3000);

      return () => clearTimeout(celebrationTimer);
    }
  }, [completedReps, targetReps, startCelebration, endCelebration, next, resetRepCounter]);

  useEffect(() => {
    setWorkout(workout);
    startWorkout();

    return () => {
      reset();
      resetVisionSystem();
    };
  }, [workout, setWorkout, startWorkout, reset, resetVisionSystem]);

  return (
    <VoiceAgentProvider autoConnect>
      <div className="fixed inset-0 overflow-hidden">
        <WorkoutCamera isActive={true} enableRepCounting={true} onCanvasReady={setCanvasRef} />
        <WorkoutOverlay />
        {repCheckInstructions && <VisionRepCounter repCheckInstructions={repCheckInstructions} orientationInstructions={orientationInstructions} canvasRef={canvasRef} />}
      </div>
    </VoiceAgentProvider>
  );
}
