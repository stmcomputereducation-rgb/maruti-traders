"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowRightLeft,
  Receipt,
  ShoppingCart,
  Users,
  Truck,
  BookOpen,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  MapPin,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { BRANCH_CONFIGS, LocationCode } from "@/lib/location";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Inventory & Stock",
    href: "/inventory",
    icon: Package,
  },
  {
    name: "Godowns",
    href: "/godowns",
    icon: Warehouse,
  },
  {
    name: "Stock Transfers",
    href: "/godowns?tab=transfers",
    icon: ArrowRightLeft,
  },
  {
    name: "Sales & Invoices",
    href: "/sales",
    icon: Receipt,
  },
  {
    name: "Purchases",
    href: "/purchases",
    icon: ShoppingCart,
  },
  {
    name: "Khata Book / Ledger",
    href: "/khata",
    icon: BookOpen,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    name: "Suppliers",
    href: "/suppliers",
    icon: Truck,
  },
  {
    name: "Financial Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: CreditCard,
  },
  {
    name: "Company Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, location, switchLocation, changeLocation, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const activeBranch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Logo & Business Name (MT icon removed, Lodha badge on left) */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>

            <Link href="/dashboard" className="flex items-center space-x-2 group">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm sm:text-lg tracking-wide text-white whitespace-nowrap">MARUTI TRADERS</span>
                  <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-500/30 font-bold whitespace-nowrap">
                    {location}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block whitespace-nowrap">Premium Marble & Granite Trading</p>
              </div>
            </Link>
          </div>

          {/* Spacer: ensures Lodha location is kept far away with clear distance from Admin */}
          <div className="flex-1"></div>

          {/* Center: Active Branch Pill with Location Switcher (Desktop) */}
          <div className="relative hidden md:block shrink-0">
            <button
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold border transition ${
                location === "JALOD"
                  ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80"
                  : "bg-blue-950/70 border-blue-500/50 text-blue-300 hover:bg-blue-900/80"
              }`}
              title="Click to Switch Location"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xl:inline">📍 {activeBranch.name}</span>
              <span className="xl:hidden">📍 {activeBranch.code} Branch</span>
              <span className="text-[10px] opacity-75 font-mono hidden 2xl:inline">({activeBranch.gstin})</span>
              <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
            </button>

            {locationDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 text-slate-800 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Select Active Location
                  </p>
                  <p className="text-[10px] text-slate-400">Data is strictly separated by branch</p>
                </div>
                {(["JALOD", "DAHOD"] as LocationCode[]).map((loc) => {
                  const b = BRANCH_CONFIGS[loc];
                  const isCurrent = location === loc;
                  return (
                    <button
                      key={loc}
                      onClick={async () => {
                        await switchLocation(loc);
                        setLocationDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                        isCurrent ? "font-bold bg-slate-50 text-slate-900" : "text-slate-600"
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              loc === "JALOD" ? "bg-emerald-500" : "bg-blue-500"
                            }`}
                          />
                          <span className="font-bold">{b.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{b.address}</p>
                      </div>
                      {isCurrent && (
                        <span className="text-emerald-600 text-[11px] font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Header Actions: STRICTLY ONLY "ADMIN" */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Top-Right Corner: ONLY "Admin" with badge and dropdown */}
            <div className="relative">
              <button
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition shadow-sm"
                aria-label="Admin Profile and Settings"
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-purple-600 flex items-center justify-center text-white">
                  <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>
                <span>Admin</span>
                <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />
              </button>

              {adminDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 text-slate-800 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">Administrator</p>
                    <p className="text-[11px] text-slate-500">Active: {activeBranch.code} Branch</p>
                  </div>

                  <button
                    onClick={() => {
                      setAdminDropdownOpen(false);
                      changeLocation();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    <span>Change Location</span>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={async () => {
                      setAdminDropdownOpen(false);
                      await logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-500" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Body - Fluid Responsive Screen Spanning */}
      <div className="flex-1 flex w-full px-2.5 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-5 gap-3 lg:gap-4 xl:gap-6 min-w-0">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block lg:w-56 xl:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-3 sticky top-24">
            {/* Active Branch Display */}
            <div
              className={`px-3 py-2.5 mb-3 rounded-lg border ${
                location === "JALOD"
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-blue-50/70 border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center space-x-1.5">
                  <Building2
                    className={`h-4 w-4 ${
                      location === "JALOD" ? "text-emerald-600" : "text-blue-600"
                    }`}
                  />
                  <span>Active Location</span>
                </span>
                <button
                  onClick={changeLocation}
                  className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline"
                >
                  Change
                </button>
              </div>
              <p
                className={`text-xs font-black mt-1 ${
                  location === "JALOD" ? "text-emerald-900" : "text-blue-900"
                }`}
              >
                {activeBranch.name}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{activeBranch.address}</p>
            </div>

            {/* Sidebar Navigation Items - English Only */}
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href.includes("?tab=") && pathname === item.href.split("?")[0]);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? "text-emerald-400" : "text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Branch GST & Currency Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 px-3 text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Branch GSTIN:</span>
                <span className="font-mono font-bold text-slate-800">{activeBranch.gstin}</span>
              </div>
              <div className="flex justify-between">
                <span>Currency:</span>
                <span className="font-medium text-slate-700">INR (₹) / DD-MM-YYYY</span>
              </div>
              <div className="flex justify-between">
                <span>State:</span>
                <span className="font-medium text-slate-700">{activeBranch.state}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-64 max-w-[85vw] bg-white h-full shadow-2xl p-3.5 flex flex-col z-50">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                <span className="font-bold text-slate-900 text-base">Maruti Traders</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-500 hover:text-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Active Location Badge */}
              <div className="my-2.5 p-2 rounded-lg bg-slate-100 text-[11px]">
                <p className="font-bold text-slate-800">Branch: {activeBranch.name}</p>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    changeLocation();
                  }}
                  className="text-[11px] text-blue-600 font-bold mt-0.5 underline"
                >
                  Change Branch
                </button>
              </div>

              <nav className="mt-1 space-y-0.5 overflow-y-auto flex-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold ${
                        isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-2.5 border-t border-slate-200">
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold text-rose-600 bg-rose-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area - Fluid min-w-0 to avoid overflow */}
        <main className="flex-1 min-w-0 max-w-full overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
