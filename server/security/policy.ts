import { TRPCError } from "@trpc/server";

export type Principal = {
  id: number;
  role: string;
  approvalStatus?: string;
  sessionVersion?: number;
};
export function requireApproved(
  user: Principal | null | undefined,
): asserts user is Principal {
  if (
    !user ||
    !["admin", "user", "public"].includes(user.role) ||
    (user.approvalStatus && user.approvalStatus !== "approved") ||
    (user.role === "public" && user.approvalStatus !== "approved")
  ) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Acesso não autorizado ou aguardando aprovação.",
    });
  }
}
export const anonymousPaths = new Set([
  "auth.me",
  "auth.login",
  "auth.register",
  "auth.logout",
  "auth.requestPasswordReset",
  "auth.resetPassword",
]);
export const publicPaths = new Set([
  ...Array.from(anonymousPaths),
  "auth.changePassword",
  "auth.updateProfile",
  "quoteRequests.mine",
  "portal.list",
  "portal.get",
  "portal.create",
  "conversas.list",
  "conversas.get",
  "conversas.create",
  "conversas.rename",
  "conversas.setPinned",
  "conversas.archive",
  "conversas.delete",
  "conversas.remove",
  "conversas.linkOperacao",
  "conversas.getOrCreateForOperacao",
  "conversas.send",
]);
export function authorizePath(user: Principal | null, path: string) {
  if (!user && anonymousPaths.has(path)) return;
  requireApproved(user);
  if (user.role === "public" && !publicPaths.has(path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Recurso não autorizado.",
    });
  }
}
// Explicit allowlist: adding an internal tool never grants public access.
export const publicToolNames = new Set([
  "consultar_minhas_operacoes",
  "criar_minha_operacao",
  "calcular_cubagem",
  "solicitar_cotacao",
  "consultar_minhas_solicitacoes",
]);
export function authorizeTool(user: Principal, name: string) {
  requireApproved(user);
  if (user.role === "public" && !publicToolNames.has(name)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Ferramenta não autorizada.",
    });
  }
}
export function safeUser<
  T extends {
    id: number;
    name: string | null;
    email: string | null;
    role: string;
    loginMethod: string;
    createdAt: Date;
  },
>(u: T) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    loginMethod: u.loginMethod,
    createdAt: u.createdAt,
  };
}
