"use client";

import { useEffect } from "react";
import { useWorkoutStore, type Workout } from "@/lib/stores/workoutStore";
import { VoiceAgentProvider } from "./VoiceAgent";
import WorkoutCamera from "./WorkoutCamera";
import WorkoutOverlay from "./WorkoutOverlay";

interface WorkoutContentProps {
  workout: Workout;
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
    <VoiceAgentProvider>
      <div className="fixed inset-0 overflow-hidden">
        {/* Full-screen camera with pose tracking */}
        <WorkoutCamera isActive={true} />

        {/* Overlay with workout info, progress bar, navigation */}
        <WorkoutOverlay />
      </div>
    </VoiceAgentProvider>
  );
}
