import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  listOwnOperations,
  getOwnOperation,
  createOwnOperation,
  publicOperationInput,
} from "../services/publicOperations";
export const portalRouter = router({
  list: protectedProcedure.query(({ ctx }) => listOwnOperations(ctx.user)),
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ ctx, input }) => getOwnOperation(ctx.user, input.id)),
  create: protectedProcedure
    .input(publicOperationInput)
    .mutation(({ ctx, input }) => createOwnOperation(ctx.user, input.titulo)),
});
