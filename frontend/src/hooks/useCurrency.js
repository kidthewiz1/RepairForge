import { useState, useEffect } from "react";

const COUNTRY_CURRENCY = {
  CA: "CAD", US: "USD", GB: "GBP", AU: "AUD", NZ: "NZD",
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR",
  NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", EE: "EUR",
  LV: "EUR", LT: "EUR", MT: "EUR", CY: "EUR",
  JP: "JPY", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
  MX: "MXN", BR: "BRL", IN: "INR", CN: "CNY", KR: "KRW",
  SG: "SGD", HK: "HKD", ZA: "ZAR",
};

export function useCurrency() {
  const nav = navigator.language || "en-US";
  const parts = nav.split("-");
  const country = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "US";
  const currency = COUNTRY_CURRENCY[country] || "USD";

  const [rate, setRate] = useState(1);

  useEffect(() => {
    if (currency === "USD") return;
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data) => { if (data?.rates?.[currency]) setRate(data.rates[currency]); })
      .catch(() => {});
  }, [currency]);

  const format = (usdAmount) =>
    new Intl.NumberFormat(nav, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" || currency === "KRW" ? 0 : 2,
    }).format(usdAmount * rate);

  return { format, currency };
}
