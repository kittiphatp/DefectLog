import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { signSession, COOKIE_NAME, MAX_AGE, SessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("verify_login", {
    p_email: email.trim().toLowerCase(),
    p_password: password,
  });

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const user = data[0] as SessionUser;

  if (!user.is_active) {
    return NextResponse.json(
      { error: "Your account has been deactivated. Please contact an administrator." },
      { status: 403 }
    );
  }

  const token = await signSession(user);

  const response = NextResponse.json({ success: true, user });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });

  return response;
}
