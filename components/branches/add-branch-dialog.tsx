"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Building2, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface AddBranchDialogProps {
  buttonLabel?: string;
}

export function AddBranchDialog({ buttonLabel = "Add Branch" }: AddBranchDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        throw new Error("Branch name must be at least 2 characters");
      }
      if (!formData.code.trim() || formData.code.trim().length < 2) {
        throw new Error("Branch code must be at least 2 alphanumeric characters");
      }

      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          address: formData.address.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create branch");
      }

      setSuccessMessage("Branch created successfully.");
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
        setFormData({ name: "", code: "", address: "", phone: "", isActive: true });
        router.refresh();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2 bg-[#0F766E] text-white hover:bg-[#115E59]">
        <Plus className="h-4 w-4" />
        {buttonLabel}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <Building2 className="h-5 w-5 text-[#0F766E]" />
                <h3 className="font-semibold text-base">Register New Branch</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Branch Name *</label>
                <Input
                  required
                  placeholder="e.g. Downtown Central Dispensary"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Branch Code *</label>
                <Input
                  required
                  placeholder="e.g. BR-CENTRAL-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="mt-1 font-mono text-xs uppercase"
                />
                <span className="text-[11px] text-slate-400">Unique alphanumeric identifier</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Physical Address</label>
                <Input
                  placeholder="e.g. 104 Medical Plaza, Suite 2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Contact Phone</label>
                <Input
                  placeholder="e.g. +1 555-0199"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveBranch"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                />
                <label htmlFor="isActiveBranch" className="text-xs text-slate-700 cursor-pointer">
                  Mark as active branch immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0F766E] text-white hover:bg-[#115E59] text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Branch"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
