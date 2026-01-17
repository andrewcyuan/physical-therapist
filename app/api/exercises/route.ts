import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, orientation_instructions, threshold_data } = body;

  if (!name || !description || !orientation_instructions || !threshold_data) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name,
      description,
      orientation_instructions,
      threshold_data,
    })
    .select()
    .single();

  if (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to save exercise" },
      { status: 500 }
    );
  }

  return NextResponse.json({ exercise: data }, { status: 201 });
}
