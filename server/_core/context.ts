import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { resolveSession } from "../security/session";
import { requireApproved } from "../security/policy";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user = await resolveSession(opts.req);
  if (!user && !opts.req.headers.authorization) {
    try { const candidate = await sdk.authenticateRequest(opts.req); requireApproved(candidate); user = candidate; } catch { user = null; }
  }
  return { req: opts.req, res: opts.res, user };
}
