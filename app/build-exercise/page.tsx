import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BuildExerciseForm from "@/components/BuildExercise/BuildExerciseForm";

export default async function BuildExercisePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <BuildExerciseForm userId={user.id} />;
}
