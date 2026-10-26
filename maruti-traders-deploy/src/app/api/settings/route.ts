export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest, isAuthorized } from "@/lib/auth";
import { getActiveLocationFromReq } from "@/lib/location-server";

export async function GET(req: NextRequest) {
  try {
    const location = getActiveLocationFromReq(req);
    const company = await prisma.companyProfile.findFirst({
      where: { location },
    }) || await prisma.companyProfile.findFirst();

    const users = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        godownId: true,
        godown: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const auditLogs = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json({ location, company, users, auditLogs });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    const location = getActiveLocationFromReq(req);
    if (session && !isAuthorized(session.role, "canManageSettings")) {
      return NextResponse.json({ error: "Forbidden: Settings restricted to Admin" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      tagline,
      address,
      city,
      state,
      pincode,
      phone,
      alternatePhone,
      email,
      gstin,
      pan,
      bankName,
      accountNumber,
      ifscCode,
      branch,
      upiId,
      termsAndConditions,
    } = body;

    const existing = await prisma.companyProfile.findFirst({ where: { location } });
    const companyId = existing?.id || (location === "DAHOD" ? "cmvj8fn2p0001arg5cw37fz9m" : "maruti_traders_main");

    const updated = await prisma.companyProfile.upsert({
      where: { id: companyId },
      create: {
        id: companyId,
        location,
        name,
        tagline,
        address,
        city,
        state,
        pincode,
        phone,
        alternatePhone,
        email,
        gstin,
        pan,
        bankName,
        accountNumber,
        ifscCode,
        branch,
        upiId,
        termsAndConditions,
      },
      update: {
        name,
        tagline,
        address,
        city,
        state,
        pincode,
        phone,
        alternatePhone,
        email,
        gstin,
        pan,
        bankName,
        accountNumber,
        ifscCode,
        branch,
        upiId,
        termsAndConditions,
      },
    });

    return NextResponse.json({ success: true, company: updated });
  } catch (error: any) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
