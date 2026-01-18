"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useWorkoutStore, useCurrentExercise, useWorkoutProgress } from "@/lib/stores/workoutStore";
import { useRepCounterStore } from "@/lib/stores/repCounterStore";
import { RepPhase } from "@/lib/form/FormDetector";
import { VoiceAgentButton } from "./VoiceAgent";
import ProgressBar from "./ProgressBar";

export default function WorkoutOverlay() {
  const workout = useWorkoutStore((state) => state.workout);
  const currentSetIndex = useWorkoutStore((state) => state.currentSetIndex);
  const next = useWorkoutStore((state) => state.next);
  const prev = useWorkoutStore((state) => state.prev);
  const currentExerciseSet = useCurrentExercise();
  const { canGoNext, canGoPrev } = useWorkoutProgress();
  const attemptedReps = useRepCounterStore((state) => state.attemptedReps);
  const completedReps = useRepCounterStore((state) => state.completedReps);
  const currentPhase = useRepCounterStore((state) => state.currentPhase);

  if (!workout || !currentExerciseSet) return null;

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

  const exercise = currentExerciseSet.exercises;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      {/* Top Gradient */}
      <div className="pointer-events-auto bg-gradient-to-b from-black/80 via-black/50 to-transparent px-4 pb-16 pt-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-white">{workout.name}</h1>
              <div className="flex gap-2">
                <span className="text-xs text-white/70">{workout.time} min</span>
                <span className="text-xs text-white/50">•</span>
                <span
                  className={`text-xs capitalize ${
                    workout.difficulty === "easy"
                      ? "text-green-400"
                      : workout.difficulty === "medium"
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {workout.difficulty}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Voice Agent Button */}
          <VoiceAgentButton />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Gradient */}
      <div className="pointer-events-auto bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 pb-8 pt-20">
        <div className="mx-auto max-w-4xl">
          {/* Exercise Info - Left aligned above progress bar */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-white drop-shadow-lg">
                {exercise.name}
              </h2>
              <p className="mt-0.5 text-xs text-white/80">
                Set {currentSetIndex + 1} of {currentExerciseSet.num_sets} • {currentExerciseSet.num_reps} reps
              </p>
              <p className="mt-1 text-xs text-white/60 line-clamp-2">
                {exercise.orientation_instructions}
              </p>
            </div>
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
          </div>

          {/* Navigation + Progress Bar */}
          <div className="flex items-center gap-3">
            {/* Previous Button */}
            <button
              onClick={prev}
              disabled={!canGoPrev}
              className={`rounded-full p-2 transition-all ${
                canGoPrev
                  ? "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  : "cursor-not-allowed text-white/30"
              }`}
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Progress Bar */}
            <div className="flex-1">
              <ProgressBar />
            </div>

            {/* Next Button */}
            <button
              onClick={next}
              disabled={!canGoNext}
              className={`rounded-full p-2 transition-all ${
                canGoNext
                  ? "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  : "cursor-not-allowed text-white/30"
              }`}
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
