"use client";

import { useWorkoutStore } from "@/lib/stores/workoutStore";

export default function ProgressBar() {
  const workout = useWorkoutStore((state) => state.workout);
  const currentExerciseIndex = useWorkoutStore((state) => state.currentExerciseIndex);
  const currentSetIndex = useWorkoutStore((state) => state.currentSetIndex);
  const goToExercise = useWorkoutStore((state) => state.goToExercise);

  if (!workout) return null;

  const exerciseSets = workout.exercises;

  return (
    <div className="flex w-full items-center gap-1.5">
      {exerciseSets.map((exerciseSet, exerciseIdx) => {
        const isCurrent = exerciseIdx === currentExerciseIndex;
        const isCompleted = exerciseIdx < currentExerciseIndex;
        const totalSets = exerciseSet.num_sets;
        const shouldSubdivide = isCurrent && totalSets > 1;

        return (
          <div
            key={exerciseSet.id}
            className={`relative flex-1 ${isCurrent ? "flex-[2]" : "flex-1"} transition-all duration-300`}
          >
            {shouldSubdivide ? (
              // Subdivided bar for current exercise with multiple sets
              <div className="flex gap-0.5">
                {Array.from({ length: totalSets }).map((_, setIdx) => {
                  const isCurrentSet = setIdx === currentSetIndex;
                  const isCompletedSet = setIdx < currentSetIndex;

                  return (
                    <button
                      key={setIdx}
                      onClick={() => goToExercise(exerciseIdx, setIdx)}
                      className={`h-2 flex-1 rounded-full transition-all duration-200 ${
                        isCurrentSet
                          ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                          : isCompletedSet
                            ? "bg-green-400"
                            : "bg-white/30"
                      }`}
                      aria-label={`Set ${setIdx + 1} of ${exerciseSet.exercises.name}`}
                    />
                  );
                })}
              </div>
            ) : (
              // Single bar for non-current exercises or single-set exercises
              <button
                onClick={() => goToExercise(exerciseIdx)}
                className={`h-2 w-full rounded-full transition-all duration-200 ${
                  isCurrent
                    ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                    : isCompleted
                      ? "bg-green-400"
                      : "bg-white/30"
                }`}
                aria-label={exerciseSet.exercises.name}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
