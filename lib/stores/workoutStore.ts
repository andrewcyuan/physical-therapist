import { create } from "zustand";

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  instructions: string;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  duration: string;
  difficulty: string;
  exercises: Exercise[];
}

interface WorkoutState {
  workout: Workout | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  isActive: boolean;

  // Actions
  setWorkout: (workout: Workout) => void;
  startWorkout: () => void;
  next: () => void;
  prev: () => void;
  goToExercise: (exerciseIndex: number, setIndex?: number) => void;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  workout: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  isActive: false,

  setWorkout: (workout) => set({ workout, currentExerciseIndex: 0, currentSetIndex: 0 }),

  startWorkout: () => set({ isActive: true }),

  next: () => {
    const { workout, currentExerciseIndex, currentSetIndex } = get();
    if (!workout) return;

    const currentExercise = workout.exercises[currentExerciseIndex];
    const totalSets = currentExercise.sets;
    const totalExercises = workout.exercises.length;

    // If there are more sets in current exercise
    if (currentSetIndex < totalSets - 1) {
      set({ currentSetIndex: currentSetIndex + 1 });
    }
    // If there are more exercises
    else if (currentExerciseIndex < totalExercises - 1) {
      set({ currentExerciseIndex: currentExerciseIndex + 1, currentSetIndex: 0 });
    }
    // At the end - do nothing or could trigger completion
  },

  prev: () => {
    const { workout, currentExerciseIndex, currentSetIndex } = get();
    if (!workout) return;

    // If not at first set of current exercise
    if (currentSetIndex > 0) {
      set({ currentSetIndex: currentSetIndex - 1 });
    }
    // If not at first exercise, go to last set of previous exercise
    else if (currentExerciseIndex > 0) {
      const prevExercise = workout.exercises[currentExerciseIndex - 1];
      set({
        currentExerciseIndex: currentExerciseIndex - 1,
        currentSetIndex: prevExercise.sets - 1,
      });
    }
    // At the beginning - do nothing
  },

  goToExercise: (exerciseIndex, setIndex = 0) => {
    const { workout } = get();
    if (!workout) return;
    if (exerciseIndex < 0 || exerciseIndex >= workout.exercises.length) return;

    const exercise = workout.exercises[exerciseIndex];
    const validSetIndex = Math.max(0, Math.min(setIndex, exercise.sets - 1));

    set({ currentExerciseIndex: exerciseIndex, currentSetIndex: validSetIndex });
  },

  reset: () => set({ currentExerciseIndex: 0, currentSetIndex: 0, isActive: false }),
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

  const currentExercise = workout.exercises[currentExerciseIndex];
  const isLastSet = currentSetIndex >= currentExercise.sets - 1;
  const isLastExercise = currentExerciseIndex >= workout.exercises.length - 1;
  const isFirstSet = currentSetIndex === 0;
  const isFirstExercise = currentExerciseIndex === 0;

  return {
    canGoNext: !(isLastSet && isLastExercise),
    canGoPrev: !(isFirstSet && isFirstExercise),
    isComplete: isLastSet && isLastExercise,
  };
};
