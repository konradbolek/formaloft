import { pathToFileURL } from "node:url";
import {
  FINISH_PER_M2,
  LABOR_BASE,
  LABOR_PER_METER,
  PAINTS,
  WOODS,
  frameRatePerMeter,
} from "./pricing.js";

/**
 * Półka pod telewizor liczy się tymi samymi stawkami co stojak na drewno.
 * Model ze zdjęcia to niska, długa konsola: blat i dwie półki, dwa segmenty.
 */

export const TV_LIMITS = {
  height: { min: 40, max: 70, step: 1 },
  width: { min: 100, max: 240, step: 1 },
  depth: { min: 30, max: 50, step: 1 },
  frameThickness: { min: 2, max: 4, step: 1 },
  shelfThickness: { min: 1, max: 4, step: 1 },
  shelves: { min: 2, max: 4, step: 1 },
  bays: { min: 1, max: 4, step: 1 },
  legHeight: { min: 0, max: 20, step: 1 },
};

export const TV_REFERENCE = {
  height: 50,
  width: 180,
  depth: 40,
  frameThickness: 2,
  shelfThickness: 2,
  shelves: 3,
  bays: 2,
  wood: "dab",
  paint: "czern",
  legHeight: 10,
};

const woodById = new Map(WOODS.map((wood) => [wood.id, wood]));
const paintById = new Map(PAINTS.map((paint) => [paint.id, paint]));

function num(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value.trim().replace(",", "."));
  }
  return NaN;
}

function inRange(value, limit) {
  return Number.isFinite(value) && value >= limit.min && value <= limit.max;
}

function snapCm(value, limit) {
  const steps = Math.round((value - limit.min) / limit.step);
  const snapped = limit.min + steps * limit.step;
  return Math.min(limit.max, Math.max(limit.min, snapped));
}

