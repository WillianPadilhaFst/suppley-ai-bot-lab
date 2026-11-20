import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import type { Request } from "express";
import { getUserById } from "../services/authService";
import { requireApproved } from "./policy";
export const SESSION_COOKIE = "suppley_session";
export function sessionSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(secret);
}
export async function createSessionToken(user: {
  id: number;
  sessionVersion?: number;
}) {
  return new SignJWT({
    userId: user.id,
    sv: user.sessionVersion ?? 0,
    purpose: "session",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(sessionSecret());
}
export async function resolveSession(req: Request) {
  try {
    const bearer = req.headers.authorization;
    const token = bearer?.startsWith("Bearer ")
      ? bearer.slice(7)
      : parse(req.headers.cookie ?? "")[SESSION_COOKIE];
    if (!token) return null;
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ["HS256"],
    });
    if (!Number.isSafeInteger(payload.userId) || !payload.exp) return null;
    if (payload.purpose !== undefined && payload.purpose !== "session")
      return null;
    const user = await getUserById(payload.userId as number);
    requireApproved(user);
    if ((payload.sv ?? 0) !== (user!.sessionVersion ?? 0)) return null;
    return user;
  } catch {
    return null;
  }
}
