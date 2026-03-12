"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { SessionUser } from "@/lib/auth";
import { Defect, DefectFile, ROOT_CAUSE_OPTIONS, MODULE_OPTIONS, PRIORITY_OPTIONS, STATUS_COLORS, DefectStatus } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Toast, { ToastMessage } from "@/components/ui/Toast";
import { Paperclip, X, ExternalLink, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface DefectFormProps {
  defect?: Defect | null;
  files?: DefectFile[];
  currentUser: SessionUser;
}

export default function DefectForm({ defect, files = [], currentUser }: DefectFormProps) {
  const router = useRouter();
  const supabase = getSupabase();
  const isNew = !defect;

  const [subject, setSubject] = useState(defect?.subject ?? "");
  const [description, setDescription] = useState(defect?.description ?? "");
  const [module, setModule] = useState(defect?.module ?? "");
  const [priority, setPriority] = useState(defect?.priority ?? "");
  const [rootCause, setRootCause] = useState(defect?.root_cause ?? "");
  const [solution, setSolution] = useState(defect?.solution ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToasts((prev) => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const [descExpanded, setDescExpanded] = useState(true);
  const [resExpanded, setResExpanded] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [modalReason, setModalReason] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const descFileRef = useRef<HTMLInputElement>(null);
  const resFileRef = useRef<HTMLInputElement>(null);
  const [descFiles, setDescFiles] = useState<File[]>([]);
  const [resFiles, setResFiles] = useState<File[]>([]);

  const existingDescFiles = files.filter((f) => f.section === "description");
  const existingResFiles = files.filter((f) => f.section === "resolution");
  const status = defect?.status;

  const uploadFiles = async (defectId: string, fileList: File[], section: "description" | "resolution") => {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const uid = `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;
      const path = `defects/${defectId}/${section}/${uid}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("defect-files").upload(path, file);
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }
      const { error: insertError } = await supabase.from("defect_files").insert({
        defect_id: defectId, section,
        file_name: file.name, file_path: path,
        file_size: file.size, mime_type: file.type,
      });
      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to save file record: ${insertError.message}`);
      }
    }
  };

  const removeExistingFile = async (fileId: string, filePath: string) => {
    await supabase.storage.from("defect-files").remove([filePath]);
    await supabase.from("defect_files").delete().eq("id", fileId);
    router.refresh();
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from("defect-files").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const saveDefect = async (newStatus: DefectStatus) => {
    setSaving(true);
    setError("");

    if (newStatus !== "Draft" && !subject.trim()) {
      setError("Subject is required.");
      setSaving(false);
      return;
    }

    if (newStatus === "Resolved" && (!rootCause || !solution.trim())) {
      setError("Please fill in Root Cause and Solution before resolving.");
      setSaving(false);
      return;
    }

    try {
      if (isNew) {
        const { data: newDefect, error: insertError } = await supabase
          .from("defects")
          .insert({ subject, description, module: module || null, priority: priority || null, root_cause: rootCause || null, solution: solution || null, status: newStatus, created_by: currentUser.id })
          .select().single();
        if (insertError) throw insertError;
        await uploadFiles(newDefect.id, descFiles, "description");
        await uploadFiles(newDefect.id, resFiles, "resolution");
        addToast(newStatus === "Draft" ? "บันทึก Draft สำเร็จ" : "ส่ง Defect สำเร็จแล้ว");
        router.push(`/defects/${newDefect.id}`);
      } else {
        const { error: updateError } = await supabase
          .from("defects")
          .update({ subject, description, module: module || null, priority: priority || null, root_cause: rootCause || null, solution: solution || null, status: newStatus })
          .eq("id", defect!.id);
        if (updateError) throw updateError;
        await uploadFiles(defect!.id, descFiles, "description");
        await uploadFiles(defect!.id, resFiles, "resolution");
        const toastMsg: Record<string, string> = {
          Draft: "บันทึก Draft สำเร็จ",
          Open: "ส่ง Defect สำเร็จแล้ว",
          "In Progress": "บันทึกสำเร็จ",
          Resolved: "บันทึกสำเร็จ",
        };
        addToast(toastMsg[newStatus] ?? "บันทึกสำเร็จ");
        window.location.reload();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (newStatus: DefectStatus, extra?: Record<string, string>) => {
    setModalLoading(true);
    const { error: updateError } = await supabase
      .from("defects").update({ status: newStatus, ...extra }).eq("id", defect!.id);
    setModalLoading(false);
    if (updateError) { setError("Failed to update status."); return; }
    setShowRejectModal(false);
    setShowCancelModal(false);
    setModalReason("");
    const statusMsg: Record<string, string> = {
      "In Progress": "Check In สำเร็จ",
      Rejected: "Reject สำเร็จ",
      Cancelled: "Cancel สำเร็จ",
      Completed: "Completed สำเร็จ",
    };
    addToast(statusMsg[newStatus] ?? "อัปเดตสำเร็จ");
    window.location.reload();
  };

  const handleReopen = async () => {
    setSaving(true);
    const { data: newDefect, error: insertError } = await supabase
      .from("defects")
      .insert({ subject: defect!.subject, description: defect!.description, root_cause: defect!.root_cause, solution: defect!.solution, status: "Reopen", created_by: currentUser.id, parent_id: defect!.id })
      .select().single();
    if (insertError) { setError("Failed to reopen."); setSaving(false); return; }
    await supabase.from("defects").update({ status: "Reopen" }).eq("id", defect!.id);
    setSaving(false);
    addToast("Reopen สำเร็จ — สร้าง Defect ใหม่แล้ว");
    router.push(`/defects/${newDefect.id}`);
  };

  const isReadOnly = status && !["Draft", "Open", "In Progress", "Resolved"].includes(status);
  const isAssignee = !!defect?.assigned_to && defect.assigned_to === currentUser.id;
  const isResolutionDisabled = isReadOnly || !status || ["Draft", "Open"].includes(status) || (status === "In Progress" && !isAssignee);
  const showResolutionSection = !!status && !["Draft", "Open"].includes(status);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isNew ? "New Defect" : defect!.docno}</h1>
          {!isNew && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status!]}`}>{status}</span>
              {defect?.parent_id && (
                <Link href={`/defects/${defect.parent_id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View parent defect
                </Link>
              )}
            </div>
          )}
        </div>
        <Link href="/defects" className="btn-secondary text-sm">← Back to List</Link>
      </div>

      {/* Header Section */}
      <div className="section-card mb-4">
        <div className="section-header"><h2 className="font-semibold text-gray-700">Document Info</h2></div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created</label>
            <p className="text-sm text-gray-800">
              {defect ? new Date(defect.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created By</label>
            <p className="text-sm text-gray-800">{currentUser.email}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Doc No.</label>
            <p className="text-sm text-gray-800 font-mono">{defect?.docno ?? <span className="text-gray-400 italic">Auto-generated</span>}</p>
          </div>
        </div>
      </div>

      {/* Defect Description */}
      <div className="section-card mb-4">
        <button type="button" onClick={() => setDescExpanded((v) => !v)}
          className="section-header w-full flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Defect Description</h2>
          {descExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {descExpanded && <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!!isReadOnly}
              placeholder="Brief description of the defect" className="input-field disabled:bg-gray-50 disabled:text-gray-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
              <select value={module} onChange={(e) => setModule(e.target.value)} disabled={!!isReadOnly}
                className="input-field disabled:bg-gray-50 disabled:text-gray-500">
                <option value="">— Select module —</option>
                {MODULE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={!!isReadOnly}
                className="input-field disabled:bg-gray-50 disabled:text-gray-500">
                <option value="">— Select priority —</option>
                {PRIORITY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!!isReadOnly}
              rows={4} placeholder="Detailed description..." className="input-field resize-none disabled:bg-gray-50 disabled:text-gray-500" />
          </div>
          {existingDescFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attachments</p>
              {existingDescFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={getFileUrl(f.file_path)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex-1 truncate">{f.file_name}</a>
                  {!isReadOnly && <button onClick={() => removeExistingFile(f.id, f.file_path)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          )}
          {!isReadOnly && (
            <div>
              <input type="file" ref={descFileRef} onChange={(e) => { setDescFiles((p) => [...p, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} multiple className="hidden" />
              <button type="button" onClick={() => descFileRef.current?.click()} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                <Paperclip className="w-4 h-4" /> Attach files
              </button>
              {descFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {descFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <FileText className="w-3 h-3" /><span>{f.name}</span>
                      <button onClick={() => setDescFiles((p) => p.filter((_, j) => j !== i))} className="text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>}
      </div>

      {/* Resolution */}
      <div className="section-card mb-6">
        <button type="button" onClick={() => setResExpanded((v) => !v)}
          className="section-header w-full flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Resolution</h2>
          <div className="flex items-center gap-2">
            {isResolutionDisabled && !showResolutionSection && (
              <span className="text-xs text-gray-400 italic">พร้อมใช้งานเมื่อสถานะเป็น In Progress</span>
            )}
            {resExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        {resExpanded && showResolutionSection && <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <p className="text-sm text-gray-800">
              {defect?.assigned_user?.email ?? <span className="text-gray-400 italic">— ยังไม่ได้ assign —</span>}
            </p>
          </div>
          {status === "Rejected" && defect?.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <label className="block text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Rejection Reason</label>
              <p className="text-sm text-red-800">{defect.rejection_reason}</p>
            </div>
          )}
          {status === "Cancelled" && defect?.cancellation_reason && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cancellation Reason</label>
              <p className="text-sm text-gray-700">{defect.cancellation_reason}</p>
            </div>
          )}
          <div>
            <label className={`block text-sm font-medium mb-1 ${fieldErrors.has("rootCause") ? "text-red-600" : "text-gray-700"}`}>Root Cause</label>
            <select value={rootCause} onChange={(e) => { setRootCause(e.target.value); setFieldErrors((p) => { const n = new Set(p); n.delete("rootCause"); return n; }); }} disabled={isResolutionDisabled}
              className={`input-field disabled:bg-gray-50 disabled:text-gray-500 ${fieldErrors.has("rootCause") ? "border-red-400 focus:ring-red-300" : ""}`}>
              <option value="">— Select root cause —</option>
              {ROOT_CAUSE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${fieldErrors.has("solution") ? "text-red-600" : "text-gray-700"}`}>Solution</label>
            <textarea value={solution} onChange={(e) => { setSolution(e.target.value); setFieldErrors((p) => { const n = new Set(p); n.delete("solution"); return n; }); }} disabled={isResolutionDisabled}
              rows={4} placeholder="Describe the solution applied..." className={`input-field resize-none disabled:bg-gray-50 disabled:text-gray-500 ${fieldErrors.has("solution") ? "border-red-400 focus:ring-red-300" : ""}`} />
          </div>
          {existingResFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attachments</p>
              {existingResFiles.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={getFileUrl(f.file_path)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex-1 truncate">{f.file_name}</a>
                  {!isResolutionDisabled && <button onClick={() => removeExistingFile(f.id, f.file_path)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          )}
          {!isResolutionDisabled && (
            <div>
              <input type="file" ref={resFileRef} onChange={(e) => { setResFiles((p) => [...p, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} multiple className="hidden" />
              <button type="button" onClick={() => resFileRef.current?.click()} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                <Paperclip className="w-4 h-4" /> Attach files
              </button>
              {resFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {resFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <FileText className="w-3 h-3" /><span>{f.name}</span>
                      <button onClick={() => setResFiles((p) => p.filter((_, j) => j !== i))} className="text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>}
      </div>

      {/* Action Buttons */}

      <div className="flex flex-col gap-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => { setError(""); setFieldErrors(new Set()); }} className="ml-4 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}
        <div className="flex flex-wrap gap-3 justify-end">
        {(isNew || status === "Draft") && (
          <>
            <button onClick={() => saveDefect("Draft")} disabled={saving} className="btn-secondary">{saving ? "Saving..." : "Save (Draft)"}</button>
            <button onClick={() => saveDefect("Open")} disabled={saving} className="btn-primary">{saving ? "Submitting..." : "Submit"}</button>
          </>
        )}
        {status === "Open" && currentUser.id === defect?.created_by && (
          <>
            <button onClick={() => saveDefect(status)} disabled={saving} className="btn-secondary">{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setShowCancelModal(true)} disabled={saving}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
          </>
        )}
        {status === "In Progress" && (
          <>
            <button onClick={() => saveDefect(status)} disabled={saving} className="btn-secondary">{saving ? "Saving..." : "Save"}</button>
            {isAssignee && (
              <button onClick={() => setShowRejectModal(true)} disabled={saving} className="btn-danger">Reject</button>
            )}
            {isAssignee && (
              <button onClick={() => {
                const errs = new Set<string>();
                if (!rootCause) errs.add("rootCause");
                if (!solution.trim()) errs.add("solution");
                if (errs.size > 0) { setFieldErrors(errs); setError("Please fill in Root Cause and Solution before resolving."); return; }
                setFieldErrors(new Set());
                saveDefect("Resolved");
              }} disabled={saving} className="btn-success">Resolve</button>
            )}
            {currentUser.id === defect?.created_by && (
              <button onClick={() => setShowCancelModal(true)} disabled={saving}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
            )}
          </>
        )}
        {status === "Resolved" && (
          <>
            <button onClick={handleReopen} disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              {saving ? "Processing..." : "Reopen"}
            </button>
            <button onClick={() => changeStatus("Completed")} disabled={saving} className="btn-success">Completed</button>
          </>
        )}
        </div>
      </div>

      {showRejectModal && (
        <Modal title="Reject Defect" onClose={() => setShowRejectModal(false)}>
          <p className="text-sm text-gray-600 mb-3">Please provide a reason for rejection:</p>
          <textarea value={modalReason} onChange={(e) => setModalReason(e.target.value)} rows={3} placeholder="Enter rejection reason..." className="input-field mb-4" autoFocus />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary" disabled={modalLoading}>Cancel</button>
            <button onClick={() => changeStatus("Rejected", { rejection_reason: modalReason })} disabled={!modalReason.trim() || modalLoading} className="btn-danger">
              {modalLoading ? "Rejecting..." : "Confirm Reject"}
            </button>
          </div>
        </Modal>
      )}

      {showCancelModal && (
        <Modal title="Cancel Defect" onClose={() => setShowCancelModal(false)}>
          <p className="text-sm text-gray-600 mb-3">Please provide a reason for cancellation:</p>
          <textarea value={modalReason} onChange={(e) => setModalReason(e.target.value)} rows={3} placeholder="Enter cancellation reason..." className="input-field mb-4" autoFocus />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowCancelModal(false)} className="btn-secondary" disabled={modalLoading}>Back</button>
            <button onClick={() => changeStatus("Cancelled", { cancellation_reason: modalReason })} disabled={!modalReason.trim() || modalLoading}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              {modalLoading ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </Modal>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
