import { beforeEach, describe, expect, it, vi } from "vitest";
import { estimarCustoPublicoTool } from "./estimarCustoPublico";

const mocks = vi.hoisted(() => ({
  comex: vi.fn(),
  ptax: vi.fn(),
  estimativa: vi.fn(),
}));
vi.mock("../../services/comexStatService", () => ({
  consultarComexPorNcm: mocks.comex,
}));
vi.mock("../../services/marketIntelligenceService", () => ({
  getPtaxSerie: mocks.ptax,
}));
vi.mock("../../services/estimativaService", () => ({
  calculateEstimativa: mocks.estimativa,
}));

const referencia = { produto: "Produto de teste", ncm: "39249000" };
const cenario = {
  ...referencia,
  quantidade: 100,
  unidade: "un",
  pesoLiquidoKg: 20,
  paisOrigem: "China",
  ufDesembaraco: "SC",
  modal: "maritimo",
  freteUsd: 50,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.comex.mockResolvedValue({
    disponivel: true,
    precoMedioUsdKg: 4,
    janelaMeses: 12,
  });
  mocks.ptax.mockResolvedValue([{ data: "2026-11-20", valor: 5.8 }]);
  mocks.estimativa.mockResolvedValue({
    ncmWarnings: [],
    summary: { netCostTotal: 1000, salePriceTotal: 1500 },
  });
});

describe("estimativa pública de importação", () => {
  it("entrega somente o FOB de mercado quando falta frete", async () => {
    const result = await estimarCustoPublicoTool.run(
      { ...cenario, freteUsd: undefined },
      { userId: 1 },
    );
    expect(result.data).toMatchObject({
      fobEstimadoUsd: 80,
      dadosFaltantes: ["referência de frete internacional em USD"],
    });
    expect(result.data).not.toHaveProperty("custoEstimadoBrl");
    expect(mocks.estimativa).not.toHaveBeenCalled();
  });

  it("usa o custo calculado pelo motor e oculta a precificação de venda", async () => {
    const result = await estimarCustoPublicoTool.run(cenario, { userId: 1 });
    expect(mocks.comex).toHaveBeenCalledWith({ ncm: referencia.ncm });
    expect(mocks.estimativa).toHaveBeenCalledWith(
      expect.objectContaining({
        products: [expect.objectContaining({ unitPrice: 0.8 })],
        freight: 50,
        icmsFullRegime: true,
        finalidade: "consumo_proprio",
      }),
    );
    expect(result.data).toMatchObject({
      custoEstimadoBrl: 1000,
      custoPorUnidadeBrl: 10,
    });
    expect(result.data).not.toHaveProperty("salePriceTotal");
  });

  it("omite o custo quando a base fiscal retorna uma alíquota de referência", async () => {
    mocks.estimativa.mockResolvedValue({
      ncmWarnings: ["NCM não encontrado na base"],
      summary: { netCostTotal: 1000 },
    });
    const result = await estimarCustoPublicoTool.run(cenario, { userId: 1 });
    expect(result.ok).toBe(false);
    expect(result.data).not.toHaveProperty("custoEstimadoBrl");
  });

  it("rejeita parâmetros fiscais fornecidos pelo cliente", async () => {
    await expect(
      estimarCustoPublicoTool.run(
        { ...cenario, icmsInternalRate: 0 },
        { userId: 1 },
      ),
    ).rejects.toThrow();
    expect(mocks.comex).not.toHaveBeenCalled();
  });
});
