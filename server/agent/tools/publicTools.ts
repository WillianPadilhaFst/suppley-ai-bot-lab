import { submitQuoteRequest } from "../../services/publicQuoteRequests";
import { z } from "zod";
import { defineSchema, type AgentTool } from "./types";
import { getUserById } from "../../services/authService";
import { requireApproved } from "../../security/policy";
import {
  getOwnOperation,
  listOwnOperations,
  createOwnOperation,
} from "../../services/publicOperations";
import { calcularCubagemTool } from "./calcularCubagem";
export const PUBLIC_TOOLS: AgentTool[] = [
  calcularCubagemTool,
  {
    name: "solicitar_cotacao",
    schema: defineSchema(
      "solicitar_cotacao",
      "Registra uma solicitação estruturada para avaliação pela equipe Suppley, somente a pedido expresso do cliente e após coletar todos os campos. Não emite proposta, compra ou compromisso de importação.",
      {
        type: "object",
        properties: {
          produto: { type: "string", maxLength: 255 },
          especificacoes: { type: "string", maxLength: 6000 },
          quantidade: {
            type: "string",
            description:
              "Quantidade numérica positiva, com vírgula ou ponto decimal.",
          },
          unidade: { type: "string", maxLength: 30 },
          destinoCidade: { type: "string", maxLength: 120 },
          destinoUf: {
            type: "string",
            description: "Sigla da UF brasileira em maiúsculas.",
          },
          prazoDesejado: { type: "string", maxLength: 120 },
        },
        required: [
          "produto",
          "especificacoes",
          "quantidade",
          "unidade",
          "destinoCidade",
          "destinoUf",
          "prazoDesejado",
        ],
        additionalProperties: false,
      },
    ),
    async run(args, ctx) {
      if (!ctx.conversaId)
        return {
          ok: false,
          summary: "Abra uma conversa para registrar a solicitação.",
        };
      const user = await getUserById(ctx.userId);
      requireApproved(user);
      return {
        ok: true,
        summary:
          "Solicitação recebida para avaliação pela equipe Suppley. Ainda não é uma proposta comercial.",
        data: await submitQuoteRequest(user, args, ctx.conversaId),
      };
    },
  },
  {
    name: "consultar_minhas_operacoes",
    schema: defineSchema(
      "consultar_minhas_operacoes",
      "Consulta exclusivamente operações próprias, status, marcos, prazos e histórico público.",
      {
        type: "object",
        properties: { id: { type: "integer", minimum: 1 } },
        additionalProperties: false,
      },
    ),
    async run(args, ctx) {
      const input = z
        .object({ id: z.number().int().positive().optional() })
        .strict()
        .parse(args);
      const user = await getUserById(ctx.userId);
      requireApproved(user);
      const data = input.id
        ? await getOwnOperation(user!, input.id)
        : await listOwnOperations(user!);
      return { ok: true, summary: "Acompanhamento das suas operações.", data };
    },
  },
  {
    name: "criar_minha_operacao",
    schema: defineSchema(
      "criar_minha_operacao",
      "Cria uma operação própria no estágio inicial, somente quando o usuário solicitar expressamente.",
      {
        type: "object",
        properties: { titulo: { type: "string", maxLength: 255 } },
        required: ["titulo"],
        additionalProperties: false,
      },
    ),
    async run(args, ctx) {
      const input = z
        .object({ titulo: z.string().trim().min(1).max(255) })
        .strict()
        .parse(args);
      const user = await getUserById(ctx.userId);
      requireApproved(user);
      return {
        ok: true,
        summary: "Operação criada para acompanhamento.",
        data: await createOwnOperation(user!, input.titulo),
      };
    },
  },
];
