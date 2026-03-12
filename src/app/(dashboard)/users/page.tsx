import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  const supabase = getSupabase();
  const { data: users } = await supabase.rpc("get_all_users");

  return <UsersClient users={users ?? []} currentUserId={session.id} />;
}
