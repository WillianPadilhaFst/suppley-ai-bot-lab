import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

import { authorizePath } from "../security/policy";
import { audit, consumeLimit } from "../security/abuse";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
const baseProcedure = t.procedure.use(async ({ ctx, path, next }) => {
  try { authorizePath(ctx.user, path); } catch (e) {
    await audit(ctx.user?.id ?? null, path, "denied"); throw e;
  }
  if (path.startsWith("auth.") && path !== "auth.me" && path !== "auth.logout") {
    await consumeLimit(`auth:${ctx.req.ip ?? "unknown"}`, 20, 60000);
  }
  if (ctx.user?.role === "public") await consumeLimit(`api:${ctx.user.id}`, 120, 60000);
  return next();
});
export const publicProcedure = baseProcedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = baseProcedure.use(requireUser);

export const adminProcedure = baseProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
