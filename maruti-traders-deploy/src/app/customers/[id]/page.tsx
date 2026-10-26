"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate, formatDateTime } from "@/lib/formatters";
import { generateKhataReminderWhatsAppUrl } from "@/lib/whatsapp";
import {
  Users,
  ArrowLeft,
  Phone,
  Building,
  CreditCard,
  MessageCircle,
  Download,
  Receipt,
  BookOpen,
  Plus,
  Eye,
  CheckCircle,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CustomerProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "invoices" | "payments">("ledger");

  // Payment modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | string>("");
  const [payMode, setPayMode] = useState("CASH");
  const [payRef, setPayRef] = useState("");

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  async function fetchCustomer() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const d = await res.json();
        setCustomer(d.customer);
        setCompany(d.company);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "CUSTOMER",
          partyId: customer.id,
          amount: payAmount,
          paymentMode: payMode,
          referenceNumber: payRef,
          notes: `Payment receipt from ${customer.name}`,
        }),
      });

      if (res.ok) {
        setIsPaymentOpen(false);
        setPayAmount("");
        fetchCustomer();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record payment");
      }
    } catch {
      alert("Error recording payment");
    }
  }

  function handleDownloadStatementPDF() {
    if (!customer || !company) return;

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(company.name, 14, 20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("CUSTOMER ACCOUNT STATEMENT / KHATA BOOK", 14, 26);
    doc.text(`Phone: ${company.phone} | GSTIN: ${company.gstin}`, 14, 31);

    doc.line(14, 35, 196, 35);

    doc.setFont("helvetica", "bold");
    doc.text(`Account Holder: ${customer.name}`, 14, 42);
    doc.setFont("helvetica", "normal");
    if (customer.companyName) doc.text(customer.companyName, 14, 47);
    doc.text(`Phone: ${customer.phone || "-"} | City: ${customer.city}`, 14, 52);
    if (customer.gstin) doc.text(`GSTIN: ${customer.gstin}`, 14, 57);

    doc.setFont("helvetica", "bold");
    doc.text(`Current Outstanding Balance: INR ${customer.currentBalance.toFixed(2)}`, 120, 42);

    const rows = customer.ledgerEntries.map((e: any) => [
      formatDate(e.entryDate),
      e.transactionType,
      e.referenceNumber || "-",
      e.debit > 0 ? e.debit.toFixed(2) : "-",
      e.credit > 0 ? e.credit.toFixed(2) : "-",
      e.balance.toFixed(2),
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Date", "Type", "Ref No", "Debit (Naame)", "Credit (Jama)", "Balance (INR)"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [15, 34, 58], textColor: 255 },
      styles: { fontSize: 8 },
    });

    doc.save(`Statement_${customer.name.replace(/\s+/g, "_")}.pdf`);
  }

  if (loading || !customer) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-slate-500 text-sm">Loading customer ledger...</div>
      </AppLayout>
    );
  }

  const waReminderUrl = customer.phone
    ? generateKhataReminderWhatsAppUrl({
        customerName: customer.name,
        customerPhone: customer.phone,
        outstandingBalance: formatINR(customer.currentBalance),
      })
    : null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/customers"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-navy-900">{customer.name}</h1>
                {customer.companyName && (
                  <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                    {customer.companyName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ph: {customer.phone || "N/A"} • {customer.address}, {customer.city}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {customer.currentBalance > 0 && waReminderUrl && (
              <a
                href={waReminderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp Reminder</span>
              </a>
            )}

            <button
              onClick={() => {
                setPayAmount(customer.currentBalance > 0 ? customer.currentBalance : "");
                setIsPaymentOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
            >
              <CreditCard className="h-4 w-4" />
              <span>Record Payment</span>
            </button>

            <button
              onClick={handleDownloadStatementPDF}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition"
            >
              <Download className="h-4 w-4" />
              <span>PDF Statement</span>
            </button>
          </div>
        </div>

        {/* Customer Balance Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Outstanding Khata Balance
            </span>
            <p
              className={`text-lg sm:text-2xl font-black mt-0.5 sm:mt-1 ${
                customer.currentBalance > 0
                  ? "text-amber-600"
                  : customer.currentBalance < 0
                  ? "text-emerald-600"
                  : "text-slate-700"
              }`}
            >
              {formatINR(customer.currentBalance)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">
              {customer.currentBalance > 0 ? "Customer owes Maruti Traders" : "Balance settled"}
            </p>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Credit Limit
            </span>
            <p className="text-lg sm:text-2xl font-black text-slate-800 mt-0.5 sm:mt-1">{formatINR(customer.creditLimit)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Terms: {customer.paymentTermsDays} Days</p>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Total Invoices
            </span>
            <p className="text-lg sm:text-2xl font-black text-navy-900 mt-0.5 sm:mt-1">{customer.salesInvoices.length} Bills</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Lifetime transactions</p>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">
              GST Registration
            </span>
            <p className="text-[11px] sm:text-xs font-mono font-bold text-slate-800 mt-1 sm:mt-2 truncate">
              {customer.gstin || "Unregistered Buyer"}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">State: {customer.state} (24)</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-1.5 sm:space-x-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "ledger"
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Khata Statement ({customer.ledgerEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "invoices"
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Sales Invoices ({customer.salesInvoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "payments"
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Receipts ({customer.paymentsReceived.length})</span>
          </button>
        </div>

        {/* Tab 1: Khata Statement */}
        {activeTab === "ledger" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
            {/* Mobile Card Feed (No Horizontal Scroll) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {customer.ledgerEntries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No ledger transactions found.</div>
              ) : (
                customer.ledgerEntries.map((e: any) => (
                  <div key={e.id} className="p-3 space-y-2 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-800">{formatDate(e.entryDate)}</span>
                        {e.referenceNumber && (
                          <span className="text-[10px] text-slate-400 font-mono truncate">• Ref: {e.referenceNumber}</span>
                        )}
                      </div>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 font-mono shrink-0">
                        {e.transactionType}
                      </span>
                    </div>

                    {e.notes && (
                      <p className="text-[10px] text-slate-500 italic">{e.notes}</p>
                    )}

                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-lg text-center text-[10px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Debit (Given)</span>
                        <span className="font-bold text-rose-600">
                          {e.debit > 0 ? formatINR(e.debit) : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Credit (Recvd)</span>
                        <span className="font-bold text-emerald-600">
                          {e.credit > 0 ? formatINR(e.credit) : "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Balance</span>
                        <span className="font-bold text-navy-900">{formatINR(e.balance)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Transaction</th>
                    <th className="py-3 px-4 text-left">Reference / Memo</th>
                    <th className="py-3 px-4 text-right text-rose-600">Debit (Given)</th>
                    <th className="py-3 px-4 text-right text-emerald-600">Credit (Received)</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customer.ledgerEntries.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600">{formatDate(e.entryDate)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{e.transactionType}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {e.referenceNumber || "-"}
                        {e.notes && <span className="block text-[10px] text-slate-400">{e.notes}</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        {e.debit > 0 ? formatINR(e.debit) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        {e.credit > 0 ? formatINR(e.credit) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-navy-900">
                        {formatINR(e.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Sales Invoices */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
            {/* Mobile Card Feed (No Horizontal Scroll) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {customer.salesInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No invoices found for this customer.</div>
              ) : (
                customer.salesInvoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 space-y-2 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <Link href={`/sales/${inv.id}`} className="font-mono font-bold text-xs text-navy-900 hover:underline truncate">
                          {inv.invoiceNumber}
                        </Link>
                        <span className="text-[10px] text-slate-400 font-medium">• {formatDate(inv.invoiceDate)}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                          inv.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : inv.paymentStatus === "PARTIALLY_PAID"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-lg text-center text-[10px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Grand Total</span>
                        <span className="font-bold text-navy-900">{formatINR(inv.grandTotal)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Paid</span>
                        <span className="font-bold text-emerald-700">{formatINR(inv.paidAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Due</span>
                        <span className={`font-bold ${inv.balanceDue > 0 ? "text-amber-600" : "text-slate-500"}`}>
                          {inv.balanceDue > 0 ? formatINR(inv.balanceDue) : "₹0"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-1 border-t border-dashed border-slate-200">
                      <Link
                        href={`/sales/${inv.id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-navy-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View Bill</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-left">Bill No.</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customer.salesInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-navy-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                      <td className="py-3 px-4 text-right font-black text-navy-900">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-700">
                        {formatINR(inv.paidAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-600">
                        {inv.balanceDue > 0 ? formatINR(inv.balanceDue) : "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : inv.paymentStatus === "PARTIALLY_PAID"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/sales/${inv.id}`}
                          className="text-xs text-blue-600 hover:underline font-semibold"
                        >
                          View Bill →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Payments Received */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
            {/* Mobile Card Feed (No Horizontal Scroll) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {customer.paymentsReceived.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No payments received yet.</div>
              ) : (
                customer.paymentsReceived.map((p: any) => (
                  <div key={p.id} className="p-3 space-y-1.5 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-navy-900 truncate">{p.paymentNumber}</span>
                        <span className="text-[10px] text-slate-400 font-mono">• {formatDate(p.paymentDate)}</span>
                      </div>
                      <span className="font-mono font-black text-xs text-emerald-700 shrink-0">
                        {formatINR(p.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {p.paymentMode}
                      </span>
                      {p.referenceNumber && (
                        <span className="font-mono text-[10px] text-slate-400">Ref: {p.referenceNumber}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-left">Receipt No.</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Payment Mode</th>
                    <th className="py-3 px-4 text-left">Reference / UTR</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customer.paymentsReceived.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-navy-900">{p.paymentNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(p.paymentDate)}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{p.paymentMode}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{p.referenceNumber || "-"}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700">
                        {formatINR(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {isPaymentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Record Payment from {customer.name}</h3>
                <button onClick={() => setIsPaymentOpen(false)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Amount Received (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-500"
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
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Reference / UTR</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. UPI/394857291039"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsPaymentOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    Post to Khata
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
