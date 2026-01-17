import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BuildWorkoutForm from "@/components/BuildWorkout/BuildWorkoutForm";

export default async function BuildWorkoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <BuildWorkoutForm userId={user.id} />;
}
