import { afterEach, describe, expect, it, vi } from "vitest";
import { consultarFreteHistoricoComex } from "./comexStatService";

const input = {
  ncm: "39249000",
  paisOrigem: "China",
  modal: "maritimo",
} as const;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("frete histórico no Comex Stat", () => {
  it("estima o frete pelo peso, com a mesma origem e modal em meses distintos", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
    const julho = {
      year: "2026",
      monthNumber: "07",
      country: "China",
      via: "Marítima",
      metricKG: "100",
      metricFreight: "500",
    };
    const setembro = {
      ...julho,
      monthNumber: "09",
      metricKG: "900",
      metricFreight: "900",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          data: {
            list: [
              julho,
              setembro,
              { ...julho, country: "Japão", metricFreight: "9999" },
              { ...julho, via: "Aérea", metricFreight: "9999" },
              { ...julho, monthNumber: "10", metricFreight: "9999" },
              {
                ...julho,
                monthNumber: "08",
                metricKG: "0",
                metricFreight: "9999",
              },
            ],
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await consultarFreteHistoricoComex(input);
    expect(resultado).toEqual({
      usdPorKg: 1.4,
      periodo: { de: "2026-04", ate: "2026-09" },
      mesesComDados: 2,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api-comexstat.mdic.gov.br/general?language=pt");
    expect(JSON.parse(init.body)).toMatchObject({
      flow: "import",
      filters: [
        { filter: "ncm", values: [39249000] },
        { filter: "via", values: [1] },
      ],
      details: ["country", "via"],
      metrics: ["metricKG", "metricFreight"],
    });
  });

  it("ignora respostas agregadas sem recorte, ou fonte indisponível", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: { list: [{ metricKG: "100", metricFreight: "100" }] },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(consultarFreteHistoricoComex(input)).resolves.toBeNull();
    await expect(consultarFreteHistoricoComex(input)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
