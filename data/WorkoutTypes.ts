
type Workout = {
    id: string;
    owner: string;
    name: string;
    exercises: ExerciseSet[]
    difficulty: "easy" | "medium" | "hard";
    time: number // minutes
}

type ExerciseSet = {
    id: string;
    exercises: Exercise
    num_sets: number
    num_reps: number
    rest_between: number // in seconds
}

type Exercise = {
    id: string;
    name: string;
    description: string;
    threshold_data: object;
    orientation_instructions: string; // how the user should be oriented relative to the camera
}

