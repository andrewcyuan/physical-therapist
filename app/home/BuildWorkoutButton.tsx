"use client";

import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default function BuildWorkoutButton() {
  return (
    <button>

      <Link
        href="/build-workout"
        className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        <Dumbbell className="h-4 w-4" />
        Build Workout
      </Link>
    </button>
  );
}
