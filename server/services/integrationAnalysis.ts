import { z } from "zod";
import {
  estimarCustoPublicoTool,
  importEstimateInput,
} from "../agent/tools/estimarCustoPublico";
import { consumeLimit } from "../security/abuse";
import type { Principal } from "../security/policy";

export const cubagemInput = z
  .object({
    comprimentoCm: z.number().positive().max(100000),
    larguraCm: z.number().positive().max(100000),
    alturaCm: z.number().positive().max(100000),
    pesoKg: z.number().positive().max(1000000),
    quantidade: z.number().int().positive().max(100000000).optional(),
  })
  .strict();

export async function estimateImportForIntegration(
  user: Principal,
  input: z.infer<typeof importEstimateInput>,
) {
  await consumeLimit(`integration-estimate:${user.id}`, 10, 60000);
  return estimarCustoPublicoTool.run(input, { userId: user.id });
}
