import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "./sign-out-button";
import BuildExerciseButton from "./BuildExerciseButton";
import BuildWorkoutButton from "./BuildWorkoutButton";
import type { Workout } from "@/lib/stores/workoutStore";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: workouts } = await supabase
    .from("workouts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Your Physical Therapist
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          Your Workouts
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {workouts?.map((workout: Workout) => (
            <Link
              key={workout.id}
              href={`/workout/${workout.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {workout.name}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {workout.exercises.length} exercises
              </p>
              <div className="mt-4 flex gap-4">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {workout.time} min
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${workout.difficulty === "easy"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : workout.difficulty === "medium"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                >
                  {workout.difficulty}
                </span>
              </div>
            </Link>
          ))}
        </div>
        <h2 className="mb-3 mt-8 text-2xl font-semibold text-gray-900 dark:text-white">
          Create
        </h2>
        <div className="flex flex-col items-start gap-2 pb-4">
          <BuildWorkoutButton />
          <BuildExerciseButton />
        </div>
      </main>
    </div>
  );
}
