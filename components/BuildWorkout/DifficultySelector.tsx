"use client";

type Difficulty = "easy" | "medium" | "hard";

interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
}

export default function DifficultySelector({
  value,
  onChange,
}: DifficultySelectorProps) {
  const options: { value: Difficulty; label: string }[] = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ];

  return (
    <div>
      <label className="mb-2 block text-md font-semibold text-zinc-700 dark:text-zinc-300">
        Difficulty
      </label>
      <div className="flex gap-2">
        {options.map((option) => (
          <DifficultyButton
            key={option.value}
            difficulty={option.value}
            label={option.label}
            isSelected={value === option.value}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

function DifficultyButton({
  difficulty,
  label,
  isSelected,
  onClick,
}: {
  difficulty: Difficulty;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const baseClasses =
    "rounded-lg px-4 py-2 text-sm font-medium transition-colors";

  const getColorClasses = () => {
    if (!isSelected) {
      return "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700";
    }

    if (difficulty === "easy") {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }

    if (difficulty === "medium") {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }

    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${getColorClasses()}`}
    >
      {label}
    </button>
  );
}
