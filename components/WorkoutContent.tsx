"use client";

import { useEffect } from "react";
import { useWorkoutStore, type Workout } from "@/lib/stores/workoutStore";
import { VoiceAgentProvider, useVoiceAgentContext } from "./VoiceAgent";
import WorkoutCamera from "./WorkoutCamera";
import WorkoutOverlay from "./WorkoutOverlay";
import { useOvershootVision } from "./VoiceAgent/useOvershootVision";

interface WorkoutContentProps {
  workout: Workout;
}

function OvershootInsightsInner() {
  const { status, error, currentContext } = useOvershootVision({ enabled: false });

  // Only hide if completely idle
  if (status === "idle") return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-end p-4">
      <div className="pointer-events-auto max-w-sm rounded-lg border border-white/10 bg-black/80 p-3 text-xs text-white shadow-lg backdrop-blur-sm">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          Form insights
        </div>
        
        <div className="max-h-32 overflow-y-auto whitespace-pre-line">
          {status === "loading" && (
            <div className="flex items-center gap-2 text-white/70">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Initializing vision...
            </div>
          )}
          
          {status === "error" && (
            <div className="text-red-400">
              Error: {error || "Failed to start vision"}
            </div>
          )}
          
          {status === "active" && !currentContext && (
            <div className="text-white/50 italic">
              Analyzing form...
            </div>
          )}
          
          {status === "active" && currentContext && (
            currentContext
          )}
        </div>
      </div>
    </div>
  );
}

function OvershootInsightsBox() {
  const { isConnected, isConnecting, error } = useVoiceAgentContext();

  // Show debugging info if not connected
  if (!isConnected) {
    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-end p-4">
        <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/80 p-3 text-xs text-white shadow-lg backdrop-blur-sm">
          {isConnecting ? (
            <div className="flex items-center gap-2 text-yellow-300">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-300/30 border-t-yellow-300" />
              Connecting to Voice Agent...
            </div>
          ) : error ? (
             <div className="text-red-400">
               Voice Agent Error: {error}
             </div>
          ) : (
            <div className="text-white/50">
              Voice Agent Disconnected
            </div>
          )}
        </div>
      </div>
    );
  }

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
