"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Workout, ExerciseSet } from "@/lib/stores/workoutStore";

type WorkoutInput = {
  name: string;
  difficulty: "easy" | "medium" | "hard";
  time: number;
  exercises: ExerciseSet[];
};

interface DbExerciseSet {
  id: string;
  exercise_id: string;
  num_sets: number;
  num_reps: number;
  rest_between: number;
}

function normalizeExerciseSets(exerciseSets: ExerciseSet[]): DbExerciseSet[] {
  return exerciseSets.map((es) => ({
    id: es.id,
    exercise_id: es.exercises.id,
    num_sets: es.num_sets,
    num_reps: es.num_reps,
    rest_between: es.rest_between,
  }));
}

export function useSaveWorkout() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveWorkout = async (
    workout: WorkoutInput,
    userId: string
  ): Promise<Workout | null> => {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const normalizedExercises = normalizeExerciseSets(workout.exercises);
    const { data, error: saveError } = await supabase
      .from("workouts")
      .insert({
        name: workout.name,
        difficulty: workout.difficulty,
        time: workout.time,
        exercises: normalizedExercises,
        owner: userId,
      })
      .select()
      .single();

    if (saveError) {
      setError(new Error(saveError.message));
      setSaving(false);
      return null;
    }

    setSaving(false);
    return data as Workout;
  };

  return { saveWorkout, saving, error };
}
