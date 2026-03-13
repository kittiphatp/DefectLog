export type Role = "admin" | "user";

export type DefectStatus =
  | "Draft"
  | "Open"
  | "In Progress"
  | "Resolved"
  | "Completed"
  | "Rejected"
  | "Cancelled"
  | "Reopen";

export interface AppUser {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Defect {
  id: string;
  docno: string;
  subject: string | null;
  description: string | null;
  module: string | null;
  priority: string | null;
  status: DefectStatus;
  root_cause: string | null;
  solution: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  reopen_reason: string | null;
  parent_id: string | null;
  users?: { email: string };
  assigned_user?: { email: string };
  parent_defect?: { id: string; docno: string } | null;
}

export interface DefectFile {
  id: string;
  defect_id: string;
  section: "description" | "resolution";
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export const MODULE_OPTIONS = [
  "Suspect Request",
  "Producer Switching",
  "Policy Request",
  "UW Request",
];

export const PRIORITY_OPTIONS = ["Critical", "Major", "Minor"] as const;
export type Priority = typeof PRIORITY_OPTIONS[number];

export const PRIORITY_COLORS: Record<Priority, string> = {
  Critical: "bg-red-100 text-red-700",
  Major:    "bg-orange-100 text-orange-700",
  Minor:    "bg-yellow-100 text-yellow-700",
};

export const ROOT_CAUSE_OPTIONS = [
  "Code Error",
  "Configuration Error",
  "Design Error",
  "Environment Issue",
  "Integration Issue",
  "Requirement Gap",
  "Other",
];

export const STATUS_COLORS: Record<DefectStatus, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Open: "bg-blue-100 text-blue-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-500",
  Reopen: "bg-purple-100 text-purple-700",
};
