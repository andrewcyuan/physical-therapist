import { create } from "zustand";
import type { Exercise, ExerciseSet } from "./workoutStore";

interface BuildWorkoutState {
  name: string;
  difficulty: "easy" | "medium" | "hard";
  exerciseSets: ExerciseSet[];

  setName: (name: string) => void;
  setDifficulty: (difficulty: "easy" | "medium" | "hard") => void;
  addExerciseSet: (exercise: Exercise, config: { num_sets: number; num_reps: number; rest_between: number }) => void;
  removeExerciseSet: (id: string) => void;
  updateExerciseSet: (id: string, updates: Partial<Omit<ExerciseSet, "id" | "exercises">>) => void;
  calculateTime: () => number;
  reset: () => void;
}

const generateId = () => crypto.randomUUID();

export const useBuildWorkoutStore = create<BuildWorkoutState>((set, get) => ({
  name: "",
  difficulty: "medium",
  exerciseSets: [],

  setName: (name) => set({ name }),

  setDifficulty: (difficulty) => set({ difficulty }),

  addExerciseSet: (exercise, config) => {
    const newSet: ExerciseSet = {
      id: generateId(),
      exercises: exercise,
      num_sets: config.num_sets,
      num_reps: config.num_reps,
      rest_between: config.rest_between,
    };
    set((state) => ({ exerciseSets: [...state.exerciseSets, newSet] }));
  },

  removeExerciseSet: (id) => {
    set((state) => ({
      exerciseSets: state.exerciseSets.filter((es) => es.id !== id),
    }));
  },

  updateExerciseSet: (id, updates) => {
    set((state) => ({
      exerciseSets: state.exerciseSets.map((es) =>
        es.id === id ? { ...es, ...updates } : es
      ),
    }));
  },

  calculateTime: () => {
    const { exerciseSets } = get();
    let totalSeconds = 0;

    for (const es of exerciseSets) {
      const timePerSet = es.num_reps * 3 + es.rest_between;
      totalSeconds += timePerSet * es.num_sets;
    }

    return Math.ceil(totalSeconds / 60);
  },

  reset: () => set({ name: "", difficulty: "medium", exerciseSets: [] }),
}));
