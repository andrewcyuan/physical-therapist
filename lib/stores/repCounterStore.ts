import { create } from "zustand";
import { Position } from "@/lib/form/FormDetector";

interface RepCounterState {
  repCount: number;
  direction: 0 | 1;
  currentPosition: Position | null;
  feedback: string;

  incrementHalfRep: () => void;
  setDirection: (direction: 0 | 1) => void;
  setPosition: (position: Position | null) => void;
  setFeedback: (feedback: string) => void;
  reset: () => void;
}

export const useRepCounterStore = create<RepCounterState>((set) => ({
  repCount: 0,
  direction: 0,
  currentPosition: null,
  feedback: "",

  incrementHalfRep: () => set((state) => ({ repCount: state.repCount + 0.5 })),
  setDirection: (direction) => set({ direction }),
  setPosition: (position) => set({ currentPosition: position }),
  setFeedback: (feedback) => set({ feedback }),
  reset: () => set({ repCount: 0, direction: 0, currentPosition: null, feedback: "" }),
}));
