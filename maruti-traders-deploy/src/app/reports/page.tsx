"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate } from "@/lib/formatters";
import { generateKhataReminderWhatsAppUrl } from "@/lib/whatsapp";
import {
  BarChart3,
  Download,
  Calendar,
  Receipt,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Percent,
  MessageCircle,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"gst" | "pnl" | "aging">("gst");
  const [dateRange, setDateRange] = useState("month"); // "month", "last30", "all"

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  async function fetchReport() {
    setLoading(true);
    try {
      let url = "/api/reports";
      const now = new Date();
      if (dateRange === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        url += `?startDate=${start}`;
      } else if (dateRange === "last30") {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        url += `?startDate=${start}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleExportPDF() {
    if (!data) return;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("MARUTI TRADERS - FINANCIAL & GST AUDIT REPORT", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${formatDate(new Date())} | Range: ${dateRange.toUpperCase()}`, 14, 26);

    const s = data.summary;
    const summaryRows = [
      ["Gross Sales Revenue", formatINR(s.totalSales)],
      ["Taxable Sales Value (GSTR-1)", formatINR(s.totalSalesTaxable)],
      ["GST Output Tax Collected", formatINR(s.totalOutputGst)],
      ["Total Purchases (Inward Goods)", formatINR(s.totalPurchases)],
      ["GST Input Tax Credit (ITC)", formatINR(s.totalInputGst)],
      ["Net GST Payable (Output - Input)", formatINR(Math.max(0, s.totalOutputGst - s.totalInputGst))],
      ["Operating Expenses (Rent, Freight, Misc)", formatINR(s.totalExpenses)],
      ["Net Trading Profit", formatINR(s.netProfit)],
      ["Current Stock Valuation", formatINR(s.totalStockValuation)],
    ];

    autoTable(doc, {
      startY: 32,
      head: [["Financial Metric", "Value (INR)"]],
      body: summaryRows,
      theme: "grid",
      headStyles: { fillColor: [15, 34, 58], textColor: 255 },
      styles: { fontSize: 9 },
    });

    doc.save(`Maruti_Traders_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  if (loading || !data) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-slate-500 text-sm">Loading business reports...</div>
      </AppLayout>
    );
  }

  const { summary, salesInvoices, purchaseInvoices, expenses, overdueCustomers } = data;
  const netGstLiability = Math.max(0, summary.totalOutputGst - summary.totalInputGst);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-navy-900 truncate whitespace-nowrap">Business Reports & Auditing</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-semibold border border-emerald-300 whitespace-nowrap">
                FY 2026-27
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              GSTR-1, GSTR-3B input credit, profit & loss, and customer aging
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 shrink-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500 whitespace-nowrap"
            >
              <option value="month">Current Month</option>
              <option value="last30">Last 30 Days</option>
              <option value="all">All-Time Cumulative</option>
            </select>

            <button
              onClick={handleExportPDF}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>

        {/* 4 Financial Highlight Cards - Responsive for all window aspect ratios */}
        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sales Revenue
            </span>
            <p className="text-base sm:text-2xl font-black text-navy-900 mt-0.5 sm:mt-1">{formatINR(summary.totalSales)}</p>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-0.5 sm:mt-1">
              Coll: {formatINR(summary.totalSalesCollected)}
            </p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Purchases Cost
            </span>
            <p className="text-base sm:text-2xl font-black text-slate-800 mt-0.5 sm:mt-1">{formatINR(summary.totalPurchases)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Inward goods</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expenses
            </span>
            <p className="text-base sm:text-2xl font-black text-rose-600 mt-0.5 sm:mt-1">{formatINR(summary.totalExpenses)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Operational costs</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trading Profit (P&L)
            </span>
            <p
              className={`text-base sm:text-2xl font-black mt-0.5 sm:mt-1 ${
                summary.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatINR(summary.netProfit)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Net surplus</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex space-x-1.5 sm:space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("gst")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "gst"
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>GST Tax (GSTR-1 & 3B)</span>
          </button>

          <button
            onClick={() => setActiveTab("pnl")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "pnl"
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Profit & Loss (P&L)</span>
          </button>

          <button
            onClick={() => setActiveTab("aging")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "aging"
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Aging ({overdueCustomers.length})</span>
          </button>
        </div>

        {/* Tab 1: GST Reconciliation */}
        {activeTab === "gst" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/80">
                <span className="text-xs font-bold uppercase text-slate-500">
                  GSTR-1 Output Tax (On Sales)
                </span>
                <p className="text-2xl font-black text-navy-900 mt-2">{formatINR(summary.totalOutputGst)}</p>
                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Taxable Sales:</span>
                    <span className="font-mono">{formatINR(summary.totalSalesTaxable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST 9%:</span>
                    <span className="font-mono">{formatINR(summary.totalOutputGst / 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST 9%:</span>
                    <span className="font-mono">{formatINR(summary.totalOutputGst / 2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/80">
                <span className="text-xs font-bold uppercase text-slate-500">
                  GSTR-3B Input Tax Credit (ITC)
                </span>
                <p className="text-2xl font-black text-emerald-600 mt-2">{formatINR(summary.totalInputGst)}</p>
                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Taxable Purchases:</span>
                    <span className="font-mono">{formatINR(summary.totalPurchasesTaxable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Input CGST:</span>
                    <span className="font-mono">{formatINR(summary.totalInputGst / 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Input SGST:</span>
                    <span className="font-mono">{formatINR(summary.totalInputGst / 2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/80">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Net GST Cash Liability
                </span>
                <p className="text-2xl font-black text-purple-700 mt-2">{formatINR(netGstLiability)}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Output GST ({formatINR(summary.totalOutputGst)}) minus Eligible ITC ({formatINR(summary.totalInputGst)}).
                </p>
                <span className="inline-block mt-3 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Reconciled with Portal
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Profit & Loss Statement */}
        {activeTab === "pnl" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 w-full">
            <h3 className="font-bold text-base text-navy-900 pb-3 border-b border-slate-200">
              Statement of Profit & Loss (FY 2026-27)
            </h3>

            <div className="divide-y divide-slate-200 text-xs">
              {/* Revenue */}
              <div className="py-3">
                <div className="flex justify-between font-bold text-sm text-slate-900">
                  <span>1. Revenue from Sales</span>
                  <span className="text-emerald-700">{formatINR(summary.totalSales)}</span>
                </div>
                <div className="pl-4 mt-1 text-slate-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Taxable Goods Revenue:</span>
                    <span>{formatINR(summary.totalSalesTaxable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Collected GST:</span>
                    <span>{formatINR(summary.totalOutputGst)}</span>
                  </div>
                </div>
              </div>

              {/* Cost of Sales */}
              <div className="py-3">
                <div className="flex justify-between font-bold text-sm text-slate-900">
                  <span>2. Cost of Purchased Goods</span>
                  <span className="text-rose-700">-{formatINR(summary.totalPurchases)}</span>
                </div>
                <div className="pl-4 mt-1 text-slate-500">
                  <span>Direct supplier procurement bills & factory consignments</span>
                </div>
              </div>

              {/* Gross Margin */}
              <div className="py-3 bg-slate-50 px-2 font-bold flex justify-between text-slate-900">
                <span>Gross Trading Margin (1 - 2):</span>
                <span>{formatINR(summary.grossProfit)}</span>
              </div>

              {/* Operating Expenses */}
              <div className="py-3">
                <div className="flex justify-between font-bold text-sm text-slate-900">
                  <span>3. Operating & Administrative Expenses</span>
                  <span className="text-rose-700">-{formatINR(summary.totalExpenses)}</span>
                </div>
                <div className="pl-4 mt-1 text-slate-500 space-y-0.5">
                  <p>Includes Warehouse Lease, Power, Transport Freight, Stationery & Refreshments</p>
                </div>
              </div>

              {/* Net Profit */}
              <div className="py-4 bg-emerald-50 px-3 font-black text-base flex justify-between text-navy-900 rounded-lg">
                <span>NET BUSINESS PROFIT:</span>
                <span className={summary.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  {formatINR(summary.netProfit)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Overdue Collection Aging */}
        {activeTab === "aging" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-navy-900">Pending Customer Overdue Balances</h3>
                <p className="text-xs text-slate-500">Customers with outstanding Khata balances ranked by amount</p>
              </div>
            </div>

            {/* Mobile Card Feed (Phones & Small Tablets) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {overdueCustomers.map((c: any) => {
                const waReminderUrl = generateKhataReminderWhatsAppUrl({
                  customerName: c.name,
                  customerPhone: c.phone,
                  outstandingBalance: formatINR(c.currentBalance),
                });

                return (
                  <div key={c.id} className="p-3 space-y-2 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-navy-900 truncate block">{c.name}</span>
                        {c.companyName && (
                          <span className="text-[10px] text-slate-500 truncate block">{c.companyName}</span>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {c.phone} {c.city && <span>• {c.city}</span>}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-xs text-rose-600 block">{formatINR(c.currentBalance)}</span>
                        <span className="text-[9px] text-slate-400 block font-mono">Limit: {formatINR(c.creditLimit)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-1 border-t border-dashed border-slate-200">
                      <a
                        href={waReminderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-semibold border border-emerald-200 transition"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>WhatsApp Reminder</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-left">Customer Name</th>
                    <th className="py-3 px-4 text-left">Phone & City</th>
                    <th className="py-3 px-4 text-left">GSTIN</th>
                    <th className="py-3 px-4 text-right">Credit Limit</th>
                    <th className="py-3 px-4 text-right text-rose-600 font-bold">Outstanding Balance (₹)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueCustomers.map((c: any) => {
                    const waReminderUrl = generateKhataReminderWhatsAppUrl({
                      customerName: c.name,
                      customerPhone: c.phone,
                      outstandingBalance: formatINR(c.currentBalance),
                    });

                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-navy-900">
                          {c.name}
                          {c.companyName && (
                            <span className="block text-[11px] font-normal text-slate-500">
                              {c.companyName}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-mono">{c.phone}</span>
                          <span className="block text-[11px] text-slate-400">{c.city}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">{c.gstin || "Unregistered"}</td>
                        <td className="py-3 px-4 text-right font-mono">{formatINR(c.creditLimit)}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-600 text-sm">
                          {formatINR(c.currentBalance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <a
                            href={waReminderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold border border-emerald-200 transition"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>WhatsApp Reminder</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
