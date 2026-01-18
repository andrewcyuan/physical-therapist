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
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Your Physical Therapist
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Pick a workout or build a new one in minutes.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end text-right text-xs text-slate-500 sm:flex">
              <span className="font-medium text-slate-800">{user.email}</span>
              <span>Signed in</span>
            </div>
            <SignOutButton />
          </div>
        </header>

        <main className="grid flex-1 gap-8 pb-6 lg:grid-cols-[1.15fr,0.85fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Saved plans
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {workouts?.length
                      ? `${workouts.length} saved program${workouts.length > 1 ? "s" : ""}`
                      : "No workouts yet"}
                  </p>
                </div>
                <div className="flex gap-3 items-center">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Or build your own:
                  </h2>
                  <BuildWorkoutButton />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {workouts?.map((workout: Workout) => (
                  <Link
                    key={workout.id}
                    href={`/workout/${workout.id}`}
                    className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition hover:border-slate-400 hover:bg-white"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{workout.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {workout.exercises.length} exercise
                        {workout.exercises.length !== 1 ? "s" : ""} • {workout.time} min
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium capitalize ${workout.difficulty === "easy"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : workout.difficulty === "medium"
                            ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                          }`}
                      >
                        {workout.difficulty}
                      </span>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-500 transition group-hover:border-slate-900 group-hover:text-slate-900">
                        →
                      </span>
                    </div>
                  </Link>
                ))}

                {!workouts?.length && (
                  <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    When you save a workout, it will appear here.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Workout History
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Your past sessions and stats
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
