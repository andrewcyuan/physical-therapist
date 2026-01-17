"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Clock } from "lucide-react";
import { useBuildWorkoutStore } from "@/lib/stores/buildWorkoutStore";
import { useExercises } from "@/hooks/useExercises";
import { useSaveWorkout } from "@/hooks/useSaveWorkout";
import ExerciseSelector from "./ExerciseSelector";
import ExerciseSetCard from "./ExerciseSetCard";
import DifficultySelector from "./DifficultySelector";
import type { Exercise } from "@/lib/stores/workoutStore";

interface BuildWorkoutFormProps {
  userId: string;
}

export default function BuildWorkoutForm({ userId }: BuildWorkoutFormProps) {
  const router = useRouter();
  const { exercises, loading: loadingExercises } = useExercises();
  const { saveWorkout, saving } = useSaveWorkout();
  const [saveError, setSaveError] = useState<string | null>(null);

  const name = useBuildWorkoutStore((state) => state.name);
  const difficulty = useBuildWorkoutStore((state) => state.difficulty);
  const exerciseSets = useBuildWorkoutStore((state) => state.exerciseSets);
  const setName = useBuildWorkoutStore((state) => state.setName);
  const setDifficulty = useBuildWorkoutStore((state) => state.setDifficulty);
  const addExerciseSet = useBuildWorkoutStore((state) => state.addExerciseSet);
  const removeExerciseSet = useBuildWorkoutStore((state) => state.removeExerciseSet);
  const updateExerciseSet = useBuildWorkoutStore((state) => state.updateExerciseSet);
  const calculateTime = useBuildWorkoutStore((state) => state.calculateTime);
  const reset = useBuildWorkoutStore((state) => state.reset);

  const estimatedTime = calculateTime();
  const canSave = name.trim().length > 0 && exerciseSets.length > 0;

  const handleSelectExercise = (exercise: Exercise) => {
    addExerciseSet(exercise, {
      num_sets: 3,
      num_reps: 10,
      rest_between: 30,
    });
  };

  const handleSave = async () => {
    if (!canSave) return;

    setSaveError(null);
    const result = await saveWorkout(
      {
        name: name.trim(),
        difficulty,
        time: estimatedTime,
        exercises: exerciseSets,
      },
      userId
    );

    if (result) {
      reset();
      router.push("/home");
    } else {
      setSaveError("Failed to save workout. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Header
        canSave={canSave}
        saving={saving}
        onSave={handleSave}
      />

      <main className="mx-auto max-w-6xl px-4 py-8">

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-8">
            <div className="mb-8 space-y-6">
              <NameInput value={name} onChange={setName} />
              <DifficultySelector value={difficulty} onChange={setDifficulty} />
              <TimeDisplay time={estimatedTime} />
              <SaveErrorMessage error={saveError} />
            </div>
            <div>
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Your Workout ({exerciseSets.length} exercises)
              </h3>
              <SelectedExercises
                exerciseSets={exerciseSets}
                onRemove={removeExerciseSet}
                onUpdate={updateExerciseSet}
              />
            </div>

          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
              Add Exercises
            </h3>
            <ExerciseSelector
              exercises={exercises}
              loading={loadingExercises}
              onSelect={handleSelectExercise}
              selectedIds={exerciseSets.map((es) => es.exercises.id)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function Header({
  canSave,
  saving,
  onSave,
}: {
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            Build Workout
          </h1>
        </div>

        <button
          onClick={onSave}
          disabled={!canSave || saving}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <Save className="h-4 w-4" />
          <SaveButtonText saving={saving} />
        </button>
      </div>
    </header>
  );
}

function SaveButtonText({ saving }: { saving: boolean }) {
  if (saving) {
    return <span>Saving...</span>;
  }
  return <span>Save Workout</span>;
}

function NameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor="workout-name"
        className="mb-2 block text-lg font-semibold text-zinc-700 dark:text-zinc-300"
      >
        Workout Name
      </label>
      <input
        id="workout-name"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter workout name..."
        maxLength={50}
        className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
      />
    </div>
  );
}

function TimeDisplay({ time }: { time: number }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <Clock className="h-4 w-4" />
      <span>Estimated time: {time} min</span>
    </div>
  );
}

function SaveErrorMessage({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }
  return (
    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  );
}

function SelectedExercises({
  exerciseSets,
  onRemove,
  onUpdate,
}: {
  exerciseSets: ReturnType<typeof useBuildWorkoutStore.getState>["exerciseSets"];
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: { num_sets?: number; num_reps?: number; rest_between?: number }) => void;
}) {
  if (exerciseSets.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <p className="text-zinc-500 dark:text-zinc-400">
          Select exercises from the left to add them to your workout
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exerciseSets.map((es) => (
        <ExerciseSetCard
          key={es.id}
          exerciseSet={es}
          onRemove={() => onRemove(es.id)}
          onUpdate={(updates) => onUpdate(es.id, updates)}
        />
      ))}
    </div>
  );
}
