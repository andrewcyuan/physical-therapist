import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import WorkoutContent from "@/components/WorkoutContent";
import type { Workout, Exercise, ExerciseSet } from "@/lib/stores/workoutStore";

interface Props {
  params: Promise<{ id: string }>;
}

interface DbExerciseSet {
  id: string;
  exercise_id: string;
  num_sets: number;
  num_reps: number;
  rest_between: number;
}

export default async function WorkoutPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const { data: workoutData, error: workoutError } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", id)
    .single();

  if (workoutError || !workoutData) {
    notFound();
  }

  const dbExerciseSets = workoutData.exercises as DbExerciseSet[];
  const exerciseIds = dbExerciseSets.map((es) => es.exercise_id);

  const { data: exercisesData, error: exercisesError } = await supabase
    .from("exercises")
    .select("*")
    .in("id", exerciseIds);

  if (exercisesError || !exercisesData) {
    notFound();
  }

  const exerciseMap = new Map<string, Exercise>(
    exercisesData.map((e) => [e.id, e as Exercise])
  );

  const exerciseSets: ExerciseSet[] = dbExerciseSets.map((dbSet) => ({
    id: dbSet.id,
    exercises: exerciseMap.get(dbSet.exercise_id)!,
    num_sets: dbSet.num_sets,
    num_reps: dbSet.num_reps,
    rest_between: dbSet.rest_between,
  }));

  const workout: Workout = {
    id: workoutData.id,
    owner: workoutData.owner,
    name: workoutData.name,
    difficulty: workoutData.difficulty,
    time: workoutData.time,
    exercises: exerciseSets,
  };

  return <WorkoutContent workout={workout} />;
}
