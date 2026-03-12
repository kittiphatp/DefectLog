import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("register_user", {
    p_email: email.trim().toLowerCase(),
    p_password: password,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate")) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
