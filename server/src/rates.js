// Cennik warsztatu. Brak pliku oznacza stawki startowe z kodu.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_STEEL = {
  15: { frame2: 17, frame3: 24, frame4: 35 },
  20: { frame2: 22, frame3: 32, frame4: 46 },
  30: { frame2: 33, frame3: 48, frame4: 69 },
};

export const DEFAULT_LABOR = {
  stojak: 200,
  polka: 200,
  regal: 200,
  barierka: 280,
};

export const DEFAULT_RATES = {
  frame2: DEFAULT_STEEL[20].frame2,
  frame3: DEFAULT_STEEL[20].frame3,
  frame4: DEFAULT_STEEL[20].frame4,
  steel: DEFAULT_STEEL,
  finishM2: 80,
  laborBase: DEFAULT_LABOR.stojak,
  laborMeter: 17,
  labor: DEFAULT_LABOR,
  woods: {
    sosna: 190,
    buk: 310,
    jesion: 450,
    dab: 520,
    orzech: 760,
  },
  bar1: 8,
  bar2: 18,
  railLaborBase: DEFAULT_LABOR.barierka,
  railLaborPiece: 12,
};

const STEEL_WALLS = ["15", "20", "30"];
const PROFILES = ["frame2", "frame3", "frame4"];

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

function readSteel(raw) {
  const steel = {};
  for (const wall of STEEL_WALLS) {
    const fallback = DEFAULT_STEEL[wall];
    const row = raw?.steel?.[wall];
    steel[wall] = {};
    for (const key of PROFILES) {
      const older = wall === "20" ? raw?.[key] : undefined;
      steel[wall][key] = moneyOr(row?.[key], moneyOr(older, fallback[key]));
    }
  }
  return steel;
}

function readLabor(raw) {
  const saved = raw?.labor;
  return {
    stojak: moneyOr(saved?.stojak, moneyOr(raw?.laborBase, DEFAULT_LABOR.stojak)),
    polka: moneyOr(saved?.polka, moneyOr(raw?.laborBase, DEFAULT_LABOR.polka)),
    regal: moneyOr(saved?.regal, moneyOr(raw?.laborBase, DEFAULT_LABOR.regal)),
    barierka: moneyOr(saved?.barierka, moneyOr(raw?.railLaborBase, DEFAULT_LABOR.barierka)),
  };
}

export function currentRates() {
  const rates = {
    ...DEFAULT_RATES,
    steel: readSteel(null),
    labor: { ...DEFAULT_LABOR },
    woods: { ...DEFAULT_RATES.woods },
  };
  if (!useSavedRates()) return rates;
  try {
    const raw = JSON.parse(fs.readFileSync(ratesFile(), "utf8"));
    for (const key of MONEY_KEYS) rates[key] = moneyOr(raw[key], rates[key]);
    rates.steel = readSteel(raw);
    rates.labor = readLabor(raw);
    rates.frame2 = rates.steel["20"].frame2;
    rates.frame3 = rates.steel["20"].frame3;
    rates.frame4 = rates.steel["20"].frame4;
    rates.laborBase = rates.labor.stojak;
    rates.railLaborBase = rates.labor.barierka;
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
