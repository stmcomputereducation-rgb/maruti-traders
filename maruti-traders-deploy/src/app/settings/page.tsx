"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import {
  Settings,
  Building2,
  ShieldCheck,
  Save,
  Download,
  Lock,
  Phone,
  Mail,
  CheckCircle,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { BRANCH_CONFIGS, LocationCode } from "@/lib/location";

export default function SettingsPage() {
  const { location, changeLocation } = useAuth();
  const branch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"company" | "backup">("company");

  useEffect(() => {
    fetchSettings();
  }, [location]);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const d = await res.json();
        setCompany(d.company || {
          name: branch.name,
          tagline: branch.tagline,
          address: branch.address,
          city: branch.city,
          state: branch.state,
          pincode: "327001",
          phone: branch.phone,
          gstin: branch.gstin,
          pan: branch.pan,
          bankName: "ICICI Bank Ltd.",
          accountNumber: "023405009876",
          ifscCode: "ICIC0000234",
          branch: branch.city,
          upiId: `marutitraders.${location.toLowerCase()}@icici`,
          termsAndConditions: "1. Goods once sold will not be taken back.\n2. Marble is natural stone; variation is normal.\n3. Subject to local jurisdiction only.",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      if (res.ok) {
        alert("Branch settings and tax profile saved successfully!");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update settings");
      }
    } catch {
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !company) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-slate-500 text-sm">Loading branch settings...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate whitespace-nowrap">Branch & System Settings</h1>
              <span className="bg-emerald-50 text-emerald-800 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 whitespace-nowrap">
                📍 {branch.name}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate whitespace-nowrap">
              Configure profile, GSTIN, bank details, and invoice terms for {branch.state} operations
            </p>
          </div>

          <button
            onClick={changeLocation}
            className="inline-flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border border-slate-300 transition self-start sm:self-auto shrink-0 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
            <span>Switch Location</span>
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex space-x-1.5 sm:space-x-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("company")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center space-x-1.5 sm:space-x-2 ${
              activeTab === "company"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Branch Profile & Tax</span>
          </button>

          <button
            onClick={() => setActiveTab("backup")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center space-x-1.5 sm:space-x-2 ${
              activeTab === "backup"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Security & Isolation</span>
          </button>
        </div>

        {/* Tab 1: Company Profile Form */}
        {activeTab === "company" && (
          <form onSubmit={handleSaveCompany} className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-3 sm:space-y-4">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 pb-2 border-b border-slate-200">
                Business & Tax Details (Prints on Invoices)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-slate-700">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={company.name || ""}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-slate-700">Business Tagline</label>
                  <input
                    type="text"
                    value={company.tagline || ""}
                    onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-xs font-semibold text-slate-700">Business Address</label>
                  <input
                    type="text"
                    value={company.address || ""}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-slate-700">City & State</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input
                      type="text"
                      value={company.city || ""}
                      onChange={(e) => setCompany({ ...company, city: e.target.value })}
                      className="border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-slate-900"
                    />
                    <input
                      type="text"
                      value={company.state || ""}
                      onChange={(e) => setCompany({ ...company, state: e.target.value })}
                      className="border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-slate-700">Pincode</label>
                  <input
                    type="text"
                    value={company.pincode || ""}
                    onChange={(e) => setCompany({ ...company, pincode: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Branch Phone *</label>
                  <input
                    type="text"
                    required
                    value={company.phone || ""}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Branch GSTIN *</label>
                  <input
                    type="text"
                    required
                    value={company.gstin || ""}
                    onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Branch PAN</label>
                  <input
                    type="text"
                    value={company.pan || ""}
                    onChange={(e) => setCompany({ ...company, pan: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Bank Information for Invoices */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-200">
                Bank Details & Instant UPI ID (Printed on All Invoices)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Bank Name</label>
                  <input
                    type="text"
                    value={company.bankName || ""}
                    onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Account Number</label>
                  <input
                    type="text"
                    value={company.accountNumber || ""}
                    onChange={(e) => setCompany({ ...company, accountNumber: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">IFSC Code</label>
                  <input
                    type="text"
                    value={company.ifscCode || ""}
                    onChange={(e) => setCompany({ ...company, ifscCode: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">UPI ID / VPA</label>
                  <input
                    type="text"
                    value={company.upiId || ""}
                    onChange={(e) => setCompany({ ...company, upiId: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-emerald-700 font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Default Invoice Terms & Conditions
                  </label>
                  <textarea
                    rows={3}
                    value={company.termsAndConditions || ""}
                    onChange={(e) => setCompany({ ...company, termsAndConditions: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Security & Database Isolation */}
        {activeTab === "backup" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-200">
              Location-Level Data Isolation & Integrity
            </h3>
            <p className="text-xs text-slate-600">
              Maruti Traders operates with strict backend and database isolation between the Jalod and Dahod branches.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-slate-900">Current Session Location</p>
                <p className="text-emerald-700 font-bold">{branch.name}</p>
                <p className="text-slate-500">State: {branch.state} • GSTIN: {branch.gstin}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-slate-900">Security Architecture</p>
                <p className="text-slate-700">Location queries enforced on SQLite / Prisma layer</p>
                <p className="text-slate-500">Role: Administrator Only</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
