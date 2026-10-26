"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR } from "@/lib/formatters";
import { generateKhataReminderWhatsAppUrl } from "@/lib/whatsapp";
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Eye,
  CreditCard,
  Building,
  CheckCircle,
  ArrowRight,
  X,
  Share2,
} from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentRef, setPaymentRef] = useState("");

  // Add form
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    phone: "",
    alternatePhone: "",
    address: "",
    city: "Surat",
    gstin: "",
    openingBalance: 0,
    creditLimit: 50000,
    paymentTermsDays: 30,
  });

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const d = await res.json();
        setCustomers(d.customers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAddCustomerOpen(false);
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create customer");
      }
    } catch {
      alert("Error adding customer");
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentCustomer) return;

    try {
      const res = await fetch("/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "CUSTOMER",
          partyId: paymentCustomer.id,
          amount: paymentAmount,
          paymentMode,
          referenceNumber: paymentRef,
          notes: `Payment receipt from ${paymentCustomer.name}`,
        }),
      });

      if (res.ok) {
        setPaymentCustomer(null);
        setPaymentAmount("");
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record payment");
      }
    } catch {
      alert("Error processing payment");
    }
  }

  const totalReceivables = customers.reduce((acc, c) => acc + (c.currentBalance || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-navy-900 truncate whitespace-nowrap">Customers & Khata Profiles</h1>
              <span className="bg-amber-100 text-amber-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-semibold border border-amber-300 whitespace-nowrap">
                {customers.length} Accounts
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              Customer details, credit limits, outstanding balances, and WhatsApp reminders
            </p>
          </div>

          <button
            onClick={() => {
              setFormData({
                name: "",
                companyName: "",
                phone: "",
                alternatePhone: "",
                address: "",
                city: "Surat",
                gstin: "",
                openingBalance: 0,
                creditLimit: 50000,
                paymentTermsDays: 30,
              });
              setIsAddCustomerOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-xs font-bold shadow-sm transition self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Metrics Banner - Responsive for all window aspect ratios */}
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Receivables
            </span>
            <p className="text-base sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1">{formatINR(totalReceivables)}</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Pending customer dues</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Khata
            </span>
            <p className="text-base sm:text-2xl font-black text-navy-900 mt-0.5 sm:mt-1">{customers.length} Parties</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">Dealers & retail clients</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 col-span-2 sm:col-span-2 xl:col-span-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Khata Reminder Tool
            </span>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-1 sm:mt-2">
              Send professional WhatsApp reminders with pre-filled balance and UPI payment info
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm border border-slate-200/80">
          <div className="relative">
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute left-3 top-2 sm:top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, company name, mobile phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Customer Records: Mobile Card Feed (No Horizontal Scroll) & Desktop Table */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* Mobile Card Feed (Phones & Small Tablets) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading customer records...</div>
            ) : customers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No customer accounts found.</div>
            ) : (
              customers.map((c) => {
                const waReminderUrl = generateKhataReminderWhatsAppUrl({
                  customerName: c.name,
                  customerPhone: c.phone,
                  outstandingBalance: formatINR(c.currentBalance),
                });

                return (
                  <div key={c.id} className="p-3 space-y-2 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <Link href={`/customers/${c.id}`} className="font-bold text-xs text-navy-900 hover:underline truncate block">
                          {c.name}
                        </Link>
                        {c.companyName && (
                          <span className="text-[10px] text-slate-500 truncate block">{c.companyName}</span>
                        )}
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {c.phone ? (
                            <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a>
                          ) : (
                            <span className="text-slate-400">No Phone</span>
                          )}
                          {c.city && <span>• {c.city}</span>}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-black text-xs block ${
                            c.currentBalance > 0
                              ? "text-amber-600"
                              : c.currentBalance < 0
                              ? "text-emerald-600"
                              : "text-slate-500"
                          }`}
                        >
                          {formatINR(c.currentBalance)}
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          {c.currentBalance > 0 ? "Due (Debit)" : c.currentBalance < 0 ? "Advance" : "Clear"}
                        </span>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-dashed border-slate-200">
                      {c.currentBalance > 0 && (
                        <a
                          href={waReminderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                        >
                          <MessageCircle className="h-3 w-3" />
                          <span>Reminder</span>
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setPaymentCustomer(c);
                          setPaymentAmount(c.currentBalance > 0 ? c.currentBalance : "");
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        <CreditCard className="h-3 w-3" />
                        <span>Receive Payment</span>
                      </button>
                      <Link
                        href={`/customers/${c.id}`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Ledger</span>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-[11px] sm:text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Customer / Firm</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Contact & Location</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">GSTIN</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Credit Limit</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Outstanding Due (₹)</th>
                  <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading customer records...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No customer accounts found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const waReminderUrl = generateKhataReminderWhatsAppUrl({
                      customerName: c.name,
                      customerPhone: c.phone,
                      outstandingBalance: formatINR(c.currentBalance),
                    });

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <Link
                            href={`/customers/${c.id}`}
                            className="font-bold text-navy-900 text-xs hover:underline flex items-center"
                          >
                            <span>{c.name}</span>
                          </Link>
                          {c.companyName && (
                            <span className="block text-[11px] text-slate-500">{c.companyName}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <div className="flex items-center space-x-1 font-mono font-medium">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{c.phone || "-"}</span>
                          </div>
                          <span className="block text-[11px] text-slate-500">{c.city}</span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-700">
                          {c.gstin ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">
                              {c.gstin}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Unregistered</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {formatINR(c.creditLimit)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-black text-sm ${
                              c.currentBalance > 0
                                ? "text-amber-600"
                                : c.currentBalance < 0
                                ? "text-emerald-600"
                                : "text-slate-500"
                            }`}
                          >
                            {formatINR(c.currentBalance)}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {c.currentBalance > 0 ? "Due (Debit)" : c.currentBalance < 0 ? "Advance" : "Clear"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right space-x-2">
                          {c.currentBalance > 0 && (
                            <a
                              href={waReminderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold border border-emerald-200 transition"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>Reminder</span>
                            </a>
                          )}

                          <button
                            onClick={() => {
                              setPaymentCustomer(c);
                              setPaymentAmount(c.currentBalance > 0 ? c.currentBalance : "");
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold border border-blue-200 transition"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Receive Pay</span>
                          </button>

                          <Link
                            href={`/customers/${c.id}`}
                            className="inline-flex items-center p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded transition"
                            title="View Statement / Ledger"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Payment Receipt Modal */}
        {paymentCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Record Payment Received</h3>
                <button onClick={() => setPaymentCustomer(null)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-500">Customer:</span>
                  <p className="font-bold text-navy-900 text-sm">{paymentCustomer.name}</p>
                  <p className="text-slate-600 mt-1">
                    Current Outstanding Balance:{" "}
                    <strong className="text-amber-700">{formatINR(paymentCustomer.currentBalance)}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Amount Received (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Reference / UTR / Cheque Number
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. UPI/394857291039"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setPaymentCustomer(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    Post Payment to Khata
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Customer Modal */}
        {isAddCustomerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Add New Customer Account</h3>
                <button onClick={() => setIsAddCustomerOpen(false)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pareshbhai Mistri"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Mobile Phone (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210 (Optional)"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">GSTIN Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="24AABCM1234P1Z8"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="Shop No, Road, Area"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    Save Customer
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
