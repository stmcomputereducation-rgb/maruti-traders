import { NextRequest, NextResponse } from "next/server";
import { LOCATION_COOKIE, LocationCode } from "@/lib/location";
import { getSessionUserFromRequest, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let targetLoc = body.location?.toUpperCase();
    if (targetLoc === "LODHA") targetLoc = "JALOD";

    if (targetLoc !== "JALOD" && targetLoc !== "DAHOD") {
      return NextResponse.json({ error: "Invalid location. Must be JALOD or DAHOD." }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      location: targetLoc,
    });

    response.cookies.set({
      name: LOCATION_COOKIE,
      value: targetLoc,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    // If already logged in, update session token's location
    const session = getSessionUserFromRequest(req);
    if (session) {
      const updatedSession = {
        ...session,
        location: targetLoc,
      };
      const token = signToken(updatedSession);
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}
