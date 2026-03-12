import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify current password
  const { data: verified } = await supabase.rpc("verify_login", {
    p_email: user.email,
    p_password: currentPassword,
  });

  if (!verified || verified.length === 0) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // Update to new password
  const { error } = await supabase.rpc("change_user_password", {
    p_user_id: user.id,
    p_new_password: newPassword,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
