import { z } from "zod";
import { consultarComexPorNcm } from "../../services/comexStatService";
import { calculateEstimativa } from "../../services/estimativaService";
import { getPtaxSerie } from "../../services/marketIntelligenceService";
import { getStateIcmsInternalRate } from "../../services/statePricingService";
import { defineSchema, type AgentTool } from "./types";

const amount = z.number().finite().positive().max(1_000_000_000);
const inputSchema = z
  .object({
    produto: z.string().trim().min(1).max(255),
    ncm: z.string().regex(/^\d{8}$/),
    quantidade: amount.optional(),
    unidade: z.string().trim().min(1).max(24).optional(),
    pesoLiquidoKg: amount.optional(),
    paisOrigem: z.string().trim().min(2).max(80).optional(),
    ufDesembaraco: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
    modal: z
      .enum(["maritimo", "aereo", "rodoviario", "ferroviario"])
      .optional(),
    freteUsd: amount.optional(),
    seguroUsd: amount.optional(),
  })
  .strict();

export const estimarCustoPublicoTool: AgentTool = {
  name: "estimar_custo_importacao",
  schema: defineSchema(
    "estimar_custo_importacao",
    "Consulta o FOB médio histórico do Comex Stat por NCM e calcula o custo estimado quando há dados para o cenário. A média é da categoria fiscal, não de um fornecedor. Os dados logísticos devem vir do cliente ou de premissas que ele aceitou explicitamente.",
    {
      type: "object",
      additionalProperties: false,
      required: ["produto", "ncm"],
      properties: {
        produto: { type: "string" },
        ncm: {
          type: "string",
          pattern: "^\\d{8}$",
          description:
            "NCM informada ou assumida com o cliente, sem pontuação.",
        },
        quantidade: { type: "number" },
        unidade: { type: "string" },
        pesoLiquidoKg: {
          type: "number",
          description: "Peso líquido total do lote, em kg.",
        },
        paisOrigem: { type: "string" },
        ufDesembaraco: {
          type: "string",
          description:
            "UF de desembaraço, não deduza a partir do endereço de entrega.",
        },
        modal: {
          type: "string",
          enum: ["maritimo", "aereo", "rodoviario", "ferroviario"],
        },
        freteUsd: {
          type: "number",
          description:
            "Frete internacional total em dólares, informado ou aceito explicitamente pelo cliente.",
        },
        seguroUsd: {
          type: "number",
          description:
            "Seguro internacional total em dólares, quando conhecido.",
        },
      },
    },
  ),
  async run(args) {
    const input = inputSchema.parse(args);
    const referencia = await consultarComexPorNcm({ ncm: input.ncm });
    const usdKg = referencia.precoMedioUsdKg;
    if (
      !referencia.disponivel ||
      usdKg == null ||
      !Number.isFinite(usdKg) ||
      usdKg <= 0
    ) {
      return {
        ok: false,
        summary:
          "O Comex Stat não retornou uma referência de preço utilizável para esse NCM. Ofereça avaliação pela equipe Suppley.",
      };
    }

    const mercado = {
      fonte: "Comex Stat (MDIC), importações brasileiras",
      ncm: input.ncm,
      janelaMeses: referencia.janelaMeses,
      fobMedioUsdKg: usdKg,
    };
    const {
      quantidade,
      unidade,
      pesoLiquidoKg,
      paisOrigem,
      ufDesembaraco,
      modal,
      freteUsd,
      seguroUsd,
    } = input;
    const icmsInternalRate = ufDesembaraco
      ? getStateIcmsInternalRate(ufDesembaraco)
      : null;
    if (
      !quantidade ||
      !unidade ||
      !pesoLiquidoKg ||
      !paisOrigem ||
      !ufDesembaraco ||
      !icmsInternalRate ||
      !modal ||
      !freteUsd
    ) {
      return {
        ok: true,
        summary:
          "Há uma referência FOB para a categoria fiscal. Ainda faltam dados para calcular o custo de importação.",
        data: {
          mercado,
          ...(pesoLiquidoKg && { fobEstimadoUsd: usdKg * pesoLiquidoKg }),
          dadosFaltantes: [
            !quantidade && "quantidade",
            !unidade && "unidade",
            !pesoLiquidoKg && "peso líquido total",
            !paisOrigem && "país de origem",
            !icmsInternalRate && "UF de desembaraço válida",
            !modal && "modal",
            !freteUsd && "referência de frete internacional em USD",
          ].filter(Boolean),
        },
      };
    }

    const ptax = (await getPtaxSerie(15))
      .filter(({ valor }) => Number.isFinite(valor) && valor > 0)
      .sort((a, b) => b.data.localeCompare(a.data))[0];
    if (!ptax)
      return {
        ok: false,
        summary:
          "A PTAX do Banco Central está indisponível. É possível informar apenas a referência FOB.",
        data: { mercado },
      };

    const resultado = await calculateEstimativa({
      products: [
        {
          productName: input.produto,
          ncmCode: input.ncm,
          quantity: quantidade,
          unit: unidade,
          unitPrice: (usdKg * pesoLiquidoKg) / quantidade,
        },
      ],
      currency: "USD",
      exchangeRate: ptax.valor,
      freight: freteUsd,
      insurance: seguroUsd,
      estadoDestino: ufDesembaraco,
      paisOrigem,
      modal,
      taxRegime: "simples_nacional",
      finalidade: "consumo_proprio",
      icmsFullRegime: true,
      icmsInternalRate,
      despachoAduaneiroBrl: 0,
    });
    if (
      resultado.ncmWarnings.some((aviso) =>
        /🛑|não encontrado na base|ESTIMADA por capítulo|II 0% e IPI 0%|Ex-Tarifário|preferencial|tratamento oficial TTCE/i.test(
          aviso,
        ),
      )
    ) {
      return {
        ok: false,
        summary:
          "O cenário precisa de validação fiscal pela equipe Suppley. Apresente somente a referência FOB de mercado.",
        data: { mercado },
      };
    }

    const total = resultado.summary.netCostTotal;
    if (!Number.isFinite(total) || total <= 0) {
      return {
        ok: false,
        summary:
          "O motor não retornou um custo utilizável. Apresente somente a referência FOB de mercado.",
        data: { mercado },
      };
    }
    return {
      ok: true,
      summary:
        "Custo estimado de importação para as premissas informadas, antes de despesas locais e do serviço da Suppley.",
      data: {
        mercado,
        custoEstimadoBrl: total,
        custoPorUnidadeBrl: total / quantidade,
        premissas: {
          quantidade,
          unidade,
          pesoLiquidoKg,
          paisOrigem,
          ufDesembaraco,
          modal,
          freteUsd,
          seguroUsd,
          ptax,
          beneficioFiscal: false,
        },
        foraDaEstimativa: [
          "despesas locais",
          "entrega no destino",
          "serviço da Suppley",
          ...(!seguroUsd ? ["seguro"] : []),
        ],
      },
    };
  },
};
