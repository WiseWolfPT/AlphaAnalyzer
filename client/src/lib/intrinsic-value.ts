/**
 * Helpers para normalizar e obter valores intrínsecos vindos da API oficial.
 */

/**
 * Normaliza respostas heterogéneas (dcf/intrinsicValue/fairValue) para um número finito.
 */
export const normalizeIntrinsicValue = (data: any): number | null => {
  if (!data) return null;

  const candidates = [
    data.intrinsicValue,
    data.value,
    data?.dcf?.value,
    data.dcfValue,
    data.fairValue,
  ];

  for (const candidate of candidates) {
    const numericValue = Number(candidate);
    if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return null;
};

/**
 * Fetch util para garantir fallback de símbolos (ex.: BRK.B -> BRK-B).
 */
export const fetchIntrinsicValueData = async (symbol: string): Promise<any | null> => {
  try {
    const { intrinsicValueApi } = await import('@/lib/api');

    const tryFetch = async (ticker: string) => {
      const response = await intrinsicValueApi.getBySymbol(ticker);
      return (response as any)?.data ?? null;
    };

    const direct = await tryFetch(symbol);
    if (direct) return direct;

    const normalized = symbol.includes('.') ? symbol.replace(/\./g, '-') : symbol;
    if (normalized !== symbol) {
      const fallback = await tryFetch(normalized);
      if (fallback) return fallback;
    }

    return null;
  } catch (error) {
    console.warn('[intrinsic-value] Falha ao carregar valor intrínseco', { symbol, error });
    return null;
  }
};
