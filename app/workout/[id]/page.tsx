import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import workoutData from "@/data/workouts.json";
import WorkoutContent from "@/components/WorkoutContent";
import type { Workout } from "@/lib/stores/workoutStore";

const workouts = workoutData.workouts as Workout[];

interface Props {
  params: Promise<{ id: string }>;
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
  const workout = workouts.find((w) => w.id === id);

  if (!workout) {
    notFound();
  }

  return <WorkoutContent workout={workout} />;
}
