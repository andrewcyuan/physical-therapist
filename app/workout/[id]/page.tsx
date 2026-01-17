import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import workoutData from "@/data/workouts.json";

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
  const workout = workoutData.workouts.find((w) => w.id === id);

  if (!workout) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link
            href="/home"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {workout.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            {workout.description}
          </p>
          <div className="mt-4 flex gap-4">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {workout.duration}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                workout.difficulty === "Easy"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : workout.difficulty === "Medium"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {workout.difficulty}
            </span>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Exercises
        </h2>

        <div className="space-y-4">
          {workout.exercises.map((exercise, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {index + 1}. {exercise.name}
                  </h3>
                  <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                    {exercise.sets} sets × {exercise.reps}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-gray-600 dark:text-gray-400">
                {exercise.instructions}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/home"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Back to Workouts
          </Link>
        </div>
      </main>
    </div>
  );
}
