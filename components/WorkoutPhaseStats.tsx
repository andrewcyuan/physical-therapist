"use client";

import { useRepCounterStore } from "@/lib/stores/repCounterStore";

export default function WorkoutPhaseStats() {
  const repCount = useRepCounterStore((state) => state.repCount);
  const feedback = useRepCounterStore((state) => state.feedback);

  const completedReps = Math.floor(repCount);

  const getFeedbackColor = (feedback: string) => {
    if (feedback === "Up" || feedback === "Down") return "text-green-400";
    if (feedback === "Fix Form") return "text-red-400";
    return "text-zinc-400";
  };

  return (
    <div className="flex items-end gap-4 text-right">
      {feedback && (
        <div>
          <p className={`text-sm font-semibold ${getFeedbackColor(feedback)}`}>
            {feedback}
          </p>
          <p className="text-xs text-white/60">Status</p>
        </div>
      )}
      <div>
        <p className="text-2xl font-bold text-green-400">{completedReps}</p>
        <p className="text-xs text-white/60">Reps</p>
      </div>
    </div>
  );
}