function money(n) {
  return Math.round(n);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function fmt(n, digits) {
  return n.toLocaleString("pl-PL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function shelfLayout(config) {
  const postHeight = config.height - config.shelfThickness;
  const leg = Math.min(Math.max(config.legHeight || 0, 0), Math.max(postHeight - 4, 0));
  const step = (postHeight - leg) / Math.max(config.shelves - 1, 1);
  const gap = step - config.shelfThickness;
  return { postHeight, leg, step, gap };
}

export function parseTvConfig(input = {}) {
  const fields = [];
  const height = Math.round(num(input.height));
  const width = Math.round(num(input.width));
  const depth = Math.round(num(input.depth));
  let frameThickness = round1(num(input.frameThickness));
  let shelfThickness = round1(num(input.shelfThickness));
  let shelves = Math.round(num(input.shelves));
  let bays = Math.round(num(input.bays));
  const wood = typeof input.wood === "string" ? input.wood : "";
  const paint =
    typeof input.paint === "string" && input.paint.trim() !== "" ? input.paint : "czern";
  const legHeight =
    input.legHeight === undefined || input.legHeight === null || input.legHeight === ""
      ? 0
      : Math.round(num(input.legHeight));

  if (!inRange(height, TV_LIMITS.height)) {
    fields.push(`Wysokość: od ${TV_LIMITS.height.min} do ${TV_LIMITS.height.max} cm.`);
  }
  if (!inRange(width, TV_LIMITS.width)) {
    fields.push(`Szerokość: od ${TV_LIMITS.width.min} do ${TV_LIMITS.width.max} cm.`);
  }
  if (!inRange(depth, TV_LIMITS.depth)) {
    fields.push(`Głębokość: od ${TV_LIMITS.depth.min} do ${TV_LIMITS.depth.max} cm.`);
  }
  if (!inRange(frameThickness, TV_LIMITS.frameThickness)) {
    fields.push(
      `Grubość ramy: od ${TV_LIMITS.frameThickness.min} do ${TV_LIMITS.frameThickness.max} cm.`,
    );
  } else {
    frameThickness = snapCm(frameThickness, TV_LIMITS.frameThickness);
  }
  if (!inRange(shelfThickness, TV_LIMITS.shelfThickness)) {
    fields.push(
      `Grubość półek: od ${TV_LIMITS.shelfThickness.min} do ${TV_LIMITS.shelfThickness.max} cm.`,
    );
  } else {
    shelfThickness = snapCm(shelfThickness, TV_LIMITS.shelfThickness);
  }
  if (!inRange(shelves, TV_LIMITS.shelves)) {
    fields.push(`Liczba półek: od ${TV_LIMITS.shelves.min} do ${TV_LIMITS.shelves.max}.`);
  } else {
    shelves = snapCm(shelves, TV_LIMITS.shelves);
  }
  if (!inRange(bays, TV_LIMITS.bays)) {
    fields.push(`Liczba segmentów: od ${TV_LIMITS.bays.min} do ${TV_LIMITS.bays.max}.`);
  } else {
    bays = snapCm(bays, TV_LIMITS.bays);
  }
  if (!woodById.has(wood)) fields.push("Wybierz gatunek drewna.");
  if (!paintById.has(paint)) fields.push("Wybierz kolor malowania stali.");
  if (!inRange(legHeight, TV_LIMITS.legHeight)) {
    fields.push(`Wysokość nóg: od ${TV_LIMITS.legHeight.min} do ${TV_LIMITS.legHeight.max} cm.`);
  }

  const config = {
    height,
    width,
    depth,
    frameThickness,
    shelfThickness,
    shelves,
    bays,
    wood,
    paint,
    legHeight,
  };

  if (!fields.length) {
    const { gap } = shelfLayout(config);
    if (gap < 8) {
      fields.push("Półki są za gęsto. Podnieś mebel albo zmniejsz liczbę półek.");
    }
  }

  if (fields.length) return { ok: false, error: "Sprawdź konfigurację.", fields };
  return { ok: true, config };
}

export function priceTvQuote(config) {
  const species = woodById.get(config.wood);
  const finish = paintById.get(config.paint) || paintById.get("czern");
  const { postHeight, gap } = shelfLayout(config);
  const posts = 2 * (config.bays + 1) * postHeight;
  const rings = config.shelves * 2 * (config.width + config.depth);
  const meters = (posts + rings) / 100;
  const area = config.shelves * (config.width / 100) * (config.depth / 100);
  const steelRate = frameRatePerMeter(config.frameThickness);
  const steelExact = meters * steelRate;
  const woodRate = species.pricePerM2At2cm * (config.shelfThickness / 2);
  const woodExact = area * woodRate;
  const finishExact = area * FINISH_PER_M2;
  const laborExact = LABOR_BASE + meters * LABOR_PER_METER;
  const profile = Math.round(config.frameThickness * 10);
  const bayWidth = (config.width - (config.bays + 1) * config.frameThickness) / config.bays;

  const lines = [
    {
      id: "steel",
      label: "Rama stalowa",
      detail: `${fmt(meters, 1)} mb × ${fmt(steelRate, steelRate % 1 === 0 ? 0 : 2)} zł · profil ${profile}×${profile} mm · ${finish.name.toLowerCase()} · ${config.bays === 1 ? "1 segment" : `${config.bays} segmenty`}`,
      amount: money(steelExact),
      exact: round2(steelExact),
    },
    {
      id: "top",
      label: `Półki · ${species.name.toLowerCase()}`,
      detail: `${config.shelves} × ${config.width} × ${config.depth} cm · grubość ${fmt(config.shelfThickness, 1)} cm`,
      amount: money(woodExact),
      exact: round2(woodExact),
    },
    {
      id: "finish",
      label: "Olejowanie drewna",
      detail: `${fmt(area, 2)} m² · olej twardy`,
      amount: money(finishExact),
      exact: round2(finishExact),
    },
    {
      id: "labor",
      label: "Robocizna",
      detail: "Cięcie, spawanie, szlif i malowanie proszkowe",
      amount: money(laborExact),
      exact: round2(laborExact),
    },
  ];

  return {
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    currency: "PLN",
    lines,
    steelMeters: round2(meters),
    topAreaM2: round2(area),
    clearance: {
      width: round1(Math.max(0, bayWidth)),
      depth: round1(Math.max(0, config.depth - 2 * config.frameThickness)),
      height: round1(Math.max(0, gap)),
    },
  };
}

const referencePriced = priceTvQuote(TV_REFERENCE);

export function getTvCatalog() {
  return {
    product: "polka-rtv",
    limits: TV_LIMITS,
    woods: WOODS,
    paints: PAINTS,
    reference: TV_REFERENCE,
    referenceTotal: referencePriced.total,
    referenceNote: "50 × 180 × 40 cm, 3 półki, 2 segmenty, rama 2 cm, dąb 2 cm, malowanie czerń",
    phone: "535 947 696",
    phoneHref: "tel:+48535947696",
  };
}

export function priceTvWithReference(config) {
  return { ...priceTvQuote(config), referenceTotal: referencePriced.total };
}

function assertTvPricing() {
  const failures = [];
  const quote = priceTvWithReference(TV_REFERENCE);
  const sum = quote.lines.reduce((total, line) => total + line.amount, 0);
  if (sum !== quote.total) failures.push(`Suma pozycji ${sum} nie schodzi się z total ${quote.total}.`);
  if (!(quote.total > 0)) failures.push("Model ze zdjęcia powinien mieć cenę.");

  const moreShelves = priceTvQuote({ ...TV_REFERENCE, shelves: 4, height: 62 });
  if (!(moreShelves.total > quote.total)) failures.push("Więcej półek powinno podnosić cenę.");

  const moreBays = priceTvQuote({ ...TV_REFERENCE, bays: 4 });
  if (!(moreBays.total > quote.total)) failures.push("Więcej segmentów powinno podnosić cenę.");

  const wider = priceTvQuote({ ...TV_REFERENCE, width: 240 });
  if (!(wider.total > quote.total)) failures.push("Szersza półka powinna być droższa.");

  const white = priceTvQuote({ ...TV_REFERENCE, paint: "biel" });
  if (white.total !== quote.total) failures.push("Kolor malowania nie powinien zmieniać ceny.");

  const raised = priceTvQuote({ ...TV_REFERENCE, legHeight: 16 });
  if (raised.total !== quote.total) failures.push("Wysokość nóg nie powinna zmieniać ceny.");
  if (!(raised.clearance.height < quote.clearance.height)) {
    failures.push("Wyższe nogi powinny zostawiać mniej miejsca między półkami.");
  }

  const tight = parseTvConfig({ ...TV_REFERENCE, height: 40, shelves: 4, shelfThickness: 4, legHeight: 16 });
  if (tight.ok) failures.push("Za gęste półki powinny zostać odrzucone.");

  const snapped = parseTvConfig({ ...TV_REFERENCE, frameThickness: 2.4, shelfThickness: 3.6 });
  if (!snapped.ok || snapped.config.frameThickness !== 2 || snapped.config.shelfThickness !== 4) {
    failures.push("Grubość ramy i półek powinna wskakiwać na pełne centymetry.");
  }

  const good = parseTvConfig(TV_REFERENCE);
  if (!good.ok) failures.push(`Poprawna konfiguracja odrzucona: ${good.error}`);

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`Półka pod telewizor, model ze zdjęcia: ${quote.total} zł`);
  for (const line of quote.lines) {
    console.log(`  ${line.amount} zł  ${line.label} — ${line.detail}`);
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  assertTvPricing();
}
