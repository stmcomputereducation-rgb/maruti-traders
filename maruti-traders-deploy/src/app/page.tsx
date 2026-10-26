"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { BRANCH_CONFIGS, LocationCode, LOCATION_COOKIE } from "@/lib/location";

export default function LocationSelectionPage() {
  const router = useRouter();

  function handleSelectLocation(loc: LocationCode) {
    // Set cookie on client
    document.cookie = `${LOCATION_COOKIE}=${loc}; path=/; max-age=2592000; SameSite=Lax`;
    // Navigate to location-specific Admin login
    router.push(`/login?location=${loc}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-navy-950 flex flex-col justify-between py-6 sm:py-10 px-3 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between pb-4 sm:pb-6 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-lg sm:text-2xl text-white shadow-lg shadow-emerald-950/50">
            MT
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-wider text-white">MARUTI TRADERS</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Marble Trading & Granite Business ERP</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-[10px] sm:text-xs text-slate-400 bg-slate-800/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-slate-700/60">
          <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
          <span className="hidden xs:inline">Location-Isolated Enterprise System</span>
          <span className="xs:hidden">Enterprise ERP</span>
        </div>
      </header>

      {/* Central Selection Section */}
      <main className="relative z-10 max-w-5xl mx-auto w-full my-auto py-5 sm:py-8">
        <div className="text-center mb-6 sm:mb-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2 sm:mb-3">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Multi-Location Business Portal
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            MARUTI TRADERS
          </h2>
          <p className="mt-2 sm:mt-3 text-sm sm:text-lg text-slate-300 max-w-xl mx-auto whitespace-nowrap">
            Select Your Location to Continue
          </p>
          <p className="text-[11px] sm:text-sm text-slate-400 mt-1 max-w-md mx-auto truncate whitespace-nowrap">
            Independent inventories, invoices, and ledgers per branch
          </p>
        </div>

        {/* 2 Location Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 max-w-4xl mx-auto">
          {/* Card 1: JALOD */}
          <div
            onClick={() => handleSelectLocation("JALOD")}
            className="group relative bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-700/80 hover:border-emerald-500/80 shadow-2xl hover:shadow-emerald-900/30 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

            <div>
              {/* Marble Graphic Banner */}
              <div className="w-full h-32 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6 relative border border-slate-800 bg-slate-950 flex items-center justify-center">
                <img
                  src={BRANCH_CONFIGS.JALOD.heroImage}
                  alt="Jalod Italian Marble Slabs"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              </div>

              {/* Title & Badge */}
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white group-hover:text-emerald-300 transition-colors whitespace-nowrap">
                  JALOD
                </h3>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 whitespace-nowrap">
                  Branch 01
                </span>
              </div>

              <p className="text-xs sm:text-sm text-emerald-400/90 font-medium mb-3 sm:mb-4 truncate whitespace-nowrap">
                {BRANCH_CONFIGS.JALOD.tagline}
              </p>

              <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs text-slate-300 mb-4 sm:mb-6 border-t border-slate-800/80 pt-3 sm:pt-4">
                <div className="flex items-center space-x-2 text-slate-300 font-medium min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 shrink-0" />
                  <span className="truncate whitespace-nowrap">Statuario, Makrana White, Italian Quartzite</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400 min-w-0">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
                  <span className="truncate whitespace-nowrap">Imported Slabs, Onyx Stone & Italian Marble</span>
                </div>
              </div>
            </div>

            {/* Enter Button */}
            <button
              type="button"
              className="w-full py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2 transition-all transform group-hover:translate-y-[-2px] whitespace-nowrap"
            >
              <span>Enter Jalod</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: DAHOD */}
          <div
            onClick={() => handleSelectLocation("DAHOD")}
            className="group relative bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-700/80 hover:border-blue-500/80 shadow-2xl hover:shadow-blue-900/30 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-bl-full pointer-events-none group-hover:bg-blue-500/20 transition-all" />

            <div>
              {/* Marble Graphic Banner */}
              <div className="w-full h-32 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6 relative border border-slate-800 bg-slate-950 flex items-center justify-center">
                <img
                  src={BRANCH_CONFIGS.DAHOD.heroImage}
                  alt="Dahod Granite and Marble Slabs"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              </div>

              {/* Title & Badge */}
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white group-hover:text-blue-300 transition-colors whitespace-nowrap">
                  DAHOD
                </h3>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 whitespace-nowrap">
                  Branch 02
                </span>
              </div>

              <p className="text-xs sm:text-sm text-blue-400/90 font-medium mb-3 sm:mb-4 truncate whitespace-nowrap">
                {BRANCH_CONFIGS.DAHOD.tagline}
              </p>

              <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs text-slate-300 mb-4 sm:mb-6 border-t border-slate-800/80 pt-3 sm:pt-4">
                <div className="flex items-center space-x-2 text-slate-300 font-medium min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 shrink-0" />
                  <span className="truncate whitespace-nowrap">Black Galaxy Granite, Alaska White, Katni</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400 min-w-0">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 shrink-0" />
                  <span className="truncate whitespace-nowrap">Indian Natural Stones & Composite Slabs</span>
                </div>
              </div>
            </div>

            {/* Enter Button */}
            <button
              type="button"
              className="w-full py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/40 flex items-center justify-center space-x-2 transition-all transform group-hover:translate-y-[-2px] whitespace-nowrap"
            >
              <span>Enter Dahod</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full pt-4 sm:pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[10px] sm:text-xs text-slate-400 gap-2">
        <p>© 2026 Maruti Traders. All rights reserved. Indian INR (₹) • DD-MM-YYYY</p>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <span>Database Protected</span>
          <span>•</span>
          <span>Role: Admin Only</span>
          <span>•</span>
          <span>Secure Marble ERP</span>
        </div>
      </footer>
    </div>
  );
}
