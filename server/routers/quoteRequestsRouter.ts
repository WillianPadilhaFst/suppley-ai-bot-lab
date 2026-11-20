import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  listOwnQuoteRequests,
  listQuoteInbox,
  reviewQuoteRequest,
  linkQuoteOperation,
} from "../services/publicQuoteRequests";
export const quoteRequestsRouter = router({
  mine: protectedProcedure.query(({ ctx }) => listOwnQuoteRequests(ctx.user)),
  inbox: adminProcedure.query(({ ctx }) => listQuoteInbox(ctx.user)),
  review: adminProcedure
    .input(
      z
        .object({
          id: z.number().int().positive(),
          status: z.enum(["em_analise", "encerrada"]),
        })
        .strict(),
    )
    .mutation(({ ctx, input }) =>
      reviewQuoteRequest(ctx.user, input.id, input.status),
    ),
  link: adminProcedure
    .input(
      z
        .object({
          id: z.number().int().positive(),
          operacaoId: z.number().int().positive(),
        })
        .strict(),
    )
    .mutation(({ ctx, input }) =>
      linkQuoteOperation(ctx.user, input.id, input.operacaoId),
    ),
});
