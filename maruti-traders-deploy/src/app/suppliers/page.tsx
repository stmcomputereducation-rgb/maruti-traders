"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR } from "@/lib/formatters";
import {
  Truck,
  Plus,
  Search,
  Phone,
  CreditCard,
  Building,
  CheckCircle,
  X,
} from "lucide-react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number | string>("");
  const [payMode, setPayMode] = useState("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    phone: "",
    email: "",
    address: "",
    city: "Ahmedabad",
    gstin: "",
    openingBalance: 0,
    paymentTermsDays: 30,
    bankDetails: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const d = await res.json();
        setSuppliers(d.suppliers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAddOpen(false);
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create supplier");
      }
    } catch {
      alert("Error adding supplier");
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentSupplier) return;

    try {
      const res = await fetch("/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "SUPPLIER",
          partyId: paymentSupplier.id,
          amount: payAmount,
          paymentMode: payMode,
          referenceNumber: payRef,
          notes: `Payment to ${paymentSupplier.name}`,
        }),
      });

      if (res.ok) {
        setPaymentSupplier(null);
        setPayAmount("");
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record payment");
      }
    } catch {
      alert("Error processing payment");
    }
  }

  const totalPayables = suppliers.reduce((acc, s) => acc + (s.currentBalance || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-navy-900 truncate whitespace-nowrap">Suppliers & Vendor Accounts</h1>
              <span className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-semibold border border-blue-300 whitespace-nowrap">
                {suppliers.length} Vendors
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              Manufacturers, wholesale distributors, payment terms, and vendor ledgers
            </p>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-sm transition self-start sm:self-auto shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Add Supplier</span>
          </button>
        </div>

        {/* Metrics Banner - Responsive for all window aspect ratios */}
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Payables
            </span>
            <p className="text-base sm:text-2xl font-black text-rose-600 mt-0.5 sm:mt-1">{formatINR(totalPayables)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Outstanding vendor dues</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Vendors
            </span>
            <p className="text-base sm:text-2xl font-black text-navy-900 mt-0.5 sm:mt-1">{suppliers.length} Companies</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Quarries & distributors</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 col-span-2 sm:col-span-2 xl:col-span-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Prompt Payment Discount
            </span>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-1 sm:mt-2">
              Manage cash discount periods and 30-day payment cycles smoothly
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm border border-slate-200/80">
          <div className="relative">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute left-3 top-2 sm:top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by supplier name, company name, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Suppliers: Mobile Card Feed (No Horizontal Scroll) & Desktop Table */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Mobile Card Feed (Phones & Small Tablets) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading supplier records...</div>
            ) : suppliers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No supplier accounts found.</div>
            ) : (
              suppliers.map((s) => (
                <div key={s.id} className="p-3 space-y-2 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-navy-900 truncate block">{s.name}</span>
                      {s.companyName && (
                        <span className="text-[10px] text-slate-500 truncate block">{s.companyName}</span>
                      )}
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {s.phone ? (
                          <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a>
                        ) : (
                          <span className="text-slate-400">No Phone</span>
                        )}
                        {s.city && <span>• {s.city}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-xs text-rose-600 block">{formatINR(s.currentBalance)}</span>
                      <span className="text-[9px] text-slate-400 block">Payable ({s.paymentTermsDays}d term)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-dashed border-slate-200">
                    <button
                      onClick={() => {
                        setPaymentSupplier(s);
                        setPayAmount(s.currentBalance > 0 ? s.currentBalance : "");
                      }}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition"
                    >
                      <CreditCard className="h-3 w-3" />
                      <span>Pay Supplier</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-[11px] sm:text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Supplier / Firm</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Contact & Location</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">GSTIN</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">Credit Term</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Balance Payable (₹)</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading supplier records...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No supplier accounts found.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-navy-900 text-xs block">{s.name}</span>
                        {s.companyName && (
                          <span className="text-[11px] text-slate-500">{s.companyName}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center space-x-1 font-mono font-medium">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{s.phone || "-"}</span>
                        </div>
                        <span className="block text-[11px] text-slate-500">{s.city}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {s.gstin ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">
                            {s.gstin}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {s.paymentTermsDays} Days
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-sm text-rose-600 font-mono">
                          {formatINR(s.currentBalance)}
                        </span>
                        <span className="block text-[10px] text-slate-400">Payable (Credit)</span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setPaymentSupplier(s);
                            setPayAmount(s.currentBalance > 0 ? s.currentBalance : "");
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded text-[11px] font-semibold transition"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Pay Supplier</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pay Supplier Modal */}
        {paymentSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Record Payment to {paymentSupplier.name}</h3>
                <button onClick={() => setPaymentSupplier(null)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-500">Supplier:</span>
                  <p className="font-bold text-navy-900 text-sm">{paymentSupplier.name}</p>
                  <p className="text-slate-600 mt-1">
                    Outstanding Payable:{" "}
                    <strong className="text-rose-700">{formatINR(paymentSupplier.currentBalance)}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold font-mono focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Payment Mode</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Bank UTR / Cheque Reference Number
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. NEFT-SBIN-8930482"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setPaymentSupplier(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    Post Payment Voucher
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Supplier Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Add New Supplier Profile</h3>
                <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddSupplier} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Supplier / Contact Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Havells India Ltd"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Mobile Phone (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 9825088776 (Optional)"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">GSTIN Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="24AAACH4567J1Z6"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Address & City (Optional)</label>
                    <input
                      type="text"
                      placeholder="Savli GIDC, Vadodara"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
