import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "maruti_traders_super_secret_jwt_key_2026";
export const AUTH_COOKIE_NAME = "maruti_auth_token";

export type UserRole = "ADMIN" | "MANAGER" | "ACCOUNTANT" | "STAFF";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  godownId?: string | null;
  location?: "JALOD" | "DAHOD" | "LODHA";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function getSessionUserFromRequest(req: NextRequest): SessionUser | null {
  try {
    const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const token = cookieToken || bearerToken;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export const ROLE_PERMISSIONS: Record<UserRole, {
  canManageUsers: boolean;
  canViewSalaries: boolean;
  canManageSettings: boolean;
  canManageGodowns: boolean;
  canManageProducts: boolean;
  canManageTransfers: boolean;
  canManageSales: boolean;
  canManagePurchases: boolean;
  canManageKhata: boolean;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canDeleteRecords: boolean;
}> = {
  ADMIN: {
    canManageUsers: true,
    canViewSalaries: true,
    canManageSettings: true,
    canManageGodowns: true,
    canManageProducts: true,
    canManageTransfers: true,
    canManageSales: true,
    canManagePurchases: true,
    canManageKhata: true,
    canManageExpenses: true,
    canViewReports: true,
    canDeleteRecords: true,
  },
  MANAGER: {
    canManageUsers: false,
    canViewSalaries: false,
    canManageSettings: false,
    canManageGodowns: true,
    canManageProducts: true,
    canManageTransfers: true,
    canManageSales: true,
    canManagePurchases: true,
    canManageKhata: true,
    canManageExpenses: true,
    canViewReports: true,
    canDeleteRecords: false,
  },
  ACCOUNTANT: {
    canManageUsers: false,
    canViewSalaries: false,
    canManageSettings: false,
    canManageGodowns: false,
    canManageProducts: false,
    canManageTransfers: false,
    canManageSales: true,
    canManagePurchases: true,
    canManageKhata: true,
    canManageExpenses: true,
    canViewReports: true,
    canDeleteRecords: false,
  },
  STAFF: {
    canManageUsers: false,
    canViewSalaries: false,
    canManageSettings: false,
    canManageGodowns: false,
    canManageProducts: false,
    canManageTransfers: false,
    canManageSales: true,
    canManagePurchases: false,
    canManageKhata: false,
    canManageExpenses: false,
    canViewReports: false,
    canDeleteRecords: false,
  },
};

export function isAuthorized(role: UserRole, permission: keyof typeof ROLE_PERMISSIONS["ADMIN"]): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}
