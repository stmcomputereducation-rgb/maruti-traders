"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate } from "@/lib/formatters";
import { generateInvoiceWhatsAppUrl } from "@/lib/whatsapp";
import { useAuth } from "@/context/AuthContext";
import {
  TrendingUp,
  Receipt,
  ShoppingCart,
  Users,
  Warehouse,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Share2,
  RefreshCw,
  Eye,
  CheckCircle2,
  MapPin,
  Building,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BRANCH_CONFIGS } from "@/lib/location";

export default function DashboardPage() {
  const { location } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const branch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

  useEffect(() => {
    fetchDashboard();
  }, [location]);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading {branch.name} Dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  const { metrics, chartData, lowStockItems, recentInvoices, recentLedger, godownSummary, pendingTransfers } = data;

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome & Quick Actions Bar */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 whitespace-nowrap">Marble ERP Dashboard</h1>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 whitespace-nowrap">
                📍 {branch.name}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              {branch.tagline} • GSTIN: {branch.gstin}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            <Link
              href="/sales/new"
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>New Sale</span>
            </Link>

            <Link
              href="/purchases/new"
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Purchase</span>
            </Link>

            <Link
              href="/godowns?tab=transfers"
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition whitespace-nowrap"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Transfer</span>
            </Link>

            <button
              onClick={fetchDashboard}
              className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg sm:rounded-xl border border-slate-200 transition"
              title="Refresh Data"
            >
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        {/* 4 Primary Financial & Stock Metric Cards - Responsive Grid for all aspect ratios */}
        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Today's Sales */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Today&apos;s Sales</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              </div>
              <p className="text-base sm:text-2xl font-black text-slate-900 mt-1 sm:mt-2 whitespace-nowrap">{formatINR(metrics.todaySalesAmount)}</p>
            </div>
            <div className="flex items-center justify-between mt-1 sm:mt-2 text-[10px] sm:text-xs border-t border-slate-50 pt-1">
              <span className="text-slate-500 whitespace-nowrap">{metrics.todaySalesCount} Invoices</span>
              <span className="text-emerald-600 font-bold flex items-center whitespace-nowrap">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> Today
              </span>
            </div>
          </div>

          {/* Card 2: Customer Receivables */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Receivables</span>
                  <span className="hidden sm:block text-[11px] text-amber-700 font-medium whitespace-nowrap">Customer Due</span>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              </div>
              <p className="text-base sm:text-2xl font-black text-amber-600 mt-1 sm:mt-2 whitespace-nowrap">{formatINR(metrics.totalReceivables)}</p>
            </div>
            <div className="flex items-center justify-between mt-1 sm:mt-2 text-[10px] sm:text-xs border-t border-slate-50 pt-1">
              <Link href="/khata" className="text-blue-600 hover:underline font-bold whitespace-nowrap">
                Khata Book →
              </Link>
              <span className="text-slate-400 whitespace-nowrap">Total Due</span>
            </div>
          </div>

          {/* Card 3: Supplier Payables */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Payables</span>
                  <span className="hidden sm:block text-[11px] text-rose-700 font-medium whitespace-nowrap">Supplier Due</span>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowDownLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              </div>
              <p className="text-base sm:text-2xl font-black text-rose-600 mt-1 sm:mt-2 whitespace-nowrap">{formatINR(metrics.totalPayables)}</p>
            </div>
            <div className="flex items-center justify-between mt-1 sm:mt-2 text-[10px] sm:text-xs border-t border-slate-50 pt-1">
              <Link href="/suppliers" className="text-blue-600 hover:underline font-bold whitespace-nowrap">
                Suppliers →
              </Link>
              <span className="text-slate-400 whitespace-nowrap">Total Due</span>
            </div>
          </div>

          {/* Card 4: Inventory Valuation */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Stock Valuation</span>
                  <span className="hidden sm:block text-[11px] text-slate-500 whitespace-nowrap">Purchase Cost</span>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Warehouse className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              </div>
              <p className="text-base sm:text-2xl font-black text-slate-900 mt-1 sm:mt-2 whitespace-nowrap">{formatINR(metrics.totalInventoryValuation)}</p>
            </div>
            <div className="flex items-center justify-between mt-1 sm:mt-2 text-[10px] sm:text-xs border-t border-slate-50 pt-1">
              <span className="text-slate-500 whitespace-nowrap">{metrics.activeProductsCount} Lots</span>
              <span className="text-blue-600 font-bold whitespace-nowrap">{branch.code}</span>
            </div>
          </div>
        </div>

        {/* Secondary Metric Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 truncate whitespace-nowrap">Monthly Revenue</p>
              <p className="text-base sm:text-xl font-bold text-slate-900 mt-0.5 sm:mt-1 whitespace-nowrap">{formatINR(metrics.monthlySalesAmount)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">Purchases: {formatINR(metrics.monthlyPurchasesAmount)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 truncate whitespace-nowrap">Stock Alerts</p>
                <p className="text-xs sm:text-base font-bold text-slate-900 mt-0.5 whitespace-nowrap">
                  <span className="text-amber-600">{metrics.lowStockCount} Low</span> •{" "}
                  <span className="text-rose-600">{metrics.outOfStockCount} Out</span>
                </p>
              </div>
            </div>
            <Link href="/inventory?filter=low" className="text-[11px] sm:text-xs font-bold text-emerald-600 hover:underline shrink-0 whitespace-nowrap">
              Inspect →
            </Link>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 truncate whitespace-nowrap">Pending Transfers</p>
                <p className="text-xs sm:text-base font-bold text-slate-900 mt-0.5 whitespace-nowrap">{pendingTransfers.length} In-Transit</p>
              </div>
            </div>
            <Link href="/godowns?tab=transfers" className="text-[11px] sm:text-xs font-bold text-blue-600 hover:underline shrink-0 whitespace-nowrap">
              Manage →
            </Link>
          </div>
        </div>

        {/* Charts and Godowns Row - Fluid responsive for all desktop window ratios */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Sales & Purchases Trend Area Chart */}
          <div className="xl:col-span-2 bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate whitespace-nowrap">7-Day Sales vs Purchases Volume</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate whitespace-nowrap">Daily business turnover in INR (₹) for {branch.name}</p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4 text-[10px] sm:text-xs font-medium shrink-0">
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700 whitespace-nowrap">Sales</span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500" />
                  <span className="font-semibold text-slate-700 whitespace-nowrap">Purchases</span>
                </div>
              </div>
            </div>

            <div className="h-48 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis
                    tickFormatter={(val) => `₹${val / 1000}k`}
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    formatter={(value: any) => [formatINR(Number(value)), ""]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                  <Area
                    type="monotone"
                    dataKey="purchases"
                    name="Purchases"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPurchases)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Godown Wise Stock Summary */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate whitespace-nowrap">Branch Storage Godowns</h3>
                <Link href="/godowns" className="text-[11px] sm:text-xs text-blue-600 font-bold hover:underline shrink-0 whitespace-nowrap">
                  All Godowns
                </Link>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mb-3 sm:mb-4 truncate whitespace-nowrap">Stock distribution at {branch.name}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5 sm:gap-3">
                {godownSummary.map((g: any) => (
                  <div key={g.id} className="p-2.5 sm:p-3 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200/60">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-[11px] sm:text-xs text-slate-900 truncate block whitespace-nowrap">{g.name}</span>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 truncate whitespace-nowrap">{g.city} • Code: {g.code}</p>
                      </div>
                      <span className="text-[11px] sm:text-xs font-black text-slate-900 shrink-0 whitespace-nowrap">{formatINR(g.valuation)}</span>
                    </div>
                    <div className="mt-1.5 sm:mt-2 flex justify-between text-[10px] sm:text-[11px] text-slate-600">
                      <span className="whitespace-nowrap">Total: <strong>{g.totalUnits} SQFT</strong></span>
                      <span className="text-emerald-700 font-bold whitespace-nowrap">In Stock</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-slate-100">
              <Link
                href="/godowns?tab=transfers"
                className="w-full flex items-center justify-center space-x-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg sm:rounded-xl transition whitespace-nowrap"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                <span>Inter-Godown Stock Transfer</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Low Stock Items & Recent Invoices Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Low Stock Watchlist */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
              <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate whitespace-nowrap">Low Stock & Reorder Alerts</h3>
              </div>
              <Link href="/inventory" className="text-[11px] sm:text-xs text-emerald-600 font-bold hover:underline shrink-0 whitespace-nowrap">
                View Catalog
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="p-4 sm:p-6 text-center text-slate-500 text-[11px] sm:text-xs">
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 mx-auto mb-1.5 sm:mb-2" />
                <p className="truncate whitespace-nowrap">All marble products maintain healthy stock levels.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStockItems.map((item: any) => (
                  <div key={item.productId} className="py-2 sm:py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate whitespace-nowrap">{item.name}</p>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono truncate whitespace-nowrap">
                        SKU: {item.sku} • Min: {item.minAlert} {item.unit}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 rounded whitespace-nowrap">
                        {item.totalQty} {item.unit}
                      </span>
                      <div className="mt-0.5">
                        <Link
                          href="/purchases/new"
                          className="text-[10px] sm:text-[11px] text-blue-600 hover:underline font-bold whitespace-nowrap"
                        >
                          + Purchase
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate whitespace-nowrap">Recent Sales Invoices</h3>
              <Link href="/sales" className="text-[11px] sm:text-xs text-emerald-600 font-bold hover:underline shrink-0 whitespace-nowrap">
                View All
              </Link>
            </div>

            {/* Mobile View: Zero horizontal scroll */}
            <div className="md:hidden divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <p className="text-center py-4 text-xs text-slate-500">No invoices created yet.</p>
              ) : (
                recentInvoices.map((inv: any) => {
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
                    <div key={inv.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900 truncate">{inv.invoiceNumber}</span>
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
                        <p className="text-[11px] text-slate-700 font-medium truncate mt-0.5">{inv.customer?.name || "Cash Customer"}</p>
                      </div>

                      <div className="text-right shrink-0 flex items-center space-x-2">
                        <div>
                          <p className="font-black text-xs text-slate-900 whitespace-nowrap">{formatINR(inv.grandTotal)}</p>
                          <p className="text-[10px] text-slate-400 whitespace-nowrap">{formatDate(inv.invoiceDate)}</p>
                        </div>
                        <div className="flex items-center space-x-0.5">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </a>
                          <Link
                            href={`/sales/${inv.id}`}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="View Invoice"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-[11px] sm:text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-1.5 font-semibold">Bill No.</th>
                    <th className="pb-1.5 font-semibold">Customer</th>
                    <th className="pb-1.5 font-semibold">Amount</th>
                    <th className="pb-1.5 font-semibold">Status</th>
                    <th className="pb-1.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map((inv: any) => {
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
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-2 text-slate-700">{inv.customer?.name}</td>
                        <td className="py-2 font-bold text-slate-900">{formatINR(inv.grandTotal)}</td>
                        <td className="py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
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
                        <td className="py-2 text-right space-x-1">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Share on WhatsApp"
                          >
                            <Share2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </a>
                          <Link
                            href={`/sales/${inv.id}`}
                            className="inline-flex p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="View Invoice"
                          >
                            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Khata Book Activity (Zero Horizontal Scroll on Mobile) */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate whitespace-nowrap">Recent Khata Book (Ledger) Entries</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate whitespace-nowrap">Debit (Customer Due) and Credit (Payment Received) audit log</p>
            </div>
            <Link href="/khata" className="text-[11px] sm:text-xs text-emerald-600 font-bold hover:underline shrink-0 whitespace-nowrap">
              Open Full Khata →
            </Link>
          </div>

          {/* Mobile View: Zero horizontal scroll required */}
          <div className="md:hidden divide-y divide-slate-100">
            {recentLedger.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-500">No recent ledger entries found.</p>
            ) : (
              recentLedger.map((entry: any) => {
                const partyName = entry.customer?.name || entry.supplier?.name || "Cash Party";
                const isDebit = entry.debit > 0;
                const isCredit = entry.credit > 0;

                return (
                  <div key={entry.id} className="py-2.5 flex items-center justify-between gap-2">
                    {/* Left side: Party name, Type badge, Date and Ref */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">{partyName}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-700 font-mono font-semibold shrink-0">
                          {entry.transactionType}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] text-slate-500">
                        <span className="whitespace-nowrap">{formatDate(entry.entryDate)}</span>
                        {entry.referenceNumber && (
                          <>
                            <span>•</span>
                            <span className="font-mono truncate">{entry.referenceNumber}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right side: Debit/Credit and Running Balance */}
                    <div className="text-right shrink-0">
                      {isDebit && (
                        <div className="text-xs font-black text-rose-600 whitespace-nowrap">
                          +{formatINR(entry.debit)} <span className="text-[9px] font-semibold text-rose-500">Dr</span>
                        </div>
                      )}
                      {isCredit && (
                        <div className="text-xs font-black text-emerald-600 whitespace-nowrap">
                          +{formatINR(entry.credit)} <span className="text-[9px] font-semibold text-emerald-500">Cr</span>
                        </div>
                      )}
                      {!isDebit && !isCredit && (
                        <div className="text-xs font-bold text-slate-700">-</div>
                      )}
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                        Bal: <span className="font-bold text-slate-900">{formatINR(entry.balance)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-[11px] sm:text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 font-semibold">Date</th>
                  <th className="py-1.5 font-semibold">Party</th>
                  <th className="py-1.5 font-semibold">Type</th>
                  <th className="py-1.5 font-semibold">Ref</th>
                  <th className="py-1.5 font-semibold text-right text-rose-600">Debit</th>
                  <th className="py-1.5 font-semibold text-right text-emerald-600">Credit</th>
                  <th className="py-1.5 font-semibold text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLedger.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="py-2 text-slate-600 whitespace-nowrap">{formatDate(entry.entryDate)}</td>
                    <td className="py-2 font-medium text-slate-900">
                      {entry.customer?.name || entry.supplier?.name}
                    </td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-slate-100 text-slate-700 font-mono">
                        {entry.transactionType}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500 font-mono">{entry.referenceNumber || "-"}</td>
                    <td className="py-2 text-right font-bold text-rose-600 whitespace-nowrap">
                      {entry.debit > 0 ? formatINR(entry.debit) : "-"}
                    </td>
                    <td className="py-2 text-right font-bold text-emerald-600 whitespace-nowrap">
                      {entry.credit > 0 ? formatINR(entry.credit) : "-"}
                    </td>
                    <td className="py-2 text-right font-bold text-slate-900 whitespace-nowrap">{formatINR(entry.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
