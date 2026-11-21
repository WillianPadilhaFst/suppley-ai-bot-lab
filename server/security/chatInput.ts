import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as conversations from "../db/conversaDb";
import { getOwnOperation } from "../services/publicOperations";
import { requireApproved, type Principal } from "./policy";
export const chatInput = z
  .object({
    conversaId: z.number().int().positive(),
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(12000),
          })
          .strict(),
      )
      .min(1)
      .max(60),
    operacaoId: z.number().int().positive().optional(),
    estagio: z.string().max(30).optional(),
    attachment: z
      .object({
        url: z.string().max(2048),
        name: z.string().max(255),
        mimeType: z.string().max(100),
        fileKey: z.string().max(1024).optional(),
      })
      .optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.messages.at(-1)?.role === "user" &&
      v.messages.reduce((n, m) => n + m.content.length, 0) <= 60000,
    "Mensagem inválida ou muito longa",
  );
export async function validateChat(
  user: Principal,
  input: z.infer<typeof chatInput>,
) {
  requireApproved(user);
  if (
    !(await conversations.conversaPertenceAoUsuario(input.conversaId, user.id))
  )
    throw new TRPCError({ code: "NOT_FOUND" });
  const conversation = await conversations.getConversa(
    input.conversaId,
    user.id,
  );
  const operationId = input.operacaoId ?? conversation.operacaoId ?? undefined;
  if (operationId) await getOwnOperation(user, operationId);
  if (
    input.operacaoId &&
    conversation.operacaoId &&
    input.operacaoId !== conversation.operacaoId
  )
    throw new TRPCError({ code: "BAD_REQUEST" });
  if (user.role === "public" && input.attachment)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Anexos não habilitados para este perfil.",
    });
  // Client replay is never authoritative. Rebuild history from owned server records.
  const history = conversation.mensagens
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-20)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 12000),
    }));
  return {
    ...input,
    operacaoId: operationId,
    messages: [...history, input.messages[input.messages.length - 1]],
  };
}
