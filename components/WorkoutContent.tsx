"use client";

import { useEffect } from "react";
import { useWorkoutStore, type Workout } from "@/lib/stores/workoutStore";
import { VoiceAgentProvider } from "./VoiceAgent";
import WorkoutCamera from "./WorkoutCamera";
import WorkoutOverlay from "./WorkoutOverlay";
import { useOvershootVision } from "./VoiceAgent/useOvershootVision";

interface WorkoutContentProps {
  workout: Workout;
}

function OvershootInsightsInner() {
  const { isInitialized, currentContext } = useOvershootVision({ enabled: true });

  if (!isInitialized || !currentContext) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-end p-4">
      <div className="pointer-events-auto max-w-sm rounded-lg border border-white/10 bg-black/80 p-3 text-xs text-white shadow-lg backdrop-blur-sm">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          Form insights
        </div>
        <div className="max-h-32 overflow-y-auto whitespace-pre-line">
          {currentContext}
        </div>
      </div>
    </div>
  );
}

function OvershootInsightsBox() {
  return <OvershootInsightsInner />;
}

export default function WorkoutContent({ workout }: WorkoutContentProps) {
  const setWorkout = useWorkoutStore((state) => state.setWorkout);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const reset = useWorkoutStore((state) => state.reset);

  // Initialize store with workout data
  useEffect(() => {
    setWorkout(workout);
    startWorkout();

    return () => {
      reset();
    };
  }, [workout, setWorkout, startWorkout, reset]);

  return (
    <VoiceAgentProvider autoConnect>
      <div className="fixed inset-0 overflow-hidden">
        <WorkoutCamera isActive={true} />
        <WorkoutOverlay />
        <OvershootInsightsBox />
      </div>
    </VoiceAgentProvider>
  );
}
