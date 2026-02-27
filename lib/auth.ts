// lib/auth.ts
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "./session";
import { cookies } from "next/headers";

// Cek password
export async function checkAdminPassword(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  return password === adminPassword;
}

// Untuk Server Components (Next.js 15/16: cookies() adalah async)
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Untuk API Route Handlers
export async function requireAuth(): Promise<boolean> {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    return session.isLoggedIn === true;
  } catch {
    return false;
  }
}
