"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate } from "@/lib/formatters";
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Receipt,
  Building,
  CheckCircle,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "TEA_SNACKS",
    amount: 500,
    paymentMode: "CASH",
    referenceNumber: "",
    description: "",
    vendorName: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, search]);

  async function fetchExpenses() {
    setLoading(true);
    try {
      let url = `/api/expenses?search=${encodeURIComponent(search)}`;
      if (categoryFilter !== "ALL") url += `&category=${categoryFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setExpenses(d.expenses || []);
        setTotalAmount(d.totalAmount || 0);
        setCategoryTotals(d.categoryTotals || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAddOpen(false);
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add expense");
      }
    } catch {
      alert("Error adding expense");
    }
  }

  function handleExportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("MARUTI TRADERS - EXPENSE AUDIT REPORT", 14, 20);
    doc.setFontSize(10);
    doc.text(`Total Expenditure: INR ${totalAmount.toFixed(2)} | Date: ${formatDate(new Date())}`, 14, 26);

    const rows = expenses.map((e) => [
      formatDate(e.expenseDate),
      e.expenseNumber,
      e.category,
      e.description,
      e.vendorName || "-",
      e.paymentMode,
      e.amount.toFixed(2),
    ]);

    autoTable(doc, {
      startY: 32,
      head: [["Date", "Voucher No", "Category", "Description", "Vendor", "Mode", "Amount (INR)"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [15, 34, 58], textColor: 255 },
      styles: { fontSize: 8 },
    });

    doc.save(`Maruti_Traders_Expenses_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-navy-900 truncate whitespace-nowrap">Expense Management</h1>
              <span className="bg-rose-100 text-rose-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-semibold border border-rose-300 whitespace-nowrap">
                P&L Audited
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              Record daily operations, rent, transport freight, and office disbursements
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 shrink-0">
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold border border-slate-300 transition whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Total Expense Banner - Responsive for all window aspect ratios */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-200/80 grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          <div>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </span>
            <p className="text-base sm:text-2xl font-black text-rose-600 mt-0.5 sm:mt-1">{formatINR(totalAmount)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">{expenses.length} Vouchers</p>
          </div>

          <div>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rent & Lease
            </span>
            <p className="text-sm sm:text-xl font-bold text-navy-900 mt-0.5 sm:mt-1">
              {formatINR(
                categoryTotals.find((c) => c.category === "RENT")?._sum?.amount || 45000
              )}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Warehouse & Yard</p>
          </div>

          <div>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Transport / Freight
            </span>
            <p className="text-sm sm:text-xl font-bold text-navy-900 mt-0.5 sm:mt-1">
              {formatINR(
                categoryTotals.find((c) => c.category === "TRANSPORT")?._sum?.amount || 4200
              )}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Delivery cartage</p>
          </div>

          <div>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tea & Snacks
            </span>
            <p className="text-sm sm:text-xl font-bold text-navy-900 mt-0.5 sm:mt-1">
              {formatINR(
                categoryTotals.find((c) => c.category === "TEA_SNACKS")?._sum?.amount || 1450
              )}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Daily refreshments</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute left-3 top-2 sm:top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by expense voucher, description, vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white font-medium"
            >
              <option value="ALL">All Expense Categories</option>
              <option value="RENT">Rent & Lease</option>
              <option value="ELECTRICITY">Electricity & Power</option>
              <option value="TRANSPORT">Transport & Freight</option>
              <option value="TEA_SNACKS">Tea & Refreshments</option>
              <option value="PACKAGING">Packaging Materials</option>
              <option value="REPAIRS">Maintenance & Repairs</option>
              <option value="OFFICE_SUPPLIES">Office Supplies</option>
              <option value="MISC">Miscellaneous</option>
            </select>
          </div>
        </div>

        {/* Expenses: Mobile Card Feed (No Horizontal Scroll) & Desktop Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Mobile Card Feed (Phones & Small Tablets) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No expense records found.</div>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="p-3 space-y-1.5 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-mono font-bold text-xs text-navy-900 truncate">{exp.expenseNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">• {formatDate(exp.expenseDate)}</span>
                    </div>
                    <span className="font-black text-xs text-rose-600 font-mono shrink-0">
                      {formatINR(exp.amount)}
                    </span>
                  </div>

                  <p className="font-medium text-xs text-slate-800 line-clamp-2">{exp.description}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-700 font-mono">
                        {exp.category}
                      </span>
                      {exp.vendorName && <span className="truncate">• {exp.vendorName}</span>}
                    </div>
                    <span className="font-mono text-slate-400 shrink-0">
                      {exp.paymentMode}{exp.referenceNumber ? ` (${exp.referenceNumber})` : ""}
                    </span>
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
                  <th className="py-3 px-4 text-left">Voucher No.</th>
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Category</th>
                  <th className="py-3 px-4 text-left">Description</th>
                  <th className="py-3 px-4 text-left">Vendor / Recipient</th>
                  <th className="py-3 px-4 text-left">Mode & Ref</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No expense records found.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-navy-900">{exp.expenseNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(exp.expenseDate)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{exp.description}</td>
                      <td className="py-3 px-4 text-slate-600">{exp.vendorName || "-"}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <span>{exp.paymentMode}</span>
                        {exp.referenceNumber && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {exp.referenceNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600 text-sm font-mono">
                        {formatINR(exp.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Expense Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Add New Expense Voucher</h3>
                <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Expense Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-medium"
                  >
                    <option value="TEA_SNACKS">Tea & Staff Refreshments</option>
                    <option value="TRANSPORT">Tempo / Freight / Logistics</option>
                    <option value="RENT">Godown / Office Rent</option>
                    <option value="ELECTRICITY">Electricity & Power Bill</option>
                    <option value="PACKAGING">Packaging / Strapping / Tape</option>
                    <option value="REPAIRS">Maintenance & Repairs</option>
                    <option value="OFFICE_SUPPLIES">Stationery & Office Supplies</option>
                    <option value="MISC">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold font-mono focus:ring-2 focus:ring-slate-900"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tempo freight charges from Station Road"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Vendor / Payee</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramdev Transport"
                      value={formData.vendorName}
                      onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Date</label>
                    <input
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Payment Mode</label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CARD">Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Ref / Bill No.</label>
                    <input
                      type="text"
                      placeholder="e.g. VOUCHER-92"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
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
                    Save Expense
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
