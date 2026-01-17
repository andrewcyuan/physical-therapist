export type ExerciseContextMessage = {
  type: "exercise_context";
  workout: { name: string; difficulty: string };
  currentExercise: { name: string; description: string; orientation: string };
  sets: number;
  currentSet: number;
  reps: number;
};

export type FormAlertMessage = {
  type: "form_alert";
  alert: string;
  severity: "info" | "warning";
};

export type AgentMessage = ExerciseContextMessage | FormAlertMessage;
