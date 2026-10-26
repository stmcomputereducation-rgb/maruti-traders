export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActiveLocationFromReq } from "@/lib/location-server";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    const location = getActiveLocationFromReq(req);

    if (!session) {
      // Default to Admin in development demo mode if no token exists yet
      const defaultAdmin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        include: { godown: true },
      });
      if (defaultAdmin) {
        return NextResponse.json({
          user: {
            id: defaultAdmin.id,
            name: "Admin",
            email: defaultAdmin.email,
            role: "ADMIN",
            phone: defaultAdmin.phone,
            godownId: defaultAdmin.godownId,
            godownName: defaultAdmin.godown?.name,
            location: location,
          },
        });
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.id },
      include: { godown: true },
    });

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: "Admin",
        email: dbUser.email,
        role: "ADMIN", // Enforce Admin role
        phone: dbUser.phone,
        godownId: dbUser.godownId,
        godownName: dbUser.godown?.name,
        location: session.location || location,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
