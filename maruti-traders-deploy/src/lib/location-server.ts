import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, AUTH_COOKIE_NAME } from "./auth";
import { LocationCode, LOCATION_COOKIE } from "./location";

function normalizeLocation(val?: string | null): LocationCode | null {
  if (!val) return null;
  const upper = val.toUpperCase().trim();
  if (upper === "JALOD") return "JALOD";
  if (upper === "DAHOD") return "DAHOD";
  if (upper === "LODHA") return "JALOD"; // Backward compatibility
  return null;
}

/**
 * Extracts the active business location ("JALOD" or "DAHOD") from an API request.
 * Checks query param -> headers -> cookies -> auth token session.
 */
export function getActiveLocationFromReq(req: NextRequest): LocationCode {
  // 1. Query parameter
  const searchParam = normalizeLocation(req.nextUrl?.searchParams?.get("location"));
  if (searchParam) return searchParam;

  // 2. Custom header
  const header = normalizeLocation(req.headers.get("x-maruti-location"));
  if (header) return header;

  // 3. Cookie
  const cookieLoc = normalizeLocation(req.cookies.get(LOCATION_COOKIE)?.value);
  if (cookieLoc) return cookieLoc;

  // 4. Session auth token
  const authCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (authCookie) {
    const session = verifyToken(authCookie);
    const sessionLoc = normalizeLocation(session?.location);
    if (sessionLoc) return sessionLoc;
  }

  // Default to Jalod
  return "JALOD";
}

/**
 * Helper to get active location in Server Components
 */
export async function getServerLocation(): Promise<LocationCode> {
  try {
    const cookieStore = cookies();
    const loc = normalizeLocation(cookieStore.get(LOCATION_COOKIE)?.value);
    if (loc) return loc;
  } catch {}
  return "JALOD";
}
