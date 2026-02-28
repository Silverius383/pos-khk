// proxy.ts  (Next.js 16+, menggantikan middleware.ts)
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "./lib/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Izinkan path publik
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cek session
  const response = NextResponse.next();
  try {
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    if (!session.isLoggedIn) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    if (!pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return response; // ← return response instead of NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
