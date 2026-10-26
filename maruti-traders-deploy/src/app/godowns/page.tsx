"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { formatINR, formatDate, formatDateTime } from "@/lib/formatters";
import { useAuth } from "@/context/AuthContext";
import { BRANCH_CONFIGS, AUTHORIZED_GODOWNS } from "@/lib/location";
import {
  Warehouse,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  MapPin,
  ChevronRight,
  Boxes,
  ShieldCheck,
  AlertTriangle,
  X,
  Plus,
} from "lucide-react";

function GodownsContent() {
  const { hasPermission, location } = useAuth();
  const searchParams = useSearchParams();
  const branch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

  const [godowns, setGodowns] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"locations" | "transfers">("locations");
  const [loading, setLoading] = useState(true);
  const [selectedGodownDetail, setSelectedGodownDetail] = useState<any | null>(null);

  // Transfer Modal
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    sourceGodownId: "",
    destinationGodownId: "",
    notes: "",
    dispatchImmediately: true,
    items: [{ productId: "", quantity: 50 }],
  });
  const [transferError, setTransferError] = useState("");

  useEffect(() => {
    if (searchParams.get("tab") === "transfers") {
      setActiveTab("transfers");
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [location]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch both authorized godowns (JALOD & DAHOD)
      const [godownRes, transferRes, prodRes] = await Promise.all([
        fetch("/api/godowns?all=true"),
        fetch("/api/transfers"),
        fetch("/api/products?includeInactive=false"),
      ]);

      let loadedGodowns: any[] = [];
      if (godownRes.ok) {
        const d = await godownRes.json();
        loadedGodowns = d.godowns || [];
        setGodowns(loadedGodowns);

        // Pre-configure transfer source & destination between the 2 authorized godowns
        if (loadedGodowns.length >= 2) {
          const jalodGdw = loadedGodowns.find((g: any) => g.code === "JALOD" || g.code === "LODHA") || loadedGodowns[0];
          const dahodGdw = loadedGodowns.find((g: any) => g.code === "DAHOD") || loadedGodowns[1];

          // Default source is current location
          const defaultSource = location === "DAHOD" ? dahodGdw.id : jalodGdw.id;
          const defaultDest = location === "DAHOD" ? jalodGdw.id : dahodGdw.id;

          setTransferForm((prev) => ({
            ...prev,
            sourceGodownId: defaultSource,
            destinationGodownId: defaultDest,
          }));
        }
      }

      if (transferRes.ok) {
        const d = await transferRes.json();
        setTransfers(d.transfers || []);
      }

      if (prodRes.ok) {
        const d = await prodRes.json();
        const prods = d.products || [];
        setProducts(prods);
        if (prods.length > 0) {
          setTransferForm((prev) => ({
            ...prev,
            items: [{ productId: prods[0].id, quantity: 50 }],
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSourceChange(newSourceId: string) {
    // Automatically set opposite authorized godown as destination
    const opposite = godowns.find((g) => g.id !== newSourceId);
    setTransferForm({
      ...transferForm,
      sourceGodownId: newSourceId,
      destinationGodownId: opposite ? opposite.id : "",
    });
    setTransferError("");
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferError("");

    if (transferForm.sourceGodownId === transferForm.destinationGodownId) {
      setTransferError("Source and Destination godowns cannot be identical. Transfers must be between Jalod and Dahod.");
      return;
    }

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferForm),
      });
      if (res.ok) {
        setIsNewTransferOpen(false);
        setActiveTab("transfers");
        fetchData();
      } else {
        const err = await res.json();
        setTransferError(err.error || "Failed to initiate transfer");
      }
    } catch {
      setTransferError("Error initiating transfer. Please check network.");
    }
  }

  async function handleTransferAction(id: string, action: "DISPATCH" | "RECEIVE" | "CANCEL") {
    if (!confirm(`Are you sure you want to ${action} this transfer?`)) return;
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || `Failed to ${action} transfer`);
      }
    } catch {
      alert(`Error updating transfer`);
    }
  }

  const jalodGodown = godowns.find((g) => g.code === "JALOD" || g.code === "LODHA");
  const dahodGodown = godowns.find((g) => g.code === "DAHOD");

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Two-Godown Enforcement Notice */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate whitespace-nowrap">Godowns & Transfers</h1>
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-navy-50 text-navy-800 border border-navy-200 whitespace-nowrap">
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-navy-700" />
                Jalod & Dahod Only
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              Two authorized marble warehouses with strict inter-branch transfers.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {hasPermission("inventory:manage") && (
              <button
                onClick={() => setIsNewTransferOpen(true)}
                className="inline-flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-sm transition whitespace-nowrap"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Inter-Branch Stock Transfer</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex space-x-1.5 sm:space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("locations")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap ${
              activeTab === "locations"
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Warehouse className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Authorized Godowns (2)</span>
          </button>

          <button
            onClick={() => setActiveTab("transfers")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap ${
              activeTab === "transfers"
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Transfer History ({transfers.length})</span>
          </button>
        </div>

        {/* Tab 1: Authorized Godown Locations */}
        {activeTab === "locations" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
              {godowns.map((g) => {
                const isCurrentBranch = g.location === location;
                const isJalod = g.code === "JALOD" || g.code === "LODHA";
                return (
                  <div
                    key={g.id}
                    className={`bg-white rounded-xl sm:rounded-2xl shadow-sm border p-4 sm:p-6 flex flex-col justify-between transition relative overflow-hidden ${
                      isCurrentBranch
                        ? "border-emerald-500/80 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {isCurrentBranch && (
                      <div className="absolute top-0 right-0 bg-emerald-600 text-white px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-bl-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                        Active Branch
                      </div>
                    )}

                    <div>
                      <div className="flex items-center space-x-2 pb-2.5 sm:pb-3 border-b border-slate-100">
                        <span
                          className={`font-mono text-[10px] sm:text-xs font-extrabold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg border ${
                            isJalod
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-blue-50 text-blue-800 border-blue-300"
                          }`}
                        >
                          CODE: {g.code}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          {g.city}, Gujarat
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 mt-3 sm:mt-4">{g.name}</h3>

                      <div className="mt-2.5 sm:mt-3 space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs text-slate-600">
                        <p className="flex items-start">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-slate-400 shrink-0 mt-0.5" />
                          <span>{g.address}</span>
                        </p>
                        <p className="flex items-center">
                          <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-slate-400 shrink-0" />
                          <span>
                            Manager: <strong className="text-slate-800 font-semibold">{g.managerName}</strong> (
                            {g.contactPhone})
                          </span>
                        </p>
                      </div>

                      {/* Stock Summary Metrics */}
                      <div className="mt-4 sm:mt-5 grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 p-2.5 sm:p-4 rounded-xl border border-slate-200/70">
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">Available</p>
                          <p className="text-xs sm:text-base font-extrabold text-slate-900 mt-0.5">
                            {Number(g.totalUnits || 0).toLocaleString("en-IN")}{" "}
                            <span className="text-[10px] sm:text-xs font-normal text-slate-500">SQFT</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">Slabs</p>
                          <p className="text-xs sm:text-base font-extrabold text-navy-800 mt-0.5">
                            {Number(g.totalSlabs || 0).toLocaleString("en-IN")}{" "}
                            <span className="text-[10px] sm:text-xs font-normal text-slate-500">slabs</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">Valuation</p>
                          <p className="text-xs sm:text-base font-extrabold text-emerald-700 mt-0.5">
                            {formatINR(g.totalValuation || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs text-slate-500">
                        {g.stocks?.length || 0} active products stored
                      </span>
                      <button
                        onClick={() => setSelectedGodownDetail(g)}
                        className="text-[11px] sm:text-xs font-bold text-navy-800 hover:text-navy-900 flex items-center space-x-1"
                      >
                        <span>View Details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Information Callout */}
            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-[11px] sm:text-xs text-slate-600 flex items-start space-x-2.5 sm:space-x-3">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Fixed Multi-Location Architecture</p>
                <p className="mt-0.5">
                  Maruti Traders operates strictly with two authorized godown locations: <strong>Jalod</strong> and <strong>Dahod</strong>.
                  Creation of third godowns or arbitrary sub-depots is locked by policy to maintain clean inventory separation and compliance with interstate GST rules.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Inter-Branch Stock Transfers */}
        {activeTab === "transfers" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Inter-Branch Transfer Movements</h3>
                <p className="text-xs text-slate-500">Stock movements between Jalod Godown and Dahod Godown</p>
              </div>
              <button
                onClick={() => setIsNewTransferOpen(true)}
                className="px-3.5 py-1.5 bg-navy-900 text-white rounded-xl text-xs font-bold hover:bg-navy-800 transition flex items-center space-x-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Transfer</span>
              </button>
            </div>

            {transfers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No stock transfers recorded yet. Use the "Inter-Branch Stock Transfer" button to transfer marble between Jalod and Dahod.
              </div>
            ) : (
              <div>
                {/* Mobile Transfer Cards (No Horizontal Scroll) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {transfers.map((t) => (
                    <div key={t.id} className="p-3 space-y-2 hover:bg-slate-50/70 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="font-mono font-bold text-xs text-navy-900 truncate">{t.transferNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">• {formatDate(t.createdAt)}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            t.status === "RECEIVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : t.status === "DISPATCHED"
                              ? "bg-blue-100 text-blue-800"
                              : t.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px]">
                          {t.sourceGodown?.name || "Jalod Godown"}
                        </span>
                        <ArrowRightLeft className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px]">
                          {t.destinationGodown?.name || "Dahod Godown"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                        <span className="font-semibold text-slate-900">
                          {t.items?.length || 0} Lot(s) ({t.items?.reduce((acc: number, it: any) => acc + it.quantityRequested, 0) || 0} SQFT)
                        </span>

                        <div className="space-x-1">
                          {t.status === "DRAFT" && (
                            <button
                              onClick={() => handleTransferAction(t.id, "DISPATCH")}
                              className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700"
                            >
                              Dispatch
                            </button>
                          )}
                          {t.status === "DISPATCHED" && (
                            <button
                              onClick={() => handleTransferAction(t.id, "RECEIVE")}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                            >
                              Receive at Dest
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Transfer #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Route (Source → Destination)</th>
                      <th className="py-3 px-4">Items Transferred</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transfers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 font-mono font-bold text-navy-900">{t.transferNumber}</td>
                        <td className="py-3.5 px-4 text-slate-600">{formatDate(t.createdAt)}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2 font-semibold">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                              {t.sourceGodown?.name || "Jalod Godown"}
                            </span>
                            <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[11px]">
                              {t.destinationGodown?.name || "Dahod Godown"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">
                            {t.items?.length || 0} Lot(s) (
                            {t.items?.reduce((acc: number, it: any) => acc + it.quantityRequested, 0) || 0} SQFT)
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === "RECEIVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : t.status === "DISPATCHED"
                                ? "bg-blue-100 text-blue-800"
                                : t.status === "CANCELLED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          {t.status === "DRAFT" && (
                            <button
                              onClick={() => handleTransferAction(t.id, "DISPATCH")}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700"
                            >
                              Dispatch
                            </button>
                          )}
                          {t.status === "DISPATCHED" && (
                            <button
                              onClick={() => handleTransferAction(t.id, "RECEIVE")}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                            >
                              Receive at Dest
                            </button>
                          )}
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

        {/* Modal: Inter-Branch Stock Transfer (Jalod <-> Dahod Only) */}
        {isNewTransferOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Initiate Inter-Branch Transfer</h3>
                  <p className="text-xs text-slate-500">Between authorized Jalod & Dahod godowns only</p>
                </div>
                <button
                  onClick={() => setIsNewTransferOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {transferError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{transferError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTransfer} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Source Godown *</label>
                    <select
                      value={transferForm.sourceGodownId}
                      onChange={(e) => handleSourceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-navy-600"
                      required
                    >
                      {godowns.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Destination Godown *</label>
                    <select
                      value={transferForm.destinationGodownId}
                      onChange={(e) => setTransferForm({ ...transferForm, destinationGodownId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-navy-600"
                      required
                    >
                      {godowns
                        .filter((g) => g.id !== transferForm.sourceGodownId)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <strong className="text-slate-800 font-semibold">Strict Two-Godown Enforcement:</strong> Transfers are only allowed between Jalod and Dahod. Transferring stock from a godown to itself is prohibited.
                </div>

                {/* Transfer Items */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Products & Quantities *</label>
                  {transferForm.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const updated = [...transferForm.items];
                          updated[idx].productId = e.target.value;
                          setTransferForm({ ...transferForm, items: updated });
                        }}
                        className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                        required
                      >
                        <option value="">Select Product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — Available: {p.totalStock} {p.unit}
                          </option>
                        ))}
                      </select>

                      <div className="w-28 relative">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...transferForm.items];
                            updated[idx].quantity = parseFloat(e.target.value) || 1;
                            setTransferForm({ ...transferForm, items: updated });
                          }}
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono"
                          placeholder="Qty"
                        />
                      </div>

                      {transferForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = transferForm.items.filter((_, i) => i !== idx);
                            setTransferForm({ ...transferForm, items: updated });
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setTransferForm({
                        ...transferForm,
                        items: [...transferForm.items, { productId: products[0]?.id || "", quantity: 50 }],
                      });
                    }}
                    className="text-xs text-navy-800 hover:underline font-bold flex items-center"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Another Product
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Transfer Remarks / Notes</label>
                  <textarea
                    rows={2}
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                    placeholder="e.g. Inter-branch stock allocation for upcoming project requirements"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="dispatchNow"
                    checked={transferForm.dispatchImmediately}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, dispatchImmediately: e.target.checked })
                    }
                    className="rounded text-navy-900 focus:ring-navy-600 h-4 w-4"
                  />
                  <label htmlFor="dispatchNow" className="text-xs font-medium text-slate-700">
                    Dispatch immediately (Deduct stock from source godown upon creation)
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsNewTransferOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Submit Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Godown Detail Lots */}
        {selectedGodownDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{selectedGodownDetail.name}</h3>
                  <p className="text-xs text-slate-500">
                    Code: {selectedGodownDetail.code} • {selectedGodownDetail.city}, {selectedGodownDetail.location}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedGodownDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 max-h-96 overflow-y-auto">
                {/* Mobile Stock List in Modal */}
                <div className="block sm:hidden divide-y divide-slate-100">
                  {selectedGodownDetail.stocks?.map((st: any, i: number) => (
                    <div key={i} className="py-2 space-y-1">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-xs text-slate-800">{st.productName}</div>
                        <div className="font-bold text-xs text-emerald-700">{formatINR(st.valuation || 0)}</div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span className="font-mono bg-slate-100 px-1 rounded">{st.sku}</span>
                        <span className="font-medium text-slate-700">{Number(st.quantity || 0).toLocaleString("en-IN")} {st.unit} ({st.slabCount} slabs)</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Marble Product</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3 text-right">Available Area</th>
                        <th className="py-2.5 px-3 text-right">Slabs</th>
                        <th className="py-2.5 px-3 text-right">Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedGodownDetail.stocks?.map((st: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{st.productName}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{st.sku}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {Number(st.quantity || 0).toLocaleString("en-IN")} {st.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">{st.slabCount}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {formatINR(st.valuation || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedGodownDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function GodownsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading godowns...</div>}>
      <GodownsContent />
    </Suspense>
  );
}
