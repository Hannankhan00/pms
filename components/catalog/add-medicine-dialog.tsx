"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pill, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface AddMedicineDialogProps {
  buttonLabel?: string;
}

export function AddMedicineDialog({ buttonLabel = "Add Medicine" }: AddMedicineDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    barcode: "",
    strength: "",
    reorderLevel: "10",
    nameAr: "",
    nameFr: "",
    nameIt: "",
    isPrescriptionRequired: false,
    isNarcotic: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!formData.sku.trim()) {
        throw new Error("SKU code is required");
      }
      if (!formData.name.trim()) {
        throw new Error("Medicine name is required");
      }

      const payload = {
        sku: formData.sku.trim().toUpperCase(),
        name: formData.name.trim(),
        barcode: formData.barcode.trim() || undefined,
        strength: formData.strength.trim() || undefined,
        reorderLevel: parseInt(formData.reorderLevel, 10) || 10,
        nameAr: formData.nameAr.trim() || undefined,
        nameFr: formData.nameFr.trim() || undefined,
        nameIt: formData.nameIt.trim() || undefined,
        isPrescriptionRequired: formData.isPrescriptionRequired,
        isNarcotic: formData.isNarcotic,
      };

      const res = await fetch("/api/catalog/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to register medicine");
      }

      setSuccessMessage("Medicine added to catalog successfully.");
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
        setFormData({
          sku: "",
          name: "",
          barcode: "",
          strength: "",
          reorderLevel: "10",
          nameAr: "",
          nameFr: "",
          nameIt: "",
          isPrescriptionRequired: false,
          isNarcotic: false,
        });
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
          <div className="w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <Pill className="h-5 w-5 text-[#0F766E]" />
                <h3 className="font-semibold text-base">Add Pharmaceutical Product</h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">SKU Code *</label>
                  <Input
                    required
                    placeholder="e.g. MED-AMX-500"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="mt-1 font-mono text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Barcode / UPC</label>
                  <Input
                    placeholder="e.g. 890123456789"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="mt-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Medicine Name (English) *</label>
                <Input
                  required
                  placeholder="e.g. Amoxicillin Trihydrate"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Strength / Potency</label>
                  <Input
                    placeholder="e.g. 500mg, 10ml, 5%"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Reorder Alert Level</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    className="mt-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-3">
                <span className="block text-[11px] font-semibold uppercase text-slate-500 mb-2">
                  Multilingual Translations (Optional)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600">Arabic (RTL)</label>
                    <Input
                      dir="rtl"
                      placeholder="أموكسيسيلين"
                      value={formData.nameAr}
                      onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                      className="mt-0.5 text-xs text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600">French</label>
                    <Input
                      placeholder="Amoxicilline"
                      value={formData.nameFr}
                      onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                      className="mt-0.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600">Italian</label>
                    <Input
                      placeholder="Amoxicillina"
                      value={formData.nameIt}
                      onChange={(e) => setFormData({ ...formData, nameIt: e.target.value })}
                      className="mt-0.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-3 space-y-2">
                <span className="block text-[11px] font-semibold uppercase text-slate-500">
                  Regulatory Flags
                </span>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPrescriptionRequired}
                      onChange={(e) => setFormData({ ...formData, isPrescriptionRequired: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <span className="text-xs text-slate-700">Prescription Required (Rx)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isNarcotic}
                      onChange={(e) => setFormData({ ...formData, isNarcotic: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-xs text-slate-700">Controlled Substance / Narcotic</span>
                  </label>
                </div>
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
                      Registering...
                    </>
                  ) : (
                    "Add to Catalog"
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
