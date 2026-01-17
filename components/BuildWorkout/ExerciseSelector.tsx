"use client";

import { useState } from "react";
import { Search, Plus, Check, Loader2 } from "lucide-react";
import type { Exercise } from "@/lib/stores/workoutStore";

interface ExerciseSelectorProps {
  exercises: Exercise[];
  loading: boolean;
  onSelect: (exercise: Exercise) => void;
  selectedIds: string[];
}

export default function ExerciseSelector({
  exercises,
  loading,
  onSelect,
  selectedIds,
}: ExerciseSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingState />;
  }

  if (exercises.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      <ExerciseList
        exercises={filteredExercises}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
      <p className="text-zinc-500 dark:text-zinc-400">
        No exercises found in the database
      </p>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search exercises..."
        className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-4 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
      />
    </div>
  );
}

function ExerciseList({
  exercises,
  selectedIds,
  onSelect,
}: {
  exercises: Exercise[];
  selectedIds: string[];
  onSelect: (exercise: Exercise) => void;
}) {
  if (exercises.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No exercises match your search
      </p>
    );
  }

  return (
    <div className="max-h-[500px] space-y-2 overflow-y-auto">
      {exercises.map((exercise) => (
        <ExerciseItem
          key={exercise.id}
          exercise={exercise}
          isSelected={selectedIds.includes(exercise.id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function ExerciseItem({
  exercise,
  isSelected,
  onSelect,
}: {
  exercise: Exercise;
  isSelected: boolean;
  onSelect: (exercise: Exercise) => void;
}) {
  return (
    <button
      onClick={() => onSelect(exercise)}
      className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
    >
      <div className="flex-1">
        <h4 className="font-medium text-zinc-900 dark:text-white">
          {exercise.name}
        </h4>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
          {exercise.description}
        </p>
      </div>
      <div className="ml-4 flex-shrink-0">
        <SelectIcon isSelected={isSelected} />
      </div>
    </button>
  );
}

function SelectIcon({ isSelected }: { isSelected: boolean }) {
  if (isSelected) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
        <Check className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-700">
      <Plus className="h-4 w-4" />
    </div>
  );
}
