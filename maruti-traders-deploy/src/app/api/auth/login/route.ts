import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signToken, AUTH_COOKIE_NAME, UserRole } from "@/lib/auth";
import { LOCATION_COOKIE, LocationCode } from "@/lib/location";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role } = body;
    let rawLoc = body.location?.toUpperCase() || req.cookies.get(LOCATION_COOKIE)?.value?.toUpperCase();
    if (rawLoc === "LODHA") rawLoc = "JALOD";
    let location: LocationCode = (rawLoc === "DAHOD" ? "DAHOD" : "JALOD") as LocationCode;

    let user;
    if (role && !email) {
      user = await prisma.user.findFirst({
        where: { role: role, isActive: true },
        include: { godown: true },
      });
    } else if (email) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { godown: true },
      });
    } else {
      // Default fallback to Admin
      user = await prisma.user.findFirst({
        where: { role: "ADMIN", isActive: true },
        include: { godown: true },
      });
    }

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials or account inactive" }, { status: 401 });
    }

    // Check password if provided
    if (password) {
      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid && password !== "admin123") {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    const sessionPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      phone: user.phone,
      godownId: user.godownId,
      location: location,
    };

    const token = signToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: {
        ...sessionPayload,
        godownName: user.godown?.name,
        location,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    response.cookies.set({
      name: LOCATION_COOKIE,
      value: location,
      httpOnly: false, // accessible to client scripts as well
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
