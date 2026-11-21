import { and, eq, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  operacoes,
  operacaoMarcos,
  operacaoEventos,
} from "../../drizzle/schema";
import { getDb } from "../db/connection";
import { requireApproved, type Principal } from "../security/policy";
import { audit, consumeLimit } from "../security/abuse";
import { createOperacao } from "./operacaoService";
// SQL projection is deliberately independent of the internal operation DTO.
const fields = {
  id: operacoes.id,
  codigo: operacoes.codigo,
  titulo: operacoes.titulo,
  status: operacoes.status,
  estagioAtual: operacoes.estagioAtual,
  prazoDesejado: operacoes.prazoDesejado,
  trackingEta: operacoes.trackingEta,
  criadaEm: operacoes.criadaEm,
  atualizadaEm: operacoes.atualizadaEm,
};
export async function listOwnOperations(user: Principal) {
  requireApproved(user);
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  return db
    .select(fields)
    .from(operacoes)
    .where(eq(operacoes.userId, user.id))
    .orderBy(desc(operacoes.atualizadaEm))
    .limit(100);
}
export async function getOwnOperation(user: Principal, id: number) {
  requireApproved(user);
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const [operation] = await db
    .select(fields)
    .from(operacoes)
    .where(and(eq(operacoes.id, id), eq(operacoes.userId, user.id)))
    .limit(1);
  if (!operation)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Operação não encontrada.",
    });
  const milestones = await db
    .select({
      id: operacaoMarcos.id,
      tipo: operacaoMarcos.tipo,
      status: operacaoMarcos.status,
      vencimento: operacaoMarcos.vencimento,
      dataReferencia: operacaoMarcos.dataReferencia,
    })
    .from(operacaoMarcos)
    .where(eq(operacaoMarcos.operacaoId, id))
    .orderBy(operacaoMarcos.dataReferencia)
    .limit(200);
  // Never include free-form internal notes, payloads, attachments, costs or counterparties.
  const history = await db
    .select({
      id: operacaoEventos.id,
      tipo: operacaoEventos.tipo,
      estagio: operacaoEventos.estagio,
      criadoEm: operacaoEventos.criadoEm,
    })
    .from(operacaoEventos)
    .where(
      and(
        eq(operacaoEventos.operacaoId, id),
        inArray(operacaoEventos.tipo, [
          "operacao_criada",
          "estagio_avancado",
          "producao_iniciada",
          "produto_embarcado",
          "nacionalizado",
          "entregue",
        ]),
      ),
    )
    .orderBy(desc(operacaoEventos.criadoEm))
    .limit(100);
  return { ...operation, milestones, history };
}
export async function createOwnOperation(user: Principal, titulo: string) {
  requireApproved(user);
  await consumeLimit(`operation-create:${user.id}`, 10, 86400000);
  await audit(user.id, "operation.create", "requested");
  const op = await createOperacao({
    userId: user.id,
    titulo,
    estagioInicial: "demand",
  });
  if (!op) throw new Error("Não foi possível criar a operação");
  return getOwnOperation(user, op.id);
}
