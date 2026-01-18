import { create } from "zustand";

export type VisionProvider = "overshoot" | "gpt" | "none";

interface VisionSystemState {
  activeProvider: VisionProvider;
  overshootConsecutiveFailures: number;
  lastSuccessfulInference: number;

  setActiveProvider: (provider: VisionProvider) => void;
  incrementFailureCount: () => void;
  resetFailureCount: () => void;
  recordSuccess: () => void;
  reset: () => void;
}

export const useVisionSystemStore = create<VisionSystemState>((set) => ({
  activeProvider: "overshoot",
  overshootConsecutiveFailures: 0,
  lastSuccessfulInference: 0,

  setActiveProvider: (provider) =>
    set({ activeProvider: provider }),

  incrementFailureCount: () =>
    set((state) => ({
      overshootConsecutiveFailures: state.overshootConsecutiveFailures + 1,
    })),

  resetFailureCount: () =>
    set({ overshootConsecutiveFailures: 0 }),

  recordSuccess: () =>
    set({
      lastSuccessfulInference: Date.now(),
      overshootConsecutiveFailures: 0,
    }),

  reset: () =>
    set({
      activeProvider: "overshoot",
      overshootConsecutiveFailures: 0,
      lastSuccessfulInference: 0,
    }),
}));
