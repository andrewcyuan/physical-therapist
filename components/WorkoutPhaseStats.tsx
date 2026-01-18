"use client";

import { useRepCounterStore } from "@/lib/stores/repCounterStore";
import { RepPhase } from "@/lib/form/FormDetector";
import { getDetectorForExercise } from "@/lib/form/detectors";

interface WorkoutPhaseStatsProps {
  exerciseId: string;
}

export default function WorkoutPhaseStats({ exerciseId }: WorkoutPhaseStatsProps) {
  const attemptedReps = useRepCounterStore((state) => state.attemptedReps);
  const completedReps = useRepCounterStore((state) => state.completedReps);
  const currentPhase = useRepCounterStore((state) => state.currentPhase);

  const detector = getDetectorForExercise(exerciseId);

  if (!detector) {
    return (
      <div className="flex items-center justify-end">
        <div className="rounded-lg bg-amber-500/20 px-4 py-2 backdrop-blur-sm">
          <p className="text-sm font-semibold text-amber-400">No form detector available</p>
          <p className="text-xs text-amber-300/80">Manual counting mode</p>
        </div>
      </div>
    );
  }

  const getPhaseDisplay = (phase: RepPhase) => {
    const phaseConfig: Record<RepPhase, { label: string; color: string }> = {
      [RepPhase.WaitingForStart]: { label: "Get Ready", color: "text-zinc-400" },
      [RepPhase.Start]: { label: "Start", color: "text-blue-400" },
      [RepPhase.Eccentric]: { label: "Lowering", color: "text-amber-400" },
      [RepPhase.Turnaround]: { label: "Hold", color: "text-purple-400" },
      [RepPhase.Concentric]: { label: "Lifting", color: "text-cyan-400" },
      [RepPhase.End]: { label: "Complete", color: "text-green-400" },
    };
    return phaseConfig[phase];
  };

  const phaseDisplay = getPhaseDisplay(currentPhase);

  return (
    <div className="flex items-end gap-4 text-right">
      <div>
        <p className={`text-sm font-semibold ${phaseDisplay.color}`}>
          {phaseDisplay.label}
        </p>
        <p className="text-xs text-white/60">Phase</p>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{attemptedReps}</p>
        <p className="text-xs text-white/60">Attempted</p>
      </div>
      <div>
        <p className="text-2xl font-bold text-green-400">{completedReps}</p>
        <p className="text-xs text-white/60">Completed</p>
      </div>
    </div>
  );
}
