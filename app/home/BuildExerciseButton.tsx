"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export default function BuildExerciseButton() {
  return (
    <Link
      href="/build-exercise"
      className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
    >
      <Plus className="h-4 w-4" />
      Build Exercise
    </Link>
  );
}
