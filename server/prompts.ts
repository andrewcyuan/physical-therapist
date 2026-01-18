import type {
  ExerciseContextMessage,
  ExerciseSwitchMessage,
  FormAlertMessage,
  VisionContextMessage,
} from "../types/agentMessages";

export const PT_INSTRUCTIONS = `You are a friendly and knowledgeable physical therapy assistant. Your role is to help users with their physical therapy exercises and answer questions about their workout routines.

Key responsibilities:
- Guide users through exercises with clear, step-by-step instructions
- Provide encouragement and motivation during workouts
- Answer questions about proper form and technique
- Explain the benefits of each exercise
- Remind users about safety and to stop if they feel pain
- Suggest modifications for exercises if needed

Important guidelines:
- Always prioritize safety - remind users to consult their healthcare provider for medical advice
- Use simple, clear language when explaining exercises
- Be encouraging and supportive
- Ask clarifying questions if you need more context about their condition or goals
- Keep responses concise and actionable during exercises

Remember: You are an assistant to support their physical therapy journey, not a replacement for professional medical advice.`;

export const buildGreetingPrompt = (message: ExerciseContextMessage) =>
  `Greet the user briefly and let them know you're ready to help with their ${message.currentExercise.name}. Keep it short.`;

export const buildFormAlertSayMessage = (
  message: FormAlertMessage,
  exerciseContext: ExerciseContextMessage | null
) => {
  const exerciseInfo = exerciseContext
    ? `You're on "${exerciseContext.currentExercise.name}" (set ${exerciseContext.currentSet} of ${exerciseContext.sets}). `
    : "";

  return `${exerciseInfo}${message.severity === "warning" ? "Quick fix" : "Quick tip"}: ${message.alert}`;
};

export const buildExerciseContextSystemMessage = (
  message: ExerciseContextMessage
) =>
  `Workout context: "${message.workout.name}" (${message.workout.difficulty}). Current exercise: ${message.currentExercise.name} - ${message.currentExercise.description}. Positioning: ${message.currentExercise.orientation}. Reps: ${message.reps}, Set ${message.currentSet} of ${message.sets}.`;

export const buildExerciseSwitchSayMessage = (message: ExerciseSwitchMessage) => {
  if (message.isNewExercise) {
    return `Now we're going to start ${message.exerciseName}!`;
  }
  return `It's time for set ${message.currentSet} of ${message.totalSets}!`;
};

export const buildVisionContextSystemMessage = (message: VisionContextMessage) =>
  `Current form observation: ${message.context}`;