"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { BRANCH_CONFIGS, LocationCode, LOCATION_COOKIE } from "@/lib/location";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [location, setLocation] = useState<LocationCode>("JALOD");
  const [email, setEmail] = useState("admin@marutitraders.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Determine location from query or cookie
    const locParam = searchParams.get("location")?.toUpperCase();
    if (locParam === "JALOD" || locParam === "DAHOD") {
      setLocation(locParam as LocationCode);
      document.cookie = `${LOCATION_COOKIE}=${locParam}; path=/; max-age=2592000; SameSite=Lax`;
    } else if (locParam === "LODHA") {
      setLocation("JALOD");
      document.cookie = `${LOCATION_COOKIE}=JALOD; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      const match = document.cookie.match(new RegExp("(^| )" + LOCATION_COOKIE + "=([^;]+)"));
      const cookieLoc = match ? match[2].toUpperCase() : null;
      if (cookieLoc === "JALOD" || cookieLoc === "DAHOD") {
        setLocation(cookieLoc as LocationCode);
      } else if (cookieLoc === "LODHA") {
        setLocation("JALOD");
      }
    }
  }, [searchParams]);

  const branch = BRANCH_CONFIGS[location] || BRANCH_CONFIGS.JALOD;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const success = await login(email, password, location);
    if (!success) {
      setError("Invalid admin credentials. Please enter valid password.");
      setLoading(false);
    }
  }

  function handleChangeLocation() {
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-navy-950 flex flex-col justify-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8 relative overflow-hidden text-white">
      {/* Decorative Background Elements */}
      <div
        className={`absolute top-0 -left-4 w-96 h-96 ${
          location === "JALOD" ? "bg-emerald-500/10" : "bg-blue-600/10"
        } rounded-full blur-3xl pointer-events-none`}
      />
      <div
        className={`absolute bottom-0 -right-4 w-96 h-96 ${
          location === "JALOD" ? "bg-teal-500/10" : "bg-indigo-600/10"
        } rounded-full blur-3xl pointer-events-none`}
      />

      {/* Change Location Header Action */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 mb-2">
        <button
          onClick={handleChangeLocation}
          className="inline-flex items-center text-[11px] sm:text-xs font-semibold text-slate-400 hover:text-white transition group py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          <span>Change Location</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div
            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${
              location === "JALOD"
                ? "bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-950/60"
                : "bg-gradient-to-br from-blue-500 to-indigo-700 shadow-blue-950/60"
            } flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-xl`}
          >
            MT
          </div>
        </div>
        <h2 className="mt-3 sm:mt-4 text-center text-xl sm:text-3xl font-black text-white tracking-tight">
          MARUTI TRADERS
        </h2>
        <div className="mt-1.5 sm:mt-2 flex items-center justify-center space-x-2">
          <span
            className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full ${
              location === "JALOD"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
            }`}
          >
            {location === "JALOD" ? "Jalod Branch" : "Dahod Branch"}
          </span>
        </div>
        <p className="mt-1 text-center text-[11px] sm:text-xs text-slate-400">
          Admin Portal Login
        </p>
      </div>

      <div className="mt-5 sm:mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-10 shadow-2xl rounded-2xl border border-slate-200 text-slate-900">
          {/* Active Branch Minimal Pill (No Address, No City, No GSTIN) */}
          <div
            className={`p-2.5 sm:p-3 rounded-xl mb-4 sm:mb-5 flex items-center justify-between text-[11px] sm:text-xs ${
              location === "JALOD"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                : "bg-blue-50 border border-blue-200 text-blue-900"
            }`}
          >
            <div className="flex items-center space-x-2">
              <ShieldCheck
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                  location === "JALOD" ? "text-emerald-600" : "text-blue-600"
                }`}
              />
              <span className="font-bold">
                {location === "JALOD" ? "Jalod Branch" : "Dahod Branch"}
              </span>
            </div>
            <span
              className={`font-mono text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                location === "JALOD"
                  ? "bg-emerald-200/60 text-emerald-900"
                  : "bg-blue-200/60 text-blue-900"
              }`}
            >
              {location}
            </span>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form className="space-y-3.5 sm:space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                Admin Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@marutitraders.com"
                  className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                Admin Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-transparent rounded-xl shadow-md text-xs sm:text-sm font-bold text-white transition disabled:opacity-50 ${
                location === "JALOD"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/30"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-900/30"
              }`}
            >
              {loading ? "Authenticating..." : "Sign In as Admin"}
              <ArrowRight className="ml-1.5 sm:ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Info */}
          <div className="mt-5 pt-3 sm:mt-6 sm:pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-700">Role:</span> Admin Only
            </div>
            <div className="font-mono text-[10px] sm:text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
              admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
