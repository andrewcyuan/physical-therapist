import { create } from "zustand";
import { RepCheckInstructions } from "@/types/repCheckInstructions";

export interface Exercise {
  id: string;
  name: string;
  description: string;
  threshold_data: object;
  orientation_instructions: string;
  rep_check_instructions?: RepCheckInstructions | null;
}

export interface ExerciseSet {
  id: string;
  exercises: Exercise;
  num_sets: number;
  num_reps: number;
  rest_between: number;
}

export interface Workout {
  id: string;
  owner: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  time: number;
  exercises: ExerciseSet[];
}

interface WorkoutState {
  workout: Workout | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  isActive: boolean;
  isCelebrating: boolean;

  // Actions
  setWorkout: (workout: Workout) => void;
  startWorkout: () => void;
  next: () => void;
  prev: () => void;
  goToExercise: (exerciseIndex: number, setIndex?: number) => void;
  startCelebration: () => void;
  endCelebration: () => void;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  workout: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  isActive: false,
  isCelebrating: false,

  setWorkout: (workout) => set({ workout, currentExerciseIndex: 0, currentSetIndex: 0 }),

  startWorkout: () => set({ isActive: true }),

  startCelebration: () => set({ isCelebrating: true }),

  endCelebration: () => set({ isCelebrating: false }),

  next: () => {
    const { workout, currentExerciseIndex, currentSetIndex } = get();
    if (!workout) return;

    const currentExerciseSet = workout.exercises[currentExerciseIndex];
    const totalSets = currentExerciseSet.num_sets;
    const totalExercises = workout.exercises.length;

    if (currentSetIndex < totalSets - 1) {
      set({ currentSetIndex: currentSetIndex + 1 });
    } else if (currentExerciseIndex < totalExercises - 1) {
      set({ currentExerciseIndex: currentExerciseIndex + 1, currentSetIndex: 0 });
    }
  },

  prev: () => {
    const { workout, currentExerciseIndex, currentSetIndex } = get();
    if (!workout) return;

    if (currentSetIndex > 0) {
      set({ currentSetIndex: currentSetIndex - 1 });
    } else if (currentExerciseIndex > 0) {
      const prevExerciseSet = workout.exercises[currentExerciseIndex - 1];
      set({
        currentExerciseIndex: currentExerciseIndex - 1,
        currentSetIndex: prevExerciseSet.num_sets - 1,
      });
    }
  },

  goToExercise: (exerciseIndex, setIndex = 0) => {
    const { workout } = get();
    if (!workout) return;
    if (exerciseIndex < 0 || exerciseIndex >= workout.exercises.length) return;

    const exerciseSet = workout.exercises[exerciseIndex];
    const validSetIndex = Math.max(0, Math.min(setIndex, exerciseSet.num_sets - 1));

    set({ currentExerciseIndex: exerciseIndex, currentSetIndex: validSetIndex });
  },

  reset: () => set({ currentExerciseIndex: 0, currentSetIndex: 0, isActive: false, isCelebrating: false }),
}));

// Selector hooks for convenience
export const useCurrentExercise = () => {
  const workout = useWorkoutStore((state) => state.workout);
  const currentExerciseIndex = useWorkoutStore((state) => state.currentExerciseIndex);
  return workout?.exercises[currentExerciseIndex] ?? null;
};

export const useWorkoutProgress = () => {
  const workout = useWorkoutStore((state) => state.workout);
  const currentExerciseIndex = useWorkoutStore((state) => state.currentExerciseIndex);
  const currentSetIndex = useWorkoutStore((state) => state.currentSetIndex);

  if (!workout) return { canGoNext: false, canGoPrev: false, isComplete: false };

  const currentExerciseSet = workout.exercises[currentExerciseIndex];
  const isLastSet = currentSetIndex >= currentExerciseSet.num_sets - 1;
  const isLastExercise = currentExerciseIndex >= workout.exercises.length - 1;
  const isFirstSet = currentSetIndex === 0;
  const isFirstExercise = currentExerciseIndex === 0;

  return {
    canGoNext: !(isLastSet && isLastExercise),
    canGoPrev: !(isFirstSet && isFirstExercise),
    isComplete: isLastSet && isLastExercise,
  };
};
