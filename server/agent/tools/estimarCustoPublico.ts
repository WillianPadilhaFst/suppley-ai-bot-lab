import { z } from "zod";
import {
  ComexIndisponivelError,
  consultarComexPorNcm,
  consultarFreteHistoricoComex,
} from "../../services/comexStatService";
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
    "Consulta o FOB médio histórico do Comex Stat por NCM e calcula o custo estimado quando há dados para o cenário. A média é da categoria fiscal, não de um fornecedor. Quando o frete não for informado, busca no Comex Stat o frete histórico por NCM, país de origem e modal. País, peso e modal devem vir do cliente ou de premissas aceitas explicitamente.",
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
            "Frete internacional total em dólares, somente se informado pelo cliente. Omita para consultar a referência histórica.",
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
    let referencia;
    try {
      referencia = await consultarComexPorNcm({ ncm: input.ncm });
    } catch (error) {
      if (!(error instanceof ComexIndisponivelError)) throw error;
      return {
        ok: false,
        summary: "A fonte oficial está temporariamente indisponível. Ofereça avaliação pela equipe Suppley.",
      };
    }
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
      freteUsd: freteInformadoUsd,
      seguroUsd,
    } = input;
    const icmsInternalRate = ufDesembaraco
      ? getStateIcmsInternalRate(ufDesembaraco)
      : null;
    const freteHistorico =
      !freteInformadoUsd && paisOrigem && modal && pesoLiquidoKg
        ? await consultarFreteHistoricoComex({
            ncm: input.ncm,
            paisOrigem,
            modal,
          })
        : null;
    const freteUsd =
      freteInformadoUsd ??
      (freteHistorico && pesoLiquidoKg
        ? freteHistorico.usdPorKg * pesoLiquidoKg
        : undefined);
    const referenciaFrete = freteHistorico && {
      fonte: "Comex Stat (MDIC), fretes declarados nas importações",
      tipo: "média histórica por kg líquido",
      ncm: input.ncm,
      paisOrigem,
      modal,
      pesoLiquidoKg,
      freteEstimadoUsd: freteUsd,
      ...freteHistorico,
    };
    const dadosMercado = {
      mercado,
      ...(referenciaFrete && { referenciaFrete }),
    };
    if (
      !quantidade ||
      !unidade ||
      !pesoLiquidoKg ||
      !paisOrigem ||
      !ufDesembaraco ||
      !icmsInternalRate ||
      !modal ||
      !freteUsd ||
      !Number.isFinite(freteUsd)
    ) {
      return {
        ok: true,
        summary:
          "Há uma referência FOB para a categoria fiscal. Ainda faltam dados para calcular o custo de importação.",
        data: {
          ...dadosMercado,
          ...(pesoLiquidoKg && { fobEstimadoUsd: usdKg * pesoLiquidoKg }),
          dadosFaltantes: [
            !quantidade && "quantidade",
            !unidade && "unidade",
            !pesoLiquidoKg && "peso líquido total",
            !paisOrigem && "país de origem",
            !icmsInternalRate && "UF de desembaraço válida",
            !modal && "modal",
            (!freteUsd || !Number.isFinite(freteUsd)) &&
              "referência de frete internacional em USD",
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
          "A PTAX do Banco Central está indisponível. É possível informar as referências de mercado disponíveis.",
        data: dadosMercado,
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
          "O cenário precisa de validação fiscal pela equipe Suppley. Apresente as referências de mercado disponíveis.",
        data: dadosMercado,
      };
    }

    const total = resultado.summary.netCostTotal;
    if (!Number.isFinite(total) || total <= 0) {
      return {
        ok: false,
        summary:
          "O motor não retornou um custo utilizável. Apresente as referências de mercado disponíveis.",
        data: dadosMercado,
      };
    }
    return {
      ok: true,
      summary:
        "Custo estimado de importação para as premissas informadas, antes de despesas locais e do serviço da Suppley.",
      data: {
        ...dadosMercado,
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
          origemFrete: freteInformadoUsd
            ? "informado pelo cliente"
            : "histórico Comex Stat",
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
