"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate, formatDateTime } from "@/lib/formatters";
import { generateInvoiceWhatsAppUrl } from "@/lib/whatsapp";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Share2,
  Eye,
  Printer,
  XCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function SalesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter]);

  async function fetchInvoices() {
    setLoading(true);
    try {
      let url = `/api/sales?search=${encodeURIComponent(search)}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setInvoices(d.invoices || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelInvoice(id: string, invNum: string) {
    const reason = prompt(`Enter cancellation reason for ${invNum}:`);
    if (!reason) return;

    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL", reason }),
      });
      if (res.ok) {
        alert("Invoice cancelled and stock restored to godown.");
        fetchInvoices();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to cancel invoice");
      }
    } catch {
      alert("Error cancelling invoice");
    }
  }

  const totalSalesVolume = invoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const totalBalanceDue = invoices.reduce((acc, i) => acc + (i.balanceDue || 0), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-navy-900 truncate whitespace-nowrap">Sales Invoices & Billing</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-semibold border border-emerald-300 whitespace-nowrap">
                GST Compliant
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              Issue Tax Invoices, cash memos, record payments, and WhatsApp bills
            </p>
          </div>

          <Link
            href="/sales/new"
            className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-sm transition self-start sm:self-auto shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Sale</span>
          </Link>
        </div>

        {/* Metrics Overview - 3 Equal Columns in 1 Row across Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Total Invoiced
            </span>
            <p className="text-base sm:text-2xl font-black text-navy-900 mt-0.5 sm:mt-1 whitespace-nowrap">{formatINR(totalSalesVolume)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate whitespace-nowrap">{invoices.length} Invoices</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Payment Collected
            </span>
            <p className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 whitespace-nowrap">{formatINR(totalCollected)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate whitespace-nowrap">Cash, UPI & Bank</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Pending Balance (Udhaar)
            </span>
            <p className="text-base sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1 whitespace-nowrap">{formatINR(totalBalanceDue)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate whitespace-nowrap">Outstanding customer dues</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute left-3 top-2 sm:top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid (Udhaar)</option>
            </select>
          </div>
        </div>

        {/* Invoices: Mobile Card Feed (No Horizontal Scroll) & Desktop Table */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Mobile Card Feed (Phones & Small Tablets) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No invoices found.</div>
            ) : (
              invoices.map((inv) => {
                const isCancelled = inv.status === "CANCELLED";
                const waUrl = generateInvoiceWhatsAppUrl({
                  customerName: inv.customer?.name || "Customer",
                  customerPhone: inv.customer?.phone || "",
                  invoiceNumber: inv.invoiceNumber,
                  invoiceDate: formatDate(inv.invoiceDate),
                  grandTotal: formatINR(inv.grandTotal),
                  paidAmount: formatINR(inv.paidAmount),
                  balanceDue: formatINR(inv.balanceDue),
                  paymentMode: inv.paymentMode,
                });

                return (
                  <div key={inv.id} className={`p-3 space-y-2 hover:bg-slate-50 transition ${isCancelled ? "opacity-60 bg-slate-50" : ""}`}>
                    {/* Top row: Invoice #, Date, Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <Link href={`/sales/${inv.id}`} className="font-mono font-bold text-xs text-navy-900 hover:underline truncate">
                          {inv.invoiceNumber}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-medium">• {formatDate(inv.invoiceDate)}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        {isCancelled ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                            CANCELLED
                          </span>
                        ) : (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              inv.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.paymentStatus === "PARTIALLY_PAID"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle row: Customer & Payment Mode */}
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <div className="font-semibold text-slate-900 truncate">
                        {inv.customer?.name || "Walk-in Cash"}
                        {inv.customer?.phone && <span className="font-mono text-slate-400 font-normal ml-1">• {inv.customer.phone}</span>}
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                        {inv.paymentMode}
                      </span>
                    </div>

                    {/* Amounts row */}
                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-lg text-center text-[10px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Grand Total</span>
                        <span className="font-bold text-navy-900">{formatINR(inv.grandTotal)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Paid</span>
                        <span className="font-bold text-emerald-600">{formatINR(inv.paidAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Due</span>
                        <span className={`font-bold ${inv.balanceDue > 0 ? "text-amber-600" : "text-slate-500"}`}>
                          {inv.balanceDue > 0 ? formatINR(inv.balanceDue) : "₹0"}
                        </span>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-dashed border-slate-200">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                      >
                        <Share2 className="h-3 w-3" />
                        <span>WhatsApp</span>
                      </a>
                      <Link
                        href={`/sales/${inv.id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View / Print</span>
                      </Link>
                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelInvoice(inv.id, inv.invoiceNumber)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[920px] divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs whitespace-nowrap">
                <tr>
                  <th className="py-3 px-4 text-left">Invoice No.</th>
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Customer / Party</th>
                  <th className="py-3 px-4 text-left">Godown</th>
                  <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 text-right">Paid (₹)</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const isCancelled = inv.status === "CANCELLED";
                    const waUrl = generateInvoiceWhatsAppUrl({
                      customerName: inv.customer?.name || "Customer",
                      customerPhone: inv.customer?.phone || "",
                      invoiceNumber: inv.invoiceNumber,
                      invoiceDate: formatDate(inv.invoiceDate),
                      grandTotal: formatINR(inv.grandTotal),
                      paidAmount: formatINR(inv.paidAmount),
                      balanceDue: formatINR(inv.balanceDue),
                      paymentMode: inv.paymentMode,
                    });

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-slate-50 transition ${isCancelled ? "opacity-60 bg-slate-50" : ""}`}
                      >
                        {/* Invoice No. */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-navy-900">{inv.invoiceNumber}</span>
                          {isCancelled && (
                            <span className="ml-1.5 text-[9px] text-rose-600 font-bold uppercase bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                              CANCELLED
                            </span>
                          )}
                        </td>

                        {/* Date & Payment Mode - 1 Line */}
                        <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                          <span className="font-medium">{formatDate(inv.invoiceDate)}</span>
                          <span className="text-[10px] text-slate-500 font-mono ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {inv.paymentMode}
                          </span>
                        </td>

                        {/* Customer / Party & Phone - 1 Line */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{inv.customer?.name || "Walk-in Cash"}</span>
                          {inv.customer?.phone && (
                            <span className="text-[10px] text-slate-500 font-mono ml-1.5">• {inv.customer.phone}</span>
                          )}
                        </td>

                        {/* Godown - 1 Line */}
                        <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                          <span>{inv.godown?.name?.replace(/\[Legacy Archive\]\s*/i, "") || "Jalod Godown"}</span>
                        </td>

                        {/* Grand Total */}
                        <td className="py-2.5 px-4 text-right font-black text-navy-900 whitespace-nowrap">
                          {formatINR(inv.grandTotal)}
                        </td>

                        {/* Paid */}
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                          {formatINR(inv.paidAmount)}
                        </td>

                        {/* Balance Due */}
                        <td className="py-2.5 px-4 text-right font-bold text-amber-600 whitespace-nowrap">
                          {inv.balanceDue > 0 ? formatINR(inv.balanceDue) : "-"}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCancelled
                                ? "bg-slate-200 text-slate-700"
                                : inv.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.paymentStatus === "PARTIALLY_PAID"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-4 text-center whitespace-nowrap min-w-[100px]">
                          <div className="flex items-center justify-center space-x-1.5">
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Share on WhatsApp"
                            >
                              <Share2 className="h-4 w-4" />
                            </a>

                            <Link
                              href={`/sales/${inv.id}`}
                              className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition"
                              title="View & Print Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            {!isCancelled && (
                              <button
                                onClick={() => handleCancelInvoice(inv.id, inv.invoiceNumber)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="Cancel Invoice & Restore Stock"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
