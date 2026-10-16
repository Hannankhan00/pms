"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface BatchItem {
  id: string;
  batchNumber: string;
  sellingPrice?: number;
}

interface MedicineItem {
  id: string;
  sku: string;
  name: string;
  batches?: BatchItem[];
}

interface BranchItem {
  id: string;
  code: string;
  name: string;
}

interface AdjustStockDialogProps {
  buttonLabel?: string;
  medicines?: MedicineItem[];
  branches?: BranchItem[];
}

export function AdjustStockDialog({
  buttonLabel = "Adjust Stock",
  medicines = [],
  branches = [],
}: AdjustStockDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || "");
  const [quantity, setQuantity] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"ADD" | "DEDUCT">("ADD");
  const [notes, setNotes] = useState("");

  const selectedMed = medicines.find((m) => m.id === selectedMedicineId);
  const availableBatches = selectedMed?.batches || [];

  const handleOpen = () => {
    setIsOpen(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!selectedBranchId && branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!selectedMedicineId) {
        throw new Error("Please select a pharmaceutical item");
      }
      if (!selectedBatchId) {
        throw new Error("Please select a valid batch number");
      }
      const rawQty = parseFloat(quantity);
      if (isNaN(rawQty) || rawQty <= 0) {
        throw new Error("Quantity must be a positive number");
      }
      if (!notes.trim()) {
        throw new Error("An audit reason/note is required for regulatory compliance");
      }

      const finalQuantity = adjustmentType === "ADD" ? rawQty : -rawQty;

      const payload = {
        medicineId: selectedMedicineId,
        batchId: selectedBatchId,
        branchId: selectedBranchId || undefined,
        quantity: finalQuantity,
        notes: notes.trim(),
      };

      const res = await fetch("/api/inventory/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Stock adjustment failed");
      }

      setSuccessMessage("Inventory adjustment recorded in ledger.");
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
        setSelectedMedicineId("");
        setSelectedBatchId("");
        setQuantity("");
        setNotes("");
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
      <Button onClick={handleOpen} className="gap-2 bg-[#0F766E] text-white hover:bg-[#115E59]">
        <Scale className="h-4 w-4" />
        {buttonLabel}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <Scale className="h-5 w-5 text-[#0F766E]" />
                <h3 className="font-semibold text-base">Record Inventory Adjustment</h3>
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
                <label className="block text-xs font-medium text-slate-700">Select Medicine *</label>
                <select
                  required
                  value={selectedMedicineId}
                  onChange={(e) => {
                    setSelectedMedicineId(e.target.value);
                    setSelectedBatchId("");
                  }}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
                >
                  <option value="">-- Choose Medicine --</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Select Batch *</label>
                <select
                  required
                  disabled={!selectedMedicineId}
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none disabled:bg-slate-100 font-mono"
                >
                  <option value="">
                    {selectedMedicineId
                      ? availableBatches.length > 0
                        ? "-- Choose Batch --"
                        : "No registered batches for this medicine"
                      : "-- Select medicine first --"}
                  </option>
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch: {b.batchNumber}
                    </option>
                  ))}
                </select>
              </div>

              {branches.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700">Pharmacy Branch</label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700">Adjustment Type</label>
                <div className="mt-1.5 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="adjustmentType"
                      checked={adjustmentType === "ADD"}
                      onChange={() => setAdjustmentType("ADD")}
                      className="text-[#0F766E] focus:ring-[#0F766E]"
                    />
                    <span className="text-xs font-medium text-emerald-700">+ Inbound Correction (Increase)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="adjustmentType"
                      checked={adjustmentType === "DEDUCT"}
                      onChange={() => setAdjustmentType("DEDUCT")}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-xs font-medium text-rose-700">- Physical Audit Loss (Deduct)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Units Quantity *</label>
                <Input
                  required
                  type="number"
                  step="1"
                  min="1"
                  placeholder="e.g. 5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Audit Justification / Notes *</label>
                <Input
                  required
                  placeholder="e.g. Physical inventory count discrepancy reconciliation"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 text-xs"
                />
                <span className="text-[11px] text-slate-400">Required for regulatory compliance tracing</span>
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
                  disabled={isSubmitting || !selectedBatchId}
                  className="bg-[#0F766E] text-white hover:bg-[#115E59] text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post Adjustment"
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
