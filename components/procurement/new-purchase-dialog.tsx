"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Plus, X, Loader2, AlertCircle, CheckCircle2, UserPlus } from "lucide-react";

interface SupplierOption {
  id: string;
  name: string;
  contactPerson?: string | null;
}

interface MedicineOption {
  id: string;
  sku: string;
  name: string;
}

interface BranchOption {
  id: string;
  code: string;
  name: string;
}

interface NewPurchaseDialogProps {
  buttonLabel?: string;
  suppliers?: SupplierOption[];
  medicines?: MedicineOption[];
  branches?: BranchOption[];
}

export function NewPurchaseDialog({
  buttonLabel = "New Purchase",
  suppliers: initialSuppliers = [],
  medicines = [],
  branches = [],
}: NewPurchaseDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Supplier List State (can expand if quick-created)
  const [suppliers, setSuppliers] = useState<SupplierOption[]>(initialSuppliers);
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  // Form Fields
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSuppliers[0]?.id || "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || "");
  const [selectedMedicineId, setSelectedMedicineId] = useState(medicines[0]?.id || "");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("50");
  const [unitPrice, setUnitPrice] = useState("5.00");
  const [sellingPrice, setSellingPrice] = useState("8.50");

  const handleOpen = () => {
    setIsOpen(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!invoiceNumber) {
      setInvoiceNumber(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    if (!expiryDate) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 2);
      setExpiryDate(nextYear.toISOString().split("T")[0]);
    }
  };

  const handleQuickCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    setIsCreatingSupplier(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/procurement/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSupplierName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create supplier");
      }

      const created = data.data;
      setSuppliers((prev) => [...prev, created]);
      setSelectedSupplierId(created.id);
      setNewSupplierName("");
      setShowQuickSupplier(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create supplier");
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!selectedSupplierId) {
        throw new Error("Please select or create a supplier");
      }
      if (!invoiceNumber.trim()) {
        throw new Error("Invoice / PO number is required");
      }
      if (!selectedMedicineId) {
        throw new Error("Please select a pharmaceutical item");
      }
      if (!batchNumber.trim()) {
        throw new Error("Batch lot number is required");
      }
      if (!expiryDate) {
        throw new Error("Expiry date is required");
      }

      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Quantity must be a positive integer");
      }

      const cost = parseFloat(unitPrice);
      if (isNaN(cost) || cost <= 0) {
        throw new Error("Purchase unit cost must be greater than zero");
      }

      const sell = parseFloat(sellingPrice);
      if (isNaN(sell) || sell <= 0) {
        throw new Error("Selling price must be greater than zero");
      }

      const payload = {
        supplierId: selectedSupplierId,
        branchId: selectedBranchId || undefined,
        invoiceNumber: invoiceNumber.trim(),
        purchaseDate: new Date().toISOString(),
        items: [
          {
            medicineId: selectedMedicineId,
            batchNumber: batchNumber.trim().toUpperCase(),
            expiryDate: new Date(expiryDate).toISOString(),
            quantity: qty,
            unitPrice: cost,
            sellingPrice: sell,
            tax: 0,
          },
        ],
      };

      const res = await fetch("/api/procurement/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to record purchase order");
      }

      setSuccessMessage("Purchase order and stock batches received successfully.");
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
        setBatchNumber("");
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
        <Plus className="h-4 w-4" />
        {buttonLabel}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <Truck className="h-5 w-5 text-[#0F766E]" />
                <h3 className="font-semibold text-base">Inbound Purchase Order & Stock Receipt</h3>
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
              {/* Supplier Selection / Quick Create */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">Pharmaceutical Supplier *</label>
                  <button
                    type="button"
                    onClick={() => setShowQuickSupplier(!showQuickSupplier)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#0F766E] hover:underline"
                  >
                    <UserPlus className="h-3 w-3" />
                    {showQuickSupplier ? "Select Existing" : "+ Quick Add Supplier"}
                  </button>
                </div>

                {showQuickSupplier ? (
                  <div className="mt-1 flex gap-2">
                    <Input
                      placeholder="e.g. Pfizer Distributing Corp"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      onClick={handleQuickCreateSupplier}
                      disabled={isCreatingSupplier || !newSupplierName.trim()}
                      className="shrink-0 bg-[#0F766E] text-white hover:bg-[#115E59] text-xs"
                    >
                      {isCreatingSupplier ? "Saving..." : "Add"}
                    </Button>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Invoice & Branch */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Invoice / PO Number *</label>
                  <Input
                    required
                    placeholder="e.g. INV-9901"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="mt-1 font-mono text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Destination Branch</label>
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
              </div>

              {/* Medicine Item Section */}
              <div className="rounded-lg border border-[#E2E8F0] bg-slate-50/50 p-3 space-y-3">
                <span className="block text-xs font-semibold text-slate-800">
                  Batch Receipt Item Details
                </span>

                <div>
                  <label className="block text-xs font-medium text-slate-700">Select Medicine *</label>
                  <select
                    required
                    value={selectedMedicineId}
                    onChange={(e) => setSelectedMedicineId(e.target.value)}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Batch Lot Number *</label>
                    <Input
                      required
                      placeholder="e.g. BATCH-2026-X1"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="mt-1 font-mono text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Expiry Date *</label>
                    <Input
                      required
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700">Units Qty *</label>
                    <Input
                      required
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700">Cost Price ($) *</label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700">POS Price ($) *</label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
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
                  disabled={isSubmitting || !selectedSupplierId || !selectedMedicineId}
                  className="bg-[#0F766E] text-white hover:bg-[#115E59] text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Receiving...
                    </>
                  ) : (
                    "Receive Order"
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
