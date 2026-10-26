"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate } from "@/lib/formatters";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle,
} from "lucide-react";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [purchaseToRemove, setPurchaseToRemove] = useState<any>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchPurchases();
  }, [search]);

  async function fetchPurchases() {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const d = await res.json();
        setPurchases(d.purchases || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmRemovePurchase() {
    if (!purchaseToRemove) return;
    setIsRemoving(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseToRemove.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        setNotificationMsg({
          type: "success",
          text: data.message || `Purchase "${purchaseToRemove.purchaseNumber}" successfully removed.`,
        });
        setTimeout(() => setNotificationMsg(null), 5000);
        setPurchaseToRemove(null);
        fetchPurchases();
      } else {
        alert(data.error || "Failed to remove purchase");
      }
    } catch {
      alert("Error removing purchase record");
    } finally {
      setIsRemoving(false);
    }
  }

  const totalVolume = purchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
  const totalPaid = purchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
  const totalDue = purchases.reduce((acc, p) => acc + (p.balanceDue || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Notification Toast */}
        {notificationMsg && (
          <div
            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex items-center justify-between text-xs font-bold transition shadow-md ${
              notificationMsg.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-rose-50 text-rose-900 border-rose-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notificationMsg.text}</span>
            </div>
            <button onClick={() => setNotificationMsg(null)} className="p-1 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-navy-900 truncate whitespace-nowrap">Purchases & Consignments</h1>
              <span className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-semibold border border-blue-300 whitespace-nowrap">
                Stock Inward
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              Supplier bill entry, goods inward to godowns, and vendor ledger accounting
            </p>
          </div>

          <Link
            href="/purchases/new"
            className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-sm transition self-start sm:self-auto shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>New Purchase</span>
          </Link>
        </div>

        {/* Financial Metrics - Responsive for all window aspect ratios */}
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Purchases
            </span>
            <p className="text-base sm:text-2xl font-black text-navy-900 mt-0.5 sm:mt-1">{formatINR(totalVolume)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">{purchases.length} Purchase bills</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Payments Paid
            </span>
            <p className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">{formatINR(totalPaid)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">To manufacturers</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 col-span-2 sm:col-span-2 xl:col-span-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Payables
            </span>
            <p className="text-base sm:text-2xl font-black text-rose-600 mt-0.5 sm:mt-1">{formatINR(totalDue)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Pending liabilities</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm border border-slate-200/80">
          <div className="relative">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute left-3 top-2 sm:top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by purchase number, supplier bill number, supplier name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Purchases: Mobile Card Feed (No Horizontal Scroll) & Desktop Table */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Mobile Card Feed (Phones & Small Tablets) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading purchases...</div>
            ) : purchases.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No purchase entries recorded.</div>
            ) : (
              purchases.map((p) => (
                <div key={p.id} className="p-3 space-y-2 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <Link href={`/purchases/${p.id}`} className="font-mono font-bold text-xs text-navy-900 hover:underline truncate">
                        {p.purchaseNumber}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono">• {formatDate(p.billDate)}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                        p.paymentStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.paymentStatus === "PARTIALLY_PAID"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {p.paymentStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <div className="font-semibold text-slate-900 truncate">
                      {p.supplier?.name}
                      {p.supplier?.city && <span className="text-[10px] text-slate-400 font-normal ml-1">• {p.supplier.city}</span>}
                    </div>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                      {p.godown?.name?.split("-")[0]}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-lg text-center text-[10px]">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Bill Total</span>
                      <span className="font-bold text-navy-900">{formatINR(p.grandTotal)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Paid</span>
                      <span className="font-bold text-emerald-700">{formatINR(p.paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Balance Due</span>
                      <span className={`font-bold ${p.balanceDue > 0 ? "text-rose-600" : "text-slate-500"}`}>
                        {p.balanceDue > 0 ? formatINR(p.balanceDue) : "₹0"}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions Row */}
                  <div className="flex items-center justify-end space-x-2 pt-1.5 border-t border-dashed border-slate-200">
                    <Link
                      href={`/purchases/${p.id}`}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      title="View & Print Bill"
                    >
                      <Eye className="h-3 w-3" />
                      <span>View</span>
                    </Link>
                    <Link
                      href={`/purchases/${p.id}/edit`}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                      title="Edit Purchase"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </Link>
                    <button
                      onClick={() => setPurchaseToRemove(p)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                      title="Remove Purchase"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove</span>
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
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Purchase No.</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Bill No. & Date</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Supplier</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Destination Godown</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Bill Total (₹)</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Paid (₹)</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">Status</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center min-w-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading purchases...
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No purchase entries recorded.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 font-mono font-bold text-navy-900">
                        <Link href={`/purchases/${p.id}`} className="hover:underline">
                          {p.purchaseNumber}
                        </Link>
                      </td>

                      <td className="py-2.5 px-3 sm:py-3 sm:px-4">
                        <span className="font-medium text-slate-800">{p.billNumber || "Direct Inward"}</span>
                        <span className="block text-[10px] text-slate-400">{formatDate(p.billDate)}</span>
                      </td>

                      <td className="py-2.5 px-3 sm:py-3 sm:px-4">
                        <p className="font-bold text-slate-900">{p.supplier.name}</p>
                        <p className="text-[10px] text-slate-500">{p.supplier.city}</p>
                      </td>

                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-slate-700">{p.godown.name.split("-")[0]}</td>

                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-right font-black text-navy-900">
                        {formatINR(p.grandTotal)}
                      </td>

                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-right font-medium text-emerald-700">
                        {formatINR(p.paidAmount)}
                      </td>

                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-right font-bold text-rose-600">
                        {p.balanceDue > 0 ? formatINR(p.balanceDue) : "-"}
                      </td>

                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                            p.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.paymentStatus === "PARTIALLY_PAID"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </td>

                      {/* Desktop Actions */}
                      <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-center whitespace-nowrap min-w-[110px]">
                        <div className="flex items-center justify-center space-x-1.5">
                          <Link
                            href={`/purchases/${p.id}`}
                            className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition"
                            title="View & Print Inward Bill"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/purchases/${p.id}/edit`}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit Purchase"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>

                          <button
                            onClick={() => setPurchaseToRemove(p)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Remove Purchase"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      {purchaseToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 text-slate-900">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Remove Purchase Record?</h3>
                <p className="text-xs text-slate-500 font-mono">{purchaseToRemove.purchaseNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to remove purchase bill from <strong>{purchaseToRemove.supplier?.name}</strong> (Bill value: <strong>{formatINR(purchaseToRemove.grandTotal)}</strong>)?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1 mb-5">
              <p className="font-bold">⚠️ Warning:</p>
              <p>• Inwarded marble stock will be deducted from {purchaseToRemove.godown?.name}.</p>
              <p>• Supplier Khata ledger and balance will be reversed automatically.</p>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPurchaseToRemove(null)}
                disabled={isRemoving}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemovePurchase}
                disabled={isRemoving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-rose-900/20"
              >
                {isRemoving ? <span>Removing...</span> : <span>Confirm Remove</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

