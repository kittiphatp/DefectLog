import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { notFound, redirect } from "next/navigation";
import DefectForm from "@/components/defect/DefectForm";

interface DefectPageProps {
  params: Promise<{ id: string }>;
}

export default async function DefectPage({ params }: DefectPageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const supabase = getSupabase();

  const [{ data: defect }, { data: files }] = await Promise.all([
    supabase.from("defects").select("*, users!defects_created_by_fkey(email), assigned_user:users!defects_assigned_to_fkey(email)").eq("id", id).single(),
    supabase.from("defect_files").select("*").eq("defect_id", id).order("created_at"),
  ]);

  if (!defect) notFound();

  return <DefectForm defect={defect} files={files ?? []} currentUser={user} />;
}
