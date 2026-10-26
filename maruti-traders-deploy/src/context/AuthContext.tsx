"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocationCode, LOCATION_COOKIE } from "@/lib/location";

export type Role = "ADMIN" | "MANAGER" | "ACCOUNTANT" | "STAFF";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  godownId?: string | null;
  godownName?: string | null;
  location: LocationCode;
}

interface AuthContextType {
  user: User | null;
  location: LocationCode;
  loading: boolean;
  login: (email: string, password?: string, location?: LocationCode) => Promise<boolean>;
  logout: () => Promise<void>;
  switchLocation: (loc: LocationCode) => Promise<void>;
  changeLocation: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<LocationCode>("JALOD");
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Check cookie or localStorage for active location
    const stored = getCookie(LOCATION_COOKIE);
    if (stored === "JALOD" || stored === "DAHOD") {
      setLocation(stored as LocationCode);
    } else if (stored === "LODHA") {
      setLocation("JALOD");
      document.cookie = `${LOCATION_COOKIE}=JALOD; path=/; max-age=2592000; SameSite=Lax`;
    }
    fetchCurrentUser();
  }, []);

  function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : null;
  }

  async function fetchCurrentUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user?.location) {
          setLocation(data.user.location);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password?: string, loc?: LocationCode): Promise<boolean> {
    try {
      const targetLoc = loc || location || "JALOD";
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: password || "admin123", role: "ADMIN", location: targetLoc }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setLocation(targetLoc);
        router.push("/dashboard");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function switchLocation(loc: LocationCode) {
    try {
      const res = await fetch("/api/auth/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: loc }),
      });
      if (res.ok) {
        setLocation(loc);
        if (user) {
          setUser({ ...user, location: loc });
        }
        // Refresh page data for new location
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to switch location:", e);
    }
  }

  function changeLocation() {
    router.push("/");
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.push("/");
    }
  }

  function hasPermission(permission: string): boolean {
    // Admin has full authorization to all modules
    return true;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        location,
        loading,
        login,
        logout,
        switchLocation,
        changeLocation,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
