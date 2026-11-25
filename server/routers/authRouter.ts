import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { registerUser, loginUser, generateResetToken, resetPassword, changePassword } from "../services/authService";

import { createSessionToken, SESSION_COOKIE } from "../security/session";
import { safeUser } from "../security/policy";
import { revokeSessions, updateProfile } from "../services/authService";
const SESSION_EXPIRY = 24 * 60 * 60 * 1000;

import { sendEmail } from "../services/emailService";
import { logger } from "../_core/logger";

function escapeHtml(raw: string): string {
  return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

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

requestAccess: publicProcedure
  .input(z.object({
    name: z.string().trim().min(2, "Informe seu nome completo").max(120),
    company: z.string().trim().min(2, "Informe o nome da empresa").max(160),
    email: z.string().trim().email("E-mail corporativo inválido").max(180),
    phone: z.string().trim().max(40).optional().default(""),
    demanda: z.string().trim().max(1200).optional().default(""),
  }))
  .mutation(async ({ input }) => {
    const targetEmail =
      process.env.ACCESS_REQUEST_EMAIL ||
      process.env.EMAIL_FROM_ADDRESS ||
      "contato@suppley.com.br";

    logger.info("Corporate access request received from landing/login", {
      company: input.company,
      email: input.email,
      hasPhone: Boolean(input.phone),
      hasDemanda: Boolean(input.demanda),
    });

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1B1523;">
        <div style="background:#311260;color:#FFFFFF;padding:20px 24px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;font-size:18px;">Nova Solicitação de Acesso · Excambia</h2>
          <p style="margin:6px 0 0;font-size:13px;color:#28E7C5;">SUPPLEY Importação Inteligente</p>
        </div>
        <div style="border:1px solid #E7E4DC;border-top:none;padding:24px;border-radius:0 0 12px 12px;background:#FAF9F6;">
          <p style="margin:0 0 14px;font-size:14px;">Uma empresa solicitou credenciais corporativas pela página de apresentação:</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;background:#FFFFFF;border:1px solid #E7E4DC;">
            <tr><td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #E7E4DC;width:36%;">Nome</td><td style="padding:10px 12px;border-bottom:1px solid #E7E4DC;">${escapeHtml(input.name)}</td></tr>
            <tr><td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #E7E4DC;">Empresa</td><td style="padding:10px 12px;border-bottom:1px solid #E7E4DC;">${escapeHtml(input.company)}</td></tr>
            <tr><td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #E7E4DC;">E-mail</td><td style="padding:10px 12px;border-bottom:1px solid #E7E4DC;">${escapeHtml(input.email)}</td></tr>
            <tr><td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #E7E4DC;">Telefone / WhatsApp</td><td style="padding:10px 12px;border-bottom:1px solid #E7E4DC;">${escapeHtml(input.phone || "Não informado")}</td></tr>
            <tr><td style="padding:10px 12px;font-weight:600;">Demanda / Simulação</td><td style="padding:10px 12px;">${escapeHtml(input.demanda || "Não informada")}</td></tr>
          </table>
        </div>
      </div>
    `;

    const text = [
      "Nova Solicitação de Acesso · SUPPLEY Excambia",
      `Nome: ${input.name}`,
      `Empresa: ${input.company}`,
      `E-mail: ${input.email}`,
      `Telefone: ${input.phone || "Não informado"}`,
      `Demanda: ${input.demanda || "Não informada"}`,
    ].join("\n");

    const emailResult = await sendEmail({
      to: targetEmail,
      replyTo: input.email,
      subject: `[SUPPLEY / Excambia] Solicitação de Acesso — ${input.company}`,
      html,
      text,
      tags: ["excambia-access-request"],
    });

    return {
      success: true,
      emailSent: emailResult.success,
    } as const;
  }),
});
