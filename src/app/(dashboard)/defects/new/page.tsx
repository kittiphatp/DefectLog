import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DefectForm from "@/components/defect/DefectForm";

export default async function NewDefectPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return <DefectForm currentUser={user} />;
}
