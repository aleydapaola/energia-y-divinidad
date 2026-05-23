export type InternationalCurrency = "USD" | "EUR";

export interface CurrencyConversion {
  from: InternationalCurrency;
  to: "COP";
  sourceAmount: number;
  convertedAmount: number;
  rate: number;
  rateDate: string;
  provider: string;
}

interface ExchangeRateResponse {
  result?: string;
  provider?: string;
  time_last_update_utc?: string;
  rates?: Record<string, number>;
}

const RATE_PROVIDER = "open.er-api.com";

function getEnvRate(currency: InternationalCurrency): number | null {
  const key = currency === "USD" ? "USD_TO_COP_RATE" : "EUR_TO_COP_RATE";
  const value = process.env[key];
  if (!value) {
    return null;
  }

  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export async function getExchangeRateToCOP(currency: InternationalCurrency): Promise<{
  rate: number;
  rateDate: string;
  provider: string;
}> {
  const envRate = getEnvRate(currency);
  if (envRate) {
    return {
      rate: envRate,
      rateDate: new Date().toISOString(),
      provider: "env",
    };
  }

  const response = await fetch(`https://open.er-api.com/v6/latest/${currency}`, {
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener la tasa de cambio");
  }

  const data = (await response.json()) as ExchangeRateResponse;
  const rate = data.rates?.COP;

  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("La tasa de cambio COP no está disponible");
  }

  return {
    rate,
    rateDate: data.time_last_update_utc || new Date().toISOString(),
    provider: data.provider || RATE_PROVIDER,
  };
}

export async function convertInternationalToCOP(
  amount: number,
  currency: InternationalCurrency
): Promise<CurrencyConversion> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El monto a convertir no es válido");
  }

  const exchangeRate = await getExchangeRateToCOP(currency);

  return {
    from: currency,
    to: "COP",
    sourceAmount: amount,
    convertedAmount: Math.round(amount * exchangeRate.rate),
    rate: exchangeRate.rate,
    rateDate: exchangeRate.rateDate,
    provider: exchangeRate.provider,
  };
}
