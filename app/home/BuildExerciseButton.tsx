"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import ExerciseBuilder from "@/components/ExerciseBuilder";

export default function BuildExerciseButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
      >
        <Plus className="h-4 w-4" />
        Build Exercise
      </button>

      <ExerciseBuilder isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
