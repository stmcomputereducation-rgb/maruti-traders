"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate, formatDateTime } from "@/lib/formatters";
import { generateKhataReminderWhatsAppUrl } from "@/lib/whatsapp";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Users,
  Truck,
  MessageCircle,
  Share2,
  Download,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Eye,
  Phone,
  Building,
  Receipt,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function KhataBookPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState<"ALL" | "CUSTOMER" | "SUPPLIER">("ALL");
  const [search, setSearch] = useState("");
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [totalPayables, setTotalPayables] = useState(0);

  // Tab View: "PARTIES" (Party-wise list) or "TRANSACTIONS" (Live ledger audit trail)
  const [mainView, setMainView] = useState<"PARTIES" | "TRANSACTIONS">("PARTIES");

  // Party Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // New Voucher Modal
  const [isNewVoucherOpen, setIsNewVoucherOpen] = useState(false);
  const [voucherEntity, setVoucherEntity] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [voucherType, setVoucherType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [payMode, setPayMode] = useState("CASH");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");

  // View History Modal State
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    partyId: string;
    entityType: "CUSTOMER" | "SUPPLIER";
    partyName: string;
    loading: boolean;
    data: any | null;
    activeTab: "ledger" | "invoices" | "payments";
  }>({
    isOpen: false,
    partyId: "",
    entityType: "CUSTOMER",
    partyName: "",
    loading: false,
    data: null,
    activeTab: "ledger",
  });

  useEffect(() => {
    fetchKhata();
  }, [entityType, search]);

  useEffect(() => {
    fetchParties();
  }, []);

  async function fetchKhata() {
    setLoading(true);
    try {
      let url = `/api/khata?search=${encodeURIComponent(search)}`;
      if (entityType !== "ALL") url += `&entityType=${entityType}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setEntries(d.entries || []);
        setTotalReceivables(d.totalReceivables || 0);
        setTotalPayables(d.totalPayables || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchParties() {
    try {
      const [cRes, sRes] = await Promise.all([fetch("/api/customers"), fetch("/api/suppliers")]);
      if (cRes.ok) {
        const d = await cRes.json();
        setCustomers(d.customers || []);
        if (d.customers.length > 0 && !selectedPartyId) {
          setSelectedPartyId(d.customers[0].id);
        }
      }
      if (sRes.ok) {
        const d = await sRes.json();
        setSuppliers(d.suppliers || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Combined and filtered parties list for the "PARTIES" view
  const filteredParties = useMemo(() => {
    const list: any[] = [];
    if (entityType === "ALL" || entityType === "CUSTOMER") {
      customers.forEach((c) => {
        list.push({
          ...c,
          partyType: "CUSTOMER" as const,
          invoicesCount: c._count?.salesInvoices || 0,
          paymentsCount: c._count?.paymentsReceived || 0,
        });
      });
    }
    if (entityType === "ALL" || entityType === "SUPPLIER") {
      suppliers.forEach((s) => {
        list.push({
          ...s,
          partyType: "SUPPLIER" as const,
          invoicesCount: s._count?.purchaseInvoices || 0,
          paymentsCount: s._count?.paymentsMade || 0,
        });
      });
    }

    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.companyName?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.gstin?.toLowerCase().includes(q)
    );
  }, [customers, suppliers, entityType, search]);

  // Open Full History Modal for a party
  async function openPartyHistory(partyId: string, partyType: "CUSTOMER" | "SUPPLIER", initialName?: string) {
    if (!partyId) return;
    setHistoryModal({
      isOpen: true,
      partyId,
      entityType: partyType,
      partyName: initialName || "Loading...",
      loading: true,
      data: null,
      activeTab: "ledger",
    });

    try {
      const url = partyType === "CUSTOMER" ? `/api/customers/${partyId}` : `/api/suppliers/${partyId}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        const p = partyType === "CUSTOMER" ? d.customer : d.supplier;
        setHistoryModal((prev) => ({
          ...prev,
          loading: false,
          partyName: p?.name || initialName || "Party History",
          data: d,
        }));
      } else {
        alert("Failed to load party history details");
        setHistoryModal((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error(err);
      alert("Error loading party history");
      setHistoryModal((prev) => ({ ...prev, loading: false }));
    }
  }

  function openRecordVoucherForParty(partyId: string, type: "CUSTOMER" | "SUPPLIER") {
    setVoucherEntity(type);
    setSelectedPartyId(partyId);
    setIsNewVoucherOpen(true);
  }

  async function handleCreateVoucher(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: voucherEntity,
          partyId: selectedPartyId,
          amount,
          entryType: voucherEntity === "CUSTOMER" ? "RECEIPT" : "PAYMENT",
          paymentMode: payMode,
          referenceNumber: refNo,
          notes,
        }),
      });

      if (res.ok) {
        setIsNewVoucherOpen(false);
        setAmount("");
        setRefNo("");
        setNotes("");
        fetchKhata();
        fetchParties();
        if (historyModal.isOpen && historyModal.partyId === selectedPartyId) {
          openPartyHistory(historyModal.partyId, historyModal.entityType, historyModal.partyName);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record voucher");
      }
    } catch {
      alert("Error posting voucher");
    }
  }

  function handleExportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("MARUTI TRADERS - KHATA BOOK & AUDIT LEDGER", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${formatDate(new Date())}`, 14, 26);
    doc.text(
      `Total Receivables: INR ${totalReceivables.toFixed(2)} | Total Payables: INR ${totalPayables.toFixed(2)}`,
      14,
      32
    );

    const rows = entries.map((e) => [
      formatDate(e.entryDate),
      e.entityType === "CUSTOMER" ? e.customer?.name : e.supplier?.name,
      e.entityType,
      e.transactionType,
      e.referenceNumber || "-",
      e.debit > 0 ? e.debit.toFixed(2) : "-",
      e.credit > 0 ? e.credit.toFixed(2) : "-",
      e.balance.toFixed(2),
    ]);

    autoTable(doc, {
      startY: 38,
      head: [
        [
          "Date",
          "Party Name",
          "Party Type",
          "Transaction",
          "Ref No",
          "Debit (Naame)",
          "Credit (Jama)",
          "Balance (INR)",
        ],
      ],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [15, 34, 58], textColor: 255 },
      styles: { fontSize: 8 },
    });

    doc.save(`Maruti_Traders_Khata_Ledger_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  // Export Individual Party Statement PDF
  function handleDownloadPartyStatementPDF(party: any, company: any, type: "CUSTOMER" | "SUPPLIER") {
    if (!party) return;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(company?.name || "MARUTI TRADERS", 14, 20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const statementTitle =
      type === "CUSTOMER"
        ? "CUSTOMER ACCOUNT STATEMENT / KHATA BOOK"
        : "SUPPLIER ACCOUNT STATEMENT / KHATA BOOK";
    doc.text(statementTitle, 14, 26);
    if (company?.phone || company?.gstin) {
      doc.text(`Phone: ${company?.phone || "-"} | GSTIN: ${company?.gstin || "-"}`, 14, 31);
    }

    doc.line(14, 35, 196, 35);

    doc.setFont("helvetica", "bold");
    doc.text(`Party: ${party.name} (${type})`, 14, 42);
    doc.setFont("helvetica", "normal");
    if (party.companyName) doc.text(party.companyName, 14, 47);
    doc.text(`Phone: ${party.phone || "-"} | City: ${party.city || "-"}`, 14, 52);
    if (party.gstin) doc.text(`GSTIN: ${party.gstin}`, 14, 57);

    doc.setFont("helvetica", "bold");
    const balLabel = type === "CUSTOMER" ? "Outstanding Balance (Udhaar)" : "Payable Balance (Lena/Dena)";
    doc.text(`${balLabel}: INR ${(party.currentBalance || 0).toFixed(2)}`, 110, 42);

    const ledgerEntries = party.ledgerEntries || [];
    const rows = ledgerEntries.map((e: any) => [
      formatDate(e.entryDate),
      e.transactionType,
      e.referenceNumber || "-",
      e.debit > 0 ? e.debit.toFixed(2) : "-",
      e.credit > 0 ? e.credit.toFixed(2) : "-",
      (e.balance || 0).toFixed(2),
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Date", "Transaction Type", "Ref No", "Debit (Dr)", "Credit (Cr)", "Balance (INR)"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [15, 34, 58], textColor: 255 },
      styles: { fontSize: 8 },
    });

    doc.save(`Statement_${party.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  // Active party details in modal
  const modalParty = historyModal.data
    ? historyModal.entityType === "CUSTOMER"
      ? historyModal.data.customer
      : historyModal.data.supplier
    : null;
  const modalCompany = historyModal.data?.company;
  const modalInvoices = modalParty
    ? historyModal.entityType === "CUSTOMER"
      ? modalParty.salesInvoices || []
      : modalParty.purchaseInvoices || []
    : [];
  const modalPayments = modalParty
    ? historyModal.entityType === "CUSTOMER"
      ? modalParty.paymentsReceived || []
      : modalParty.paymentsMade || []
    : [];
  const modalLedger = modalParty ? modalParty.ledgerEntries || [] : [];

  const totalInvoicedAmount = modalInvoices.reduce((acc: number, inv: any) => acc + (inv.grandTotal || 0), 0);
  const totalPaidAmount = modalPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

  const modalWaUrl =
    modalParty && modalParty.phone && historyModal.entityType === "CUSTOMER"
      ? generateKhataReminderWhatsAppUrl({
          customerName: modalParty.name,
          customerPhone: modalParty.phone,
          outstandingBalance: formatINR(modalParty.currentBalance || 0),
        })
      : null;

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-navy-900 truncate whitespace-nowrap">
                Khata Book / Ledger
              </h1>
              <span className="bg-purple-100 text-purple-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-semibold border border-purple-300 whitespace-nowrap">
                Live Audit Trail
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              Parties ledger accounts, complete transaction history, receivables & payables
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
              onClick={() => setIsNewVoucherOpen(true)}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Record Entry</span>
            </button>
          </div>
        </div>

        {/* 2 Big Khata Cards: Total Receivables vs Total Payables */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-6">
          {/* Card 1: Customer Receivables */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm border border-slate-200/80 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 whitespace-nowrap">
                    Receivables (Lena Hai)
                  </span>
                  <p className="text-base sm:text-3xl font-black text-amber-600 mt-1 sm:mt-2 whitespace-nowrap">
                    {formatINR(totalReceivables)}
                  </p>
                </div>
                <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-3 hidden sm:block truncate whitespace-nowrap">
              Total outstanding balance across all customer accounts.
            </p>
          </div>

          {/* Card 2: Supplier Payables */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-sm border border-slate-200/80 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-700">
                    Payables (Dena Hai)
                  </span>
                  <p className="text-base sm:text-3xl font-black text-rose-600 mt-1 sm:mt-2">
                    {formatINR(totalPayables)}
                  </p>
                </div>
                <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Truck className="h-3.5 w-3.5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-3 hidden sm:block">
              Total outstanding liabilities payable to manufacturers and distributors.
            </p>
          </div>
        </div>

        {/* View Switcher & Search Bar */}
        <div className="space-y-3">
          {/* Main View Tabs: Parties List vs Live Ledger Transactions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex bg-slate-100 p-1 rounded-xl shadow-inner w-full sm:w-auto">
              <button
                onClick={() => setMainView("PARTIES")}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition ${
                  mainView === "PARTIES"
                    ? "bg-white text-navy-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="h-3.5 w-3.5 text-indigo-600" />
                <span>Parties Khata Accounts ({filteredParties.length})</span>
              </button>
              <button
                onClick={() => setMainView("TRANSACTIONS")}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition ${
                  mainView === "TRANSACTIONS"
                    ? "bg-white text-navy-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                <span>Live Ledger Entries ({entries.length})</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 sm:text-right hidden sm:block">
              Click <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">👁️ View History</span> on any party to see their complete history & bills.
            </div>
          </div>

          {/* Search & Party Filter Bar */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute left-3 top-2 sm:top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  mainView === "PARTIES"
                    ? "Search party by name, phone, city, GSTIN..."
                    : "Search ledger by party name, bill no, reference no or notes..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
              <select
                value={entityType}
                onChange={(e: any) => setEntityType(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Parties (Customers & Suppliers)</option>
                <option value="CUSTOMER">Customers Only</option>
                <option value="SUPPLIER">Suppliers Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* VIEW 1: PARTIES KHATA ACCOUNTS (Party Centric View) */}
        {mainView === "PARTIES" && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            {/* Mobile Card Feed for Parties */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredParties.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No parties found matching &quot;{search}&quot;.
                </div>
              ) : (
                filteredParties.map((p) => {
                  const isCust = p.partyType === "CUSTOMER";
                  const waUrl =
                    isCust && p.phone && p.currentBalance > 0
                      ? generateKhataReminderWhatsAppUrl({
                          customerName: p.name,
                          customerPhone: p.phone,
                          outstandingBalance: formatINR(p.currentBalance),
                        })
                      : null;

                  return (
                    <div key={`${p.partyType}-${p.id}`} className="p-3.5 space-y-2.5 hover:bg-slate-50/80 transition">
                      {/* Party Header & Type */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="font-bold text-xs sm:text-sm text-navy-900 truncate">{p.name}</h4>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                                isCust ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {p.partyType}
                            </span>
                          </div>
                          {p.companyName && (
                            <p className="text-[11px] text-slate-600 truncate">{p.companyName}</p>
                          )}
                          <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                            {p.phone && <span>📞 {p.phone}</span>}
                            {p.city && <span>📍 {p.city}</span>}
                          </div>
                        </div>

                        {/* Balance display */}
                        <div className="text-right shrink-0">
                          <span className="text-[9px] uppercase tracking-wider block font-semibold text-slate-400">
                            {isCust ? "Udhaar (Due)" : "Payable"}
                          </span>
                          <span
                            className={`text-xs font-black font-mono ${
                              p.currentBalance > 0
                                ? isCust
                                  ? "text-rose-600"
                                  : "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {formatINR(p.currentBalance)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons: VIEW HISTORY prominently */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          onClick={() => openPartyHistory(p.id, p.partyType, p.name)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View History</span>
                        </button>

                        <div className="flex items-center space-x-1.5">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => openRecordVoucherForParty(p.id, p.partyType)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          >
                            <CreditCard className="h-3 w-3" />
                            <span>Record</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table for Parties */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-left">Party Details</th>
                    <th className="py-3 px-4 text-left">Type</th>
                    <th className="py-3 px-4 text-left">Contact & Location</th>
                    <th className="py-3 px-4 text-center">Invoices / Bills</th>
                    <th className="py-3 px-4 text-right">Khata Balance (₹)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No parties found matching &quot;{search}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredParties.map((p) => {
                      const isCust = p.partyType === "CUSTOMER";
                      const waUrl =
                        isCust && p.phone && p.currentBalance > 0
                          ? generateKhataReminderWhatsAppUrl({
                              customerName: p.name,
                              customerPhone: p.phone,
                              outstandingBalance: formatINR(p.currentBalance),
                            })
                          : null;

                      return (
                        <tr key={`${p.partyType}-${p.id}`} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <p className="font-bold text-navy-900 text-sm">{p.name}</p>
                            {p.companyName && (
                              <p className="text-[11px] text-slate-500">{p.companyName}</p>
                            )}
                            {p.gstin && (
                              <span className="text-[10px] text-slate-400 font-mono">GSTIN: {p.gstin}</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCust ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {p.partyType}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <p className="text-slate-800 font-mono font-medium">{p.phone || "-"}</p>
                            <p className="text-[11px] text-slate-500">{p.city || "-"}</p>
                          </td>

                          <td className="py-3 px-4 text-center font-mono text-slate-600">
                            {p.invoicesCount || 0} Bills
                          </td>

                          <td className="py-3 px-4 text-right">
                            <p
                              className={`font-mono font-black text-sm ${
                                p.currentBalance > 0
                                  ? isCust
                                    ? "text-rose-600"
                                    : "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {formatINR(p.currentBalance)}
                            </p>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                              {p.currentBalance > 0
                                ? isCust
                                  ? "Udhaar (Due)"
                                  : "Payable"
                                : "Settled"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* View History Button */}
                              <button
                                onClick={() => openPartyHistory(p.id, p.partyType, p.name)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition shadow-sm"
                                title="View Complete Party History & Bills"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View History</span>
                              </button>

                              {/* WhatsApp Reminder */}
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                  title="Send Reminder on WhatsApp"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              )}

                              {/* Quick Record Voucher */}
                              <button
                                onClick={() => openRecordVoucherForParty(p.id, p.partyType)}
                                className="inline-flex items-center p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="Record Voucher for this Party"
                              >
                                <CreditCard className="h-4 w-4" />
                              </button>
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
        )}

        {/* VIEW 2: LIVE LEDGER ENTRIES (Transaction Feed with View History button on every row) */}
        {mainView === "TRANSACTIONS" && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            {/* Mobile Card Feed (Phones & Small Tablets) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading ledger transactions...</div>
              ) : entries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No Khata entries found.</div>
              ) : (
                entries.map((e) => {
                  const party = e.entityType === "CUSTOMER" ? e.customer : e.supplier;
                  const partyId = e.entityType === "CUSTOMER" ? e.customer?.id || e.customerId : e.supplier?.id || e.supplierId;
                  const waReminderUrl =
                    e.entityType === "CUSTOMER" && party && party.phone && (party.currentBalance || 0) > 0
                      ? generateKhataReminderWhatsAppUrl({
                          customerName: party.name,
                          customerPhone: party.phone,
                          outstandingBalance: formatINR(party.currentBalance || 0),
                        })
                      : null;

                  return (
                    <div key={e.id} className="p-3 space-y-2 hover:bg-slate-50 transition">
                      {/* Top: Party Name + Date + Type Pill */}
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <h4 className="font-bold text-xs text-navy-900 truncate">{party?.name || "Party"}</h4>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                                e.entityType === "CUSTOMER"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {e.entityType}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {formatDate(e.entryDate)}
                            {e.referenceNumber && <span> • Ref: {e.referenceNumber}</span>}
                          </div>
                        </div>

                        {/* Transaction Type */}
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold shrink-0">
                          {e.transactionType}
                        </span>
                      </div>

                      {/* Debit, Credit, Balance Row */}
                      <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-lg text-center text-[10px]">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Debit (Dr)</span>
                          <span className="font-bold text-rose-600">
                            {e.debit > 0 ? formatINR(e.debit) : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Credit (Cr)</span>
                          <span className="font-bold text-emerald-600">
                            {e.credit > 0 ? formatINR(e.credit) : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Balance</span>
                          <span className="font-bold text-navy-900">{formatINR(e.balance)}</span>
                        </div>
                      </div>

                      {/* Actions: View History & WhatsApp */}
                      <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200">
                        <button
                          onClick={() => openPartyHistory(partyId, e.entityType, party?.name)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View History</span>
                        </button>

                        {waReminderUrl && (
                          <a
                            href={waReminderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                          >
                            <Share2 className="h-3 w-3" />
                            <span>WhatsApp Reminder</span>
                          </a>
                        )}
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
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Date</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Party</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Type</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-left">Transaction & Ref</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right text-rose-600">Debit (Dr)</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right text-emerald-600">Credit (Cr)</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Running Balance (₹)</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Loading ledger transactions...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No Khata entries found.
                      </td>
                    </tr>
                  ) : (
                    entries.map((e) => {
                      const party = e.entityType === "CUSTOMER" ? e.customer : e.supplier;
                      const partyId = e.entityType === "CUSTOMER" ? e.customer?.id || e.customerId : e.supplier?.id || e.supplierId;
                      const waReminderUrl =
                        e.entityType === "CUSTOMER" && party && party.phone && (party.currentBalance || 0) > 0
                          ? generateKhataReminderWhatsAppUrl({
                              customerName: party.name,
                              customerPhone: party.phone,
                              outstandingBalance: formatINR(party.currentBalance || 0),
                            })
                          : null;

                      return (
                        <tr key={e.id} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 sm:py-3 sm:px-4 text-slate-600 font-mono">
                            {formatDate(e.entryDate)}
                          </td>

                          <td className="py-2 px-3 sm:py-3 sm:px-4">
                            <p className="font-bold text-navy-900">{party?.name || "Party"}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{party?.phone || "-"}</span>
                          </td>

                          <td className="py-2 px-3 sm:py-3 sm:px-4">
                            <span
                              className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                                e.entityType === "CUSTOMER"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {e.entityType}
                            </span>
                          </td>

                          <td className="py-2 px-3 sm:py-3 sm:px-4">
                            <span className="font-semibold text-slate-800">{e.transactionType}</span>
                            <span className="block text-[10px] sm:text-[11px] text-slate-500 font-mono">
                              {e.referenceNumber || "-"}
                            </span>
                            {e.notes && (
                              <span className="block text-[9px] sm:text-[10px] text-slate-400 italic">
                                {e.notes}
                              </span>
                            )}
                          </td>

                          <td className="py-2 px-3 sm:py-3 sm:px-4 text-right font-mono font-bold text-rose-600">
                            {e.debit > 0 ? formatINR(e.debit) : "-"}
                          </td>

                          <td className="py-2 px-3 sm:py-3 sm:px-4 text-right font-mono font-bold text-emerald-600">
                            {e.credit > 0 ? formatINR(e.credit) : "-"}
                          </td>

                          <td className="py-2 px-3 sm:py-3 sm:px-4 text-right font-mono font-bold text-navy-900">
                            {formatINR(e.balance)}
                          </td>

                          <td className="py-2 px-3 sm:py-3 sm:px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* View History Button */}
                              <button
                                onClick={() => openPartyHistory(partyId, e.entityType, party?.name)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition"
                                title="View Complete History"
                              >
                                <Eye className="h-3 w-3" />
                                <span>View History</span>
                              </button>

                              {waReminderUrl && (
                                <a
                                  href={waReminderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 p-1 sm:p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                  title="Send Reminder on WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
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
        )}

        {/* PARTY COMPLETE HISTORY MODAL / DRAWER */}
        {historyModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        historyModal.entityType === "CUSTOMER"
                          ? "bg-amber-400 text-slate-900"
                          : "bg-blue-400 text-slate-900"
                      }`}
                    >
                      {historyModal.entityType}
                    </span>
                    <h2 className="text-base sm:text-xl font-bold truncate">
                      {historyModal.partyName}
                    </h2>
                  </div>

                  {modalParty && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-1">
                      {modalParty.phone && (
                        <a href={`tel:${modalParty.phone}`} className="hover:text-white flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{modalParty.phone}</span>
                        </a>
                      )}
                      {modalParty.city && (
                        <span className="flex items-center space-x-1">
                          <Building className="h-3 w-3" />
                          <span>{modalParty.city}</span>
                        </span>
                      )}
                      {modalParty.gstin && (
                        <span className="font-mono text-[11px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          GSTIN: {modalParty.gstin}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right side: Balance badge and Close button */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0">
                  {modalParty && (
                    <div className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-right">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                        {historyModal.entityType === "CUSTOMER" ? "Outstanding Balance" : "Payable Balance"}
                      </span>
                      <span
                        className={`text-sm sm:text-base font-black font-mono ${
                          (modalParty.currentBalance || 0) > 0 ? "text-amber-400" : "text-emerald-400"
                        }`}
                      >
                        {formatINR(modalParty.currentBalance || 0)}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setHistoryModal((prev) => ({ ...prev, isOpen: false }))}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  {/* Tab Navigation */}
                  <button
                    onClick={() => setHistoryModal((prev) => ({ ...prev, activeTab: "ledger" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                      historyModal.activeTab === "ledger"
                        ? "bg-navy-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Ledger Statement ({modalLedger.length})</span>
                  </button>

                  <button
                    onClick={() => setHistoryModal((prev) => ({ ...prev, activeTab: "invoices" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                      historyModal.activeTab === "invoices"
                        ? "bg-navy-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
                    }`}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Bills & Invoices ({modalInvoices.length})</span>
                  </button>

                  <button
                    onClick={() => setHistoryModal((prev) => ({ ...prev, activeTab: "payments" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                      historyModal.activeTab === "payments"
                        ? "bg-navy-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Payments ({modalPayments.length})</span>
                  </button>
                </div>

                {/* PDF & WhatsApp Actions */}
                <div className="flex items-center space-x-2">
                  {modalParty && (
                    <button
                      onClick={() =>
                        handleDownloadPartyStatementPDF(modalParty, modalCompany, historyModal.entityType)
                      }
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Statement PDF</span>
                    </button>
                  )}

                  {modalWaUrl && (
                    <a
                      href={modalWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  )}

                  {modalParty && (
                    <button
                      onClick={() => {
                        openRecordVoucherForParty(modalParty.id, historyModal.entityType);
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Record Entry</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {historyModal.loading ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-indigo-600" />
                    <p className="text-xs text-slate-500">Loading party ledger, bills and complete history...</p>
                  </div>
                ) : !modalParty ? (
                  <div className="py-16 text-center text-slate-500 text-xs">
                    Failed to load party details. Please close and try again.
                  </div>
                ) : (
                  <>
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Current Balance
                        </span>
                        <span
                          className={`text-sm sm:text-base font-black font-mono mt-0.5 block ${
                            (modalParty.currentBalance || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {formatINR(modalParty.currentBalance || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {(modalParty.currentBalance || 0) > 0 ? "Pending Payment" : "Settled"}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          {historyModal.entityType === "CUSTOMER" ? "Total Invoiced" : "Total Purchased"}
                        </span>
                        <span className="text-sm sm:text-base font-black font-mono text-navy-900 mt-0.5 block">
                          {formatINR(totalInvoicedAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400">{modalInvoices.length} Bills Total</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          {historyModal.entityType === "CUSTOMER" ? "Total Received" : "Total Paid"}
                        </span>
                        <span className="text-sm sm:text-base font-black font-mono text-emerald-600 mt-0.5 block">
                          {formatINR(totalPaidAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400">{modalPayments.length} Payments</span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Ledger Entries
                        </span>
                        <span className="text-sm sm:text-base font-black font-mono text-indigo-700 mt-0.5 block">
                          {modalLedger.length} Records
                        </span>
                        <span className="text-[10px] text-slate-400">Full Audit History</span>
                      </div>
                    </div>

                    {/* TAB 1: LEDGER STATEMENT */}
                    {historyModal.activeTab === "ledger" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-bold text-navy-900">
                            Complete Ledger Statement (खाता बही)
                          </h3>
                          <span className="text-[10px] text-slate-400">
                            Sorted by date (latest first)
                          </span>
                        </div>

                        {modalLedger.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            No ledger transactions recorded for this party yet.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            {/* Mobile Feed */}
                            <div className="block md:hidden divide-y divide-slate-100">
                              {modalLedger.map((e: any) => (
                                <div key={e.id} className="p-3 space-y-1.5 hover:bg-slate-50 transition">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-mono text-slate-500">{formatDate(e.entryDate)}</span>
                                    <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                      {e.transactionType}
                                    </span>
                                  </div>

                                  {e.referenceNumber && (
                                    <p className="text-[11px] font-mono text-slate-600">Ref: {e.referenceNumber}</p>
                                  )}

                                  <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-50 rounded text-center text-[10px]">
                                    <div>
                                      <span className="text-slate-400 block text-[9px]">Debit (Dr)</span>
                                      <span className="font-bold text-rose-600">
                                        {e.debit > 0 ? formatINR(e.debit) : "-"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[9px]">Credit (Cr)</span>
                                      <span className="font-bold text-emerald-600">
                                        {e.credit > 0 ? formatINR(e.credit) : "-"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[9px]">Balance</span>
                                      <span className="font-bold text-navy-900">{formatINR(e.balance)}</span>
                                    </div>
                                  </div>

                                  {e.notes && (
                                    <p className="text-[10px] text-slate-400 italic">Note: {e.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-semibold">
                                  <tr>
                                    <th className="py-2.5 px-3 text-left">Date</th>
                                    <th className="py-2.5 px-3 text-left">Transaction Type</th>
                                    <th className="py-2.5 px-3 text-left">Reference #</th>
                                    <th className="py-2.5 px-3 text-right text-rose-600">Debit (Dr)</th>
                                    <th className="py-2.5 px-3 text-right text-emerald-600">Credit (Cr)</th>
                                    <th className="py-2.5 px-3 text-right font-bold text-navy-900">Balance (₹)</th>
                                    <th className="py-2.5 px-3 text-left">Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {modalLedger.map((e: any) => (
                                    <tr key={e.id} className="hover:bg-slate-50 transition">
                                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                                        {formatDate(e.entryDate)}
                                      </td>
                                      <td className="py-2 px-3 font-semibold text-slate-800">
                                        {e.transactionType}
                                      </td>
                                      <td className="py-2 px-3 font-mono text-slate-500">
                                        {e.referenceNumber || "-"}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                                        {e.debit > 0 ? formatINR(e.debit) : "-"}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                                        {e.credit > 0 ? formatINR(e.credit) : "-"}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-navy-900">
                                        {formatINR(e.balance)}
                                      </td>
                                      <td className="py-2 px-3 text-slate-500 text-[11px] max-w-[200px] truncate">
                                        {e.notes || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: INVOICES & BILLS */}
                    {historyModal.activeTab === "invoices" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-bold text-navy-900">
                            {historyModal.entityType === "CUSTOMER"
                              ? "Sales Invoices & Bills (बिल्स और चालान)"
                              : "Purchase Bills & Receipts (खरीद बिल)"}
                          </h3>
                          <span className="text-[10px] text-slate-400">{modalInvoices.length} Bills Total</span>
                        </div>

                        {modalInvoices.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            No bills or invoices found for this party.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {modalInvoices.map((inv: any) => {
                              const billNo = inv.invoiceNumber || inv.purchaseNumber || inv.billNumber || inv.id;
                              const billDate = inv.invoiceDate || inv.billDate;
                              const isPaid = inv.paymentStatus === "PAID";
                              const isPartial = inv.paymentStatus === "PARTIALLY_PAID";
                              const viewUrl =
                                historyModal.entityType === "CUSTOMER"
                                  ? `/sales/${inv.id}`
                                  : `/purchases/${inv.id}`;

                              return (
                                <div
                                  key={inv.id}
                                  className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-white hover:border-indigo-300 transition shadow-sm space-y-2.5"
                                >
                                  {/* Invoice Top Details */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-xs sm:text-sm font-mono text-navy-900">
                                          {billNo}
                                        </span>
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                            isPaid
                                              ? "bg-emerald-100 text-emerald-800"
                                              : isPartial
                                              ? "bg-amber-100 text-amber-800"
                                              : "bg-rose-100 text-rose-800"
                                          }`}
                                        >
                                          {inv.paymentStatus || "UNPAID"}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          Mode: {inv.paymentMode || "CASH"}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        Date: {formatDate(billDate)}
                                      </p>
                                    </div>

                                    <div className="flex items-center space-x-3 justify-between sm:justify-end">
                                      <div className="text-right">
                                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                                          Grand Total
                                        </span>
                                        <span className="text-sm font-black font-mono text-navy-900">
                                          {formatINR(inv.grandTotal)}
                                        </span>
                                      </div>

                                      <div className="text-right">
                                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                                          Due Balance
                                        </span>
                                        <span
                                          className={`text-sm font-black font-mono ${
                                            (inv.balanceDue || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                                          }`}
                                        >
                                          {formatINR(inv.balanceDue || 0)}
                                        </span>
                                      </div>

                                      <a
                                        href={viewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                                      >
                                        <span>View Bill</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  </div>

                                  {/* Item Details Breakdown */}
                                  {inv.items && inv.items.length > 0 && (
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                        Items / Products Breakdown:
                                      </span>
                                      <div className="space-y-1">
                                        {inv.items.map((it: any) => (
                                          <div
                                            key={it.id}
                                            className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-xs"
                                          >
                                            <div className="min-w-0 pr-2">
                                              <p className="font-bold text-navy-900 truncate">
                                                {it.product?.name || "Product Item"}
                                              </p>
                                              {it.slabDetails && (
                                                <p className="text-[10px] text-slate-500 font-mono">
                                                  Size / Box: {it.slabDetails}
                                                </p>
                                              )}
                                            </div>

                                            <div className="flex items-center space-x-3 shrink-0 text-right">
                                              <span className="text-[11px] font-mono text-slate-600">
                                                {it.quantity} {it.unit || "SQFT"} × ₹{it.unitPrice}
                                              </span>
                                              <span className="font-mono font-bold text-navy-900">
                                                {formatINR(
                                                  it.taxableAmount ||
                                                    it.totalAmount ||
                                                    it.quantity * it.unitPrice
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: PAYMENTS & RECEIPTS */}
                    {historyModal.activeTab === "payments" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-bold text-navy-900">
                            {historyModal.entityType === "CUSTOMER"
                              ? "Payments Received / Receipts (भुगतान इतिहास)"
                              : "Payments Made to Supplier (भुगतान इतिहास)"}
                          </h3>
                          <span className="text-[10px] text-slate-400">{modalPayments.length} Payments</span>
                        </div>

                        {modalPayments.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            No payment transactions recorded for this party yet.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                            {modalPayments.map((p: any) => (
                              <div
                                key={p.id}
                                className="p-3 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-xs sm:text-sm font-mono text-navy-900">
                                      {p.paymentNumber}
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                                      {p.paymentMode}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-mono">
                                    Date: {formatDate(p.paymentDate)}
                                    {p.referenceNumber && <span> • Ref / UTR: {p.referenceNumber}</span>}
                                  </p>
                                  {p.notes && <p className="text-[10px] text-slate-500 italic">{p.notes}</p>}
                                </div>

                                <div className="text-right">
                                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 block">
                                    + {formatINR(p.amount)}
                                  </span>
                                  <span className="text-[10px] text-slate-400">Payment Settled</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500">
                  Account of <strong className="text-navy-900">{historyModal.partyName}</strong>
                </span>
                <button
                  onClick={() => setHistoryModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Voucher Modal */}
        {isNewVoucherOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-navy-900">Record Khata Voucher</h3>
                <button onClick={() => setIsNewVoucherOpen(false)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateVoucher} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Account Type</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherEntity("CUSTOMER");
                        if (customers.length > 0) setSelectedPartyId(customers[0].id);
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        voucherEntity === "CUSTOMER"
                          ? "bg-navy-900 text-white border-navy-900"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherEntity("SUPPLIER");
                        if (suppliers.length > 0) setSelectedPartyId(suppliers[0].id);
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        voucherEntity === "SUPPLIER"
                          ? "bg-navy-900 text-white border-navy-900"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      Supplier
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Select {voucherEntity === "CUSTOMER" ? "Customer" : "Supplier"} *
                  </label>
                  <select
                    required
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-medium"
                  >
                    {voucherEntity === "CUSTOMER"
                      ? customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Due: ₹{c.currentBalance})
                          </option>
                        ))
                      : suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Payable: ₹{s.currentBalance})
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {voucherEntity === "CUSTOMER" ? "Amount Received (₹) *" : "Amount Paid (₹) *"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
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
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Reference / UTR / Cheque</label>
                  <input
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    placeholder="e.g. UPI/83940291039"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Remarks / Note</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Settlement payment"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsNewVoucherOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                  >
                    Post to Khata Book
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
