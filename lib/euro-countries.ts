const EURO_AREA_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "HR",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
]);

export function usesEuro(countryCode?: string | null): boolean {
  return !!countryCode && EURO_AREA_COUNTRY_CODES.has(countryCode.toUpperCase());
}
