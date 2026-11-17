// Cennik warsztatu. Brak pliku oznacza stawki startowe z kodu.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_RATES = {
  frame2: 22,
  frame3: 32,
  frame4: 46,
  finishM2: 80,
  laborBase: 200,
  laborMeter: 17,
  woods: {
    sosna: 190,
    buk: 310,
    jesion: 450,
    dab: 520,
    orzech: 760,
  },
  bar1: 8,
  bar2: 18,
  railLaborBase: 280,
  railLaborPiece: 12,
};

const MONEY_KEYS = [
  "frame2",
  "frame3",
  "frame4",
  "finishM2",
  "laborBase",
  "laborMeter",
  "bar1",
  "bar2",
  "railLaborBase",
  "railLaborPiece",
];

function ratesFile() {
  if (process.env.STILOWO_RATES_FILE) return process.env.STILOWO_RATES_FILE;
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/rates.json");
}

function useSavedRates() {
  const entry = process.argv[1] || "";
  return !/pricing\.js$/i.test(entry);
}

function moneyOr(value, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 20000) return fallback;
  return number;
}

export function currentRates() {
  const rates = {
    ...DEFAULT_RATES,
    woods: { ...DEFAULT_RATES.woods },
  };
  if (!useSavedRates()) return rates;
  try {
    const raw = JSON.parse(fs.readFileSync(ratesFile(), "utf8"));
    for (const key of MONEY_KEYS) rates[key] = moneyOr(raw[key], rates[key]);
    if (raw.woods && typeof raw.woods === "object") {
      for (const id of Object.keys(rates.woods)) {
        rates.woods[id] = moneyOr(raw.woods[id], rates.woods[id]);
      }
    }
  } catch {
    // Brak pliku albo uszkodzony JSON zostawia stawki startowe.
  }
  return rates;
}
