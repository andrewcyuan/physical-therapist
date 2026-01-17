"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/stores/workoutStore";

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchExercises() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name");

      if (error) {
        setError(new Error(error.message));
        setLoading(false);
        return;
      }

      setExercises(data || []);
      setLoading(false);
    }

    fetchExercises();
  }, []);

  return { exercises, loading, error };
}
