// lib/session.ts
import { SessionOptions } from "iron-session";

export interface SessionData {
  isLoggedIn: boolean;
  loginAt?: string;
}

export const sessionOptions: SessionOptions = {
  // Fallback agar tidak crash saat SESSION_SECRET belum diisi
  password: process.env.SESSION_SECRET || "default-dev-secret-please-change-in-production-!!",
  cookieName: "pos_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
    httpOnly: true,
    sameSite: "lax",
  },
};
