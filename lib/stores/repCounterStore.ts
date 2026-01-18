import { create } from "zustand";
import { RepPhase } from "@/lib/form/FormDetector";

interface RepCounterState {
  attemptedReps: number;
  completedReps: number;
  currentPhase: RepPhase;

  incrementAttempted: () => void;
  incrementCompleted: () => void;
  setPhase: (phase: RepPhase) => void;
  reset: () => void;
}

export const useRepCounterStore = create<RepCounterState>((set) => ({
  attemptedReps: 0,
  completedReps: 0,
  currentPhase: RepPhase.WaitingForStart,

  incrementAttempted: () => set((state) => ({ attemptedReps: state.attemptedReps + 1 })),
  incrementCompleted: () => set((state) => ({ completedReps: state.completedReps + 1 })),
  setPhase: (phase) => set({ currentPhase: phase }),
  reset: () => set({ attemptedReps: 0, completedReps: 0, currentPhase: RepPhase.WaitingForStart }),
}));
