import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  listOwnOperations,
  getOwnOperation,
  createOwnOperation,
} from "../services/publicOperations";
export const portalRouter = router({
  list: protectedProcedure.query(({ ctx }) => listOwnOperations(ctx.user)),
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ ctx, input }) => getOwnOperation(ctx.user, input.id)),
  create: protectedProcedure
    .input(z.object({ titulo: z.string().trim().min(1).max(255) }))
    .mutation(({ ctx, input }) => createOwnOperation(ctx.user, input.titulo)),
});
