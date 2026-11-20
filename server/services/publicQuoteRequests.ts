import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicQuoteRequests, users } from "../../drizzle/schema";
import { getDb } from "../db/connection";
import { requireApproved, type Principal } from "../security/policy";
import { audit, consumeLimit } from "../security/abuse";
import { conversaPertenceAoUsuario } from "../db/conversaDb";
import { getOwnOperation } from "./publicOperations";
export const quoteRequestInput = z
  .object({
    produto: z.string().trim().min(2).max(255),
    especificacoes: z.string().trim().min(2).max(6000),
    quantidade: z
      .string()
      .trim()
      .regex(/^\d{1,12}([.,]\d{1,6})?$/)
      .refine(
        (v) => Number(v.replace(",", ".")) > 0,
        "Quantidade deve ser positiva",
      ),
    unidade: z.string().trim().min(1).max(30),
    destinoCidade: z.string().trim().min(2).max(120),
    destinoUf: z.enum([
      "AC",
      "AL",
      "AP",
      "AM",
      "BA",
      "CE",
      "DF",
      "ES",
      "GO",
      "MA",
      "MT",
      "MS",
      "MG",
      "PA",
      "PB",
      "PR",
      "PE",
      "PI",
      "RJ",
      "RN",
      "RS",
      "RO",
      "RR",
      "SC",
      "SP",
      "SE",
      "TO",
    ]),
    prazoDesejado: z.string().trim().min(2).max(120),
  })
  .strict();
// Explicit projection: never return identity bindings or future internal columns.
const fields = {
  id: publicQuoteRequests.id,
  produto: publicQuoteRequests.produto,
  especificacoes: publicQuoteRequests.especificacoes,
  quantidade: publicQuoteRequests.quantidade,
  unidade: publicQuoteRequests.unidade,
  destinoCidade: publicQuoteRequests.destinoCidade,
  destinoUf: publicQuoteRequests.destinoUf,
  prazoDesejado: publicQuoteRequests.prazoDesejado,
  status: publicQuoteRequests.status,
  operacaoId: publicQuoteRequests.operacaoId,
  criadaEm: publicQuoteRequests.criadaEm,
};
function database() {
  const db = getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
  return db;
}
export async function listOwnQuoteRequests(user: Principal) {
  requireApproved(user);
  return database()
    .select(fields)
    .from(publicQuoteRequests)
    .where(eq(publicQuoteRequests.userId, user.id))
    .orderBy(desc(publicQuoteRequests.criadaEm))
    .limit(100);
}
export async function submitQuoteRequest(
  user: Principal,
  raw: unknown,
  conversaId: number,
) {
  requireApproved(user);
  const input = quoteRequestInput.parse(raw);
  if (
    !Number.isSafeInteger(conversaId) ||
    !(await conversaPertenceAoUsuario(conversaId, user.id))
  )
    throw new TRPCError({ code: "NOT_FOUND" });
  const requestKey = createHash("sha256")
    .update(JSON.stringify([user.id, conversaId, input]))
    .digest("hex");
  const db = database();
  const condition = and(
    eq(publicQuoteRequests.userId, user.id),
    eq(publicQuoteRequests.requestKey, requestKey),
  );
  const [existing] = await db
    .select(fields)
    .from(publicQuoteRequests)
    .where(condition)
    .limit(1);
  if (existing) return existing;
  await consumeLimit(`quote-request:${user.id}`, 10, 86400000);
  await audit(user.id, "quote-request.submit", "requested");
  await db
    .insert(publicQuoteRequests)
    .values({ ...input, userId: user.id, requestKey, conversaId })
    .onDuplicateKeyUpdate({ set: { requestKey } });
  const [saved] = await db
    .select(fields)
    .from(publicQuoteRequests)
    .where(condition)
    .limit(1);
  if (!saved) throw new Error("Solicitação indisponível");
  return saved;
}
function requireAdmin(user: Principal) {
  requireApproved(user);
  if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}
export async function listQuoteInbox(user: Principal) {
  requireAdmin(user);
  return database()
    .select({
      ...fields,
      userId: publicQuoteRequests.userId,
      conversaId: publicQuoteRequests.conversaId,
      clienteNome: users.name,
      clienteEmail: users.email,
    })
    .from(publicQuoteRequests)
    .leftJoin(users, eq(users.id, publicQuoteRequests.userId))
    .orderBy(desc(publicQuoteRequests.criadaEm))
    .limit(100);
}
export async function reviewQuoteRequest(
  user: Principal,
  id: number,
  status: "em_analise" | "encerrada",
) {
  requireAdmin(user);
  const db = database();
  const [row] = await db
    .select({ id: publicQuoteRequests.id })
    .from(publicQuoteRequests)
    .where(eq(publicQuoteRequests.id, id))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  await audit(user.id, "quote-request.review", "requested");
  await db
    .update(publicQuoteRequests)
    .set({ status })
    .where(eq(publicQuoteRequests.id, id));
  return { success: true };
}
export async function linkQuoteOperation(
  user: Principal,
  id: number,
  operacaoId: number,
) {
  requireAdmin(user);
  const db = database();
  const [row] = await db
    .select({ userId: publicQuoteRequests.userId })
    .from(publicQuoteRequests)
    .where(eq(publicQuoteRequests.id, id))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  // Even administrators may only link an operation belonging to this client.
  await getOwnOperation(
    { id: row.userId, role: "admin", approvalStatus: "approved" },
    operacaoId,
  );
  await audit(user.id, "quote-request.link", "requested");
  await db
    .update(publicQuoteRequests)
    .set({ operacaoId, status: "vinculada" })
    .where(eq(publicQuoteRequests.id, id));
  return { success: true };
}
