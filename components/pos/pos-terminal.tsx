"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Search,
  Pill,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Calendar,
  Layers,
  Lock,
  Unlock,
  Clock,
  Coins,
  FileText,
  DollarSign,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface MedicineOption {
  id: string;
  sku: string;
  name: string;
  category?: { name: string } | null;
  batches: Array<{
    id: string;
    batchNumber: string;
    expiryDate: string | Date;
    sellingPrice: number | any;
  }>;
}

interface CartItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  unitPrice: number;
  quantity: number;
}

interface BranchOption {
  id: string;
  code: string;
  name: string;
}

interface ActiveShift {
  id: string;
  tenantId: string;
  userId: string;
  branchId: string;
  status: "OPEN" | "CLOSED";
  openingCash: number | any;
  openedAt: string;
  branch?: {
    code: string;
    name: string;
  };
  user?: {
    name: string;
    email: string;
  };
}

interface PosTerminalProps {
  medicines: MedicineOption[];
  branches?: BranchOption[];
  branchId?: string;
}

export function PosTerminal({ medicines, branches = [], branchId }: PosTerminalProps) {
  const { t, formatCurrency, currency } = useI18n();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shift Management State
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Open Shift Form State
  const [openingFloat, setOpeningFloat] = useState("100.00");
  const [selectedBranchId, setSelectedBranchId] = useState(branchId || (branches[0]?.id ?? ""));
  const [openingNotes, setOpeningNotes] = useState("");
  const [isOpeningShift, setIsOpeningShift] = useState(false);

  // Close Shift Form State
  const [closingCash, setClosingCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<{
    openingCash: number;
    expectedCash: number;
    cashSales: number;
  } | null>(null);

  // Fetch current active shift
  const fetchCurrentShift = async () => {
    try {
      setLoadingShift(true);
      const res = await fetch("/api/pos/shifts/current");
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setActiveShift(data.data);
      } else {
        setActiveShift(null);
      }
    } catch (e) {
      setActiveShift(null);
    } finally {
      setLoadingShift(false);
    }
  };

  useEffect(() => {
    fetchCurrentShift();
  }, []);

  // Update selected branch when branches prop changes
  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Open Shift Action
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpeningShift(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/pos/shifts/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId || branches[0]?.id,
          openingCash: parseFloat(openingFloat) || 0,
          notes: openingNotes || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || "Failed to open shift");
      }

      setActiveShift(result.data);
      setShowOpenModal(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to open shift");
    } finally {
      setIsOpeningShift(false);
    }
  };

  // Close Shift Action
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    setIsClosingShift(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/pos/shifts/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: activeShift.id,
          closingCash: parseFloat(closingCash) || 0,
          notes: closingNotes || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || "Failed to close shift");
      }

      setActiveShift(null);
      setShowCloseModal(false);
      setClosingCash("");
      setClosingNotes("");
      setCart([]);
      setSuccessResult({
        title: "Shift Closed & Reconciled",
        details: result.data,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to close shift");
    } finally {
      setIsClosingShift(false);
    }
  };

  // Filter medicines by search term
  const filteredMedicines = medicines.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q)
    );
  });

  const addToCart = (med: MedicineOption, batch: any) => {
    setSuccessResult(null);
    setErrorMessage(null);

    const existingIndex = cart.findIndex((i) => i.batchId === batch.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          medicineId: med.id,
          medicineName: med.name,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: new Date(batch.expiryDate).toLocaleDateString(),
          unitPrice: Number(batch.sellingPrice),
          quantity: 1,
        },
      ]);
    }
  };

  const removeFromCart = (batchId: string) => {
    setCart(cart.filter((i) => i.batchId !== batchId));
  };

  const updateQuantity = (batchId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(batchId);
      return;
    }
    setCart(
      cart.map((i) => (i.batchId === batchId ? { ...i, quantity: qty } : i))
    );
  };

  const subtotal = cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const total = subtotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!activeShift) {
      setErrorMessage("Cannot complete sale: You must have an OPEN cashier shift.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const payload = {
        branchId: activeShift.branchId || branchId || undefined,
        items: cart.map((item) => ({
          medicineId: item.medicineId,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: 0,
          tax: 0,
        })),
        payments: [
          {
            method: paymentMethod,
            amount: total,
          },
        ],
        discount: 0,
        tax: 0,
        notes: `POS Cashier Transaction - Shift ${activeShift.id.slice(0, 8)}`,
      };

      const response = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Checkout failed");
      }

      setSuccessResult(data.data);
      setCart([]);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Shift Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              activeShift ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {activeShift ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#0F172A]">
                {activeShift ? t.shifts.activeShift : t.shifts.noActiveShift}
              </span>
              <Badge
                variant="outline"
                className={
                  activeShift
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-amber-300 bg-amber-50 text-amber-800"
                }
              >
                {activeShift ? "OPEN" : "LOCKED"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              {activeShift ? (
                <>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {new Date(activeShift.openedAt).toLocaleTimeString()}
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-slate-400" />
                    Float: <span className="font-mono font-semibold">{formatCurrency(Number(activeShift.openingCash))}</span>
                  </span>
                  {activeShift.branch && (
                    <>
                      <span>|</span>
                      <span>{activeShift.branch.name} ({activeShift.branch.code})</span>
                    </>
                  )}
                </>
              ) : (
                <span>POS checkout is locked until a shift is opened with starting drawer float.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeShift ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCloseModal(true)}
              className="border-amber-300 text-amber-800 hover:bg-amber-50 w-full sm:w-auto"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              {t.shifts.endShiftTitle}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowOpenModal(true)}
              className="bg-[#0F766E] text-white hover:bg-[#115E59] w-full sm:w-auto"
            >
              <Unlock className="mr-1.5 h-3.5 w-3.5" />
              {t.shifts.startShiftTitle}
            </Button>
          )}
        </div>
      </div>

      {/* Main Terminal Layout */}
      <div className="grid gap-6 lg:grid-cols-12 relative">
        {/* If no active shift, blur/overlay protection */}
        {!activeShift && !loadingShift && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-slate-900/10 backdrop-blur-[2px]">
            <Card className="w-full max-w-md border-[#E2E8F0] shadow-xl p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#0F766E]">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A]">{t.shifts.startShiftTitle}</h2>
              <p className="mt-1 text-xs text-slate-500">{t.shifts.startShiftDesc}</p>
              <Button
                onClick={() => setShowOpenModal(true)}
                className="mt-5 w-full bg-[#0F766E] text-white hover:bg-[#115E59]"
              >
                <Unlock className="mr-2 h-4 w-4" />
                {t.shifts.openShiftButton}
              </Button>
            </Card>
          </div>
        )}

        {/* Left Column: Medicine Catalog & FEFO Batch Picker */}
        <div className="space-y-4 lg:col-span-7">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#0F172A]">
                Medicine Selection
              </CardTitle>
              <CardDescription className="text-xs">
                Search available inventory and inspect FEFO-prioritized batches
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t.pos.scanOrSearch}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto p-4 pt-0">
              <div className="space-y-3">
                {filteredMedicines.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No medicines match search criteria.
                  </div>
                ) : (
                  filteredMedicines.map((med) => {
                    const hasBatches = med.batches && med.batches.length > 0;

                    return (
                      <div
                        key={med.id}
                        className="rounded-lg border border-[#E2E8F0] bg-white p-3 transition-colors hover:border-[#0F766E]/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">{med.name}</div>
                            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                              <span>SKU: {med.sku}</span>
                              {med.category && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {med.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Batch Selection (FEFO List) */}
                        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2">
                          <div className="text-[11px] font-medium text-slate-500">
                            Available Batches (FEFO Sort):
                          </div>
                          {!hasBatches ? (
                            <div className="text-xs italic text-amber-600">
                              Out of stock / No batches available
                            </div>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {med.batches.map((batch, index) => {
                                const isFirstExpiring = index === 0;
                                return (
                                  <div
                                    key={batch.id}
                                    className={`flex items-center justify-between rounded border p-2 text-xs transition-colors ${
                                      isFirstExpiring
                                        ? "border-teal-200 bg-teal-50/50"
                                        : "border-slate-100 bg-slate-50/50"
                                    }`}
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5 font-mono font-medium text-slate-800">
                                        <span>{batch.batchNumber}</span>
                                        {isFirstExpiring && (
                                          <Badge className="bg-[#0F766E] px-1 py-0 text-[9px] text-white">
                                            FEFO
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Calendar className="h-3 w-3" />
                                        Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                                      </div>
                                      <div className="font-mono font-bold text-slate-900">
                                        {formatCurrency(Number(batch.sellingPrice))}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={isFirstExpiring ? "default" : "outline"}
                                      className={`h-7 px-2 text-xs ${
                                        isFirstExpiring
                                          ? "bg-[#0F766E] hover:bg-[#115E59]"
                                          : ""
                                      }`}
                                      disabled={!activeShift}
                                      onClick={() => addToCart(med, batch)}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dispensing Cart & Payment Checkout */}
        <div className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-[#0F172A]">
                  <ShoppingCart className="h-4 w-4 text-[#0F766E]" />
                  {t.pos.cart}
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {cart.reduce((a, b) => a + b.quantity, 0)} Items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              {errorMessage && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successResult && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <div className="flex items-center gap-1 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    Sale Completed Successfully
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-emerald-700">
                    Receipt: {successResult.saleNumber || successResult.id || "Recorded"} | Shift:{" "}
                    {activeShift?.id?.slice(0, 8) || "N/A"}
                  </div>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {t.pos.emptyCart}
                </div>
              ) : (
                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.batchId}
                      className="flex items-center justify-between rounded border border-slate-100 p-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-slate-900">{item.medicineName}</div>
                        <div className="font-mono text-[10px] text-slate-400">
                          Lot: {item.batchNumber} | {formatCurrency(item.unitPrice)}/ea
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded border border-slate-200">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.batchId, item.quantity - 1)}
                            className="px-2 py-0.5 text-slate-500 hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.batchId, item.quantity + 1)}
                            className="px-2 py-0.5 text-slate-500 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                        <div className="w-20 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.batchId)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Calculation */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>{t.pos.subtotal}</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{t.pos.tax} (0%)</span>
                  <span className="font-mono">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>{t.pos.totalPayable}</span>
                  <span className="font-mono text-[#0F766E]">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-medium text-slate-500">
                  {t.pos.paymentMethod}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "CASH" ? "default" : "outline"}
                    className={`h-9 text-xs ${
                      paymentMethod === "CASH" ? "bg-[#0F766E] hover:bg-[#115E59]" : ""
                    }`}
                    onClick={() => setPaymentMethod("CASH")}
                  >
                    <Banknote className="mr-1.5 h-3.5 w-3.5" />
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "CARD" ? "default" : "outline"}
                    className={`h-9 text-xs ${
                      paymentMethod === "CARD" ? "bg-[#0F766E] hover:bg-[#115E59]" : ""
                    }`}
                    onClick={() => setPaymentMethod("CARD")}
                  >
                    <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                    Card / POS
                  </Button>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                type="button"
                className="w-full bg-[#0F766E] text-white hover:bg-[#115E59]"
                disabled={cart.length === 0 || isSubmitting || !activeShift}
                onClick={handleCheckout}
              >
                {isSubmitting ? (
                  "Processing Transaction..."
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {t.pos.checkout} ({formatCurrency(total)})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* START SHIFT MODAL */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-[#0F766E]">
                <Unlock className="h-5 w-5" />
                <CardTitle className="text-base font-bold text-[#0F172A]">
                  {t.shifts.startShiftTitle}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {t.shifts.startShiftDesc}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleOpenShift}>
              <CardContent className="space-y-4">
                {branches.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Pharmacy Branch
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.shifts.openingFloat} ({currency})
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={openingFloat}
                      onChange={(e) => setOpeningFloat(e.target.value)}
                      className="pl-9 font-mono text-xs"
                      placeholder={t.shifts.openingFloatPlaceholder}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Verified physical float placed into the register drawer.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Initial Shift Notes (Optional)
                  </label>
                  <Input
                    value={openingNotes}
                    onChange={(e) => setOpeningNotes(e.target.value)}
                    className="text-xs"
                    placeholder="e.g. Morning opening shift register #1"
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOpenModal(false)}
                >
                  {t.actions.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isOpeningShift}
                  className="bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  {isOpeningShift ? "Opening Shift..." : t.shifts.openShiftButton}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* END SHIFT / CASH RECONCILIATION MODAL */}
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-amber-600">
                <Lock className="h-5 w-5" />
                <CardTitle className="text-base font-bold text-[#0F172A]">
                  {t.shifts.endShiftTitle}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {t.shifts.endShiftDesc}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCloseShift}>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Shift Started:</span>
                    <span className="font-mono text-slate-700">
                      {new Date(activeShift.openedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Starting Float:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(Number(activeShift.openingCash))}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.shifts.actualCashCount} ({currency})
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      className="pl-9 font-mono text-xs font-bold"
                      placeholder={t.shifts.actualCashPlaceholder}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Blind count: Count the total physical cash in the drawer.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.shifts.notes}
                  </label>
                  <Input
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="text-xs"
                    placeholder={t.shifts.notesPlaceholder}
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCloseModal(false)}
                >
                  {t.actions.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isClosingShift || !closingCash}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                >
                  {isClosingShift ? "Closing & Balancing..." : t.shifts.closeShiftButton}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
