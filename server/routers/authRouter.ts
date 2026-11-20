import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { registerUser, loginUser, getUserById, generateResetToken, resetPassword, changePassword, countUsers } from "../services/authService";
import { SignJWT, jwtVerify } from "jose";

import { createSessionToken, SESSION_COOKIE } from "../security/session";
import { safeUser } from "../security/policy";
import { revokeSessions, updateProfile } from "../services/authService";
const SESSION_EXPIRY = 24 * 60 * 60 * 1000;

export const authRouter = router({
me: publicProcedure.query(({ ctx }) => ctx.user ? safeUser(ctx.user) : null),
updateProfile: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(200) })).mutation(async ({ctx, input}) => {
  await updateProfile(ctx.user.id, input.name); return { success: true };
}),

register: publicProcedure
  .input(z.object({
    name: z.string().trim().max(200).min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().max(72).min(8, "Senha deve ter pelo menos 8 caracteres"),
  }))
  .mutation(async ({ input, ctx }) => {
    const result = await registerUser(input);
    if (!result.success || !result.user) {
      throw new TRPCError({ code: "BAD_REQUEST", message: result.error || "Erro ao registrar" });
    }
    
    return { success: true, pendingApproval: true };

  }),

login: publicProcedure
  .input(z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "Senha é obrigatória"),
  }))
  .mutation(async ({ input, ctx }) => {
    const result = await loginUser(input);
    if (!result.success || !result.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: result.error || "Credenciais inválidas" });
    }
    
    // Create session
    const token = await createSessionToken(result.user);
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_EXPIRY });
    
    // Return token for localStorage fallback (Safari iOS)
    return { success: true, user: safeUser(result.user), token };
  }),

logout: publicProcedure.mutation(async ({ ctx }) => {
  if (ctx.user) await revokeSessions(ctx.user.id);
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  ctx.res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
  return { success: true } as const;
}),

requestPasswordReset: publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    await generateResetToken(input.email);
    return { success: true, message: "Se o email existir, você receberá instruções de recuperação." };
  }),

resetPassword: publicProcedure
  .input(z.object({
    token: z.string(),
    password: z.string().max(72).min(8),
  }))
  .mutation(async ({ input }) => {
    const result = await resetPassword(input.token, input.password);
    if (!result.success) {
      throw new TRPCError({ code: "BAD_REQUEST", message: result.error || "Erro ao redefinir senha" });
    }
    return { success: true };
  }),

changePassword: protectedProcedure
  .input(z.object({
    currentPassword: z.string(),
    newPassword: z.string().max(72).min(8),
  }))
  .mutation(async ({ input, ctx }) => {
    const result = await changePassword(ctx.user.id, input.currentPassword, input.newPassword);
    if (!result.success) {
      throw new TRPCError({ code: "BAD_REQUEST", message: result.error || "Erro ao alterar senha" });
    }
    return { success: true };
  }),
});
