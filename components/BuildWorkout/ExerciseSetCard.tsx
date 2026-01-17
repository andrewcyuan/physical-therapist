"use client";

import { useState } from "react";
import { Trash2, Edit2, Check, X } from "lucide-react";
import type { ExerciseSet } from "@/lib/stores/workoutStore";

interface ExerciseSetCardProps {
  exerciseSet: ExerciseSet;
  onRemove: () => void;
  onUpdate: (updates: { num_sets?: number; num_reps?: number; rest_between?: number }) => void;
}

export default function ExerciseSetCard({
  exerciseSet,
  onRemove,
  onUpdate,
}: ExerciseSetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    num_sets: exerciseSet.num_sets,
    num_reps: exerciseSet.num_reps,
    rest_between: exerciseSet.rest_between,
  });

  const handleSave = () => {
    onUpdate(editValues);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      num_sets: exerciseSet.num_sets,
      num_reps: exerciseSet.num_reps,
      rest_between: exerciseSet.rest_between,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <EditingCard
        exerciseName={exerciseSet.exercises.name}
        values={editValues}
        onChange={setEditValues}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <DisplayCard
      exerciseSet={exerciseSet}
      onEdit={() => setIsEditing(true)}
      onRemove={onRemove}
    />
  );
}

function DisplayCard({
  exerciseSet,
  onEdit,
  onRemove,
}: {
  exerciseSet: ExerciseSet;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-zinc-900 dark:text-white">
            {exerciseSet.exercises.name}
          </h4>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <span>{exerciseSet.num_sets} sets</span>
            <span>×</span>
            <span>{exerciseSet.num_reps} reps</span>
            <span>•</span>
            <span>{exerciseSet.rest_between}s rest</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            aria-label="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EditingCard({
  exerciseName,
  values,
  onChange,
  onSave,
  onCancel,
}: {
  exerciseName: string;
  values: { num_sets: number; num_reps: number; rest_between: number };
  onChange: (values: { num_sets: number; num_reps: number; rest_between: number }) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border-2 border-zinc-400 bg-white p-4 dark:border-zinc-500 dark:bg-zinc-800">
      <h4 className="mb-4 font-medium text-zinc-900 dark:text-white">
        {exerciseName}
      </h4>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <NumberInput
          label="Sets"
          value={values.num_sets}
          onChange={(v) => onChange({ ...values, num_sets: v })}
          min={1}
          max={10}
        />
        <NumberInput
          label="Reps"
          value={values.num_reps}
          onChange={(v) => onChange({ ...values, num_reps: v })}
          min={1}
          max={100}
        />
        <NumberInput
          label="Rest (s)"
          value={values.rest_between}
          onChange={(v) => onChange({ ...values, rest_between: v })}
          min={0}
          max={300}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          onClick={onSave}
          className="flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <Check className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseInt(e.target.value, 10);
    if (isNaN(numValue)) return;
    const clampedValue = Math.min(Math.max(numValue, min), max);
    onChange(clampedValue);
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
      />
    </div>
  );
}
