import { pathToFileURL } from "node:url";
import { REGAL_LAYOUT } from "../../shared/regalLayout.js";
import {
  FINISH_PER_M2,
  LABOR_BASE,
  LABOR_PER_METER,
  PAINTS,
  WOODS,
  frameRatePerMeter,
} from "./pricing.js";

/**
 * Regał asymetryczny liczy się tymi samymi stawkami co stojak.
 * Układ półek jest ze zdjęcia i skaluje się z wymiarami.
 * Wysokość nóg nie zmienia ceny.
 */

export const REGAL_LIMITS = {
  height: { min: 150, max: 210, step: 1 },
  width: { min: 70, max: 130, step: 1 },
  depth: { min: 22, max: 40, step: 1 },
  frameThickness: { min: 2, max: 4, step: 1 },
  shelfThickness: { min: 1, max: 4, step: 1 },
  legHeight: { min: 0, max: 30, step: 1 },
};

export const REGAL_REFERENCE = {
  height: 180,
  width: 96,
  depth: 28,
  frameThickness: 2,
  shelfThickness: 2,
  wood: "sosna",
  paint: "czern",
  legHeight: 0,
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

export function regalGeometry(config, { ignoreLegs = false } = {}) {
  const frame = config.frameThickness;
  const board = config.shelfThickness;
  const innerH = config.height - frame * 2;
  const innerW = config.width - frame * 2;
  const leg = ignoreLegs ? 0 : Math.min(Math.max(config.legHeight || 0, 0), Math.max(innerH - board * 3, 0));
  const usable = Math.max(innerH - leg, board);
  const yOf = (t) => frame + leg + t * Math.max(usable - board, board);
  const shelves = REGAL_LAYOUT.shelves.map((shelf) => ({
    ...shelf,
    width: (shelf.x1 - shelf.x0) * innerW,
    y: yOf(shelf.y),
  }));
  const verticals = REGAL_LAYOUT.verticals.map((item) => ({
    ...item,
    length: Math.max(yOf(item.y1) - yOf(item.y0), 0),
  }));

  let minGap = Infinity;
  for (let i = 0; i < shelves.length; i += 1) {
    for (let j = i + 1; j < shelves.length; j += 1) {
      const a = REGAL_LAYOUT.shelves[i];
      const b = REGAL_LAYOUT.shelves[j];
      const overlaps = a.x0 < b.x1 - 0.02 && b.x0 < a.x1 - 0.02;
      if (!overlaps) continue;
      const gap = Math.abs(shelves[i].y - shelves[j].y) - board;
      minGap = Math.min(minGap, gap);
    }
  }

  return { innerW, innerH, usable, shelves, verticals, minGap };
}

export function parseRegalConfig(input = {}) {
  const fields = [];
  const height = Math.round(num(input.height));
  const width = Math.round(num(input.width));
  const depth = Math.round(num(input.depth));
  let frameThickness = round1(num(input.frameThickness));
  let shelfThickness = round1(num(input.shelfThickness));
  const wood = typeof input.wood === "string" ? input.wood : "";
  const paint =
    typeof input.paint === "string" && input.paint.trim() !== "" ? input.paint : "czern";
  const legHeight =
    input.legHeight === undefined || input.legHeight === null || input.legHeight === ""
      ? 0
      : Math.round(num(input.legHeight));

  if (!inRange(height, REGAL_LIMITS.height)) {
    fields.push(`Wysokość: od ${REGAL_LIMITS.height.min} do ${REGAL_LIMITS.height.max} cm.`);
  }
  if (!inRange(width, REGAL_LIMITS.width)) {
    fields.push(`Szerokość: od ${REGAL_LIMITS.width.min} do ${REGAL_LIMITS.width.max} cm.`);
  }
  if (!inRange(depth, REGAL_LIMITS.depth)) {
    fields.push(`Głębokość: od ${REGAL_LIMITS.depth.min} do ${REGAL_LIMITS.depth.max} cm.`);
  }
  if (!inRange(frameThickness, REGAL_LIMITS.frameThickness)) {
    fields.push(
      `Grubość ramy: od ${REGAL_LIMITS.frameThickness.min} do ${REGAL_LIMITS.frameThickness.max} cm.`,
    );
  } else {
    frameThickness = snapCm(frameThickness, REGAL_LIMITS.frameThickness);
  }
  if (!inRange(shelfThickness, REGAL_LIMITS.shelfThickness)) {
    fields.push(
      `Grubość półek: od ${REGAL_LIMITS.shelfThickness.min} do ${REGAL_LIMITS.shelfThickness.max} cm.`,
    );
  } else {
    shelfThickness = snapCm(shelfThickness, REGAL_LIMITS.shelfThickness);
  }
  if (!woodById.has(wood)) fields.push("Wybierz gatunek drewna.");
  if (!paintById.has(paint)) fields.push("Wybierz kolor malowania stali.");
  if (!inRange(legHeight, REGAL_LIMITS.legHeight)) {
    fields.push(`Wysokość nóg: od ${REGAL_LIMITS.legHeight.min} do ${REGAL_LIMITS.legHeight.max} cm.`);
  }

  const config = {
    height,
    width,
    depth,
    frameThickness,
    shelfThickness,
    wood,
    paint,
    legHeight,
  };

  if (!fields.length && regalGeometry(config).minGap < 8) {
    fields.push("Półki są za gęsto. Podnieś regał albo zmniejsz nogi i grubość desek.");
  }

  if (fields.length) return { ok: false, error: "Sprawdź konfigurację.", fields };
  return { ok: true, config };
}

export function priceRegalQuote(config) {
  const species = woodById.get(config.wood);
  const finish = paintById.get(config.paint) || paintById.get("czern");
  const geometry = regalGeometry(config, { ignoreLegs: true });
  const posts = 4 * config.height;
  const outerRails = 4 * (config.width + config.depth);
  const innerPosts = geometry.verticals.reduce((sum, item) => sum + item.length * 2, 0);
  const shelfRails = geometry.shelves.reduce((sum, item) => sum + item.width * 2, 0);
  const meters = (posts + outerRails + innerPosts + shelfRails) / 100;
  const area = geometry.shelves.reduce(
    (sum, item) => sum + (item.width / 100) * (config.depth / 100),
    0,
  );
  const steelRate = frameRatePerMeter(config.frameThickness);
  const steelExact = meters * steelRate;
  const woodRate = species.pricePerM2At2cm * (config.shelfThickness / 2);
  const woodExact = area * woodRate;
  const finishExact = area * FINISH_PER_M2;
  const laborExact = LABOR_BASE + meters * LABOR_PER_METER;
  const profile = Math.round(config.frameThickness * 10);
  const shown = regalGeometry(config);

  const lines = [
    {
      id: "steel",
      label: "Rama stalowa",
      detail: `${fmt(meters, 1)} mb × ${fmt(steelRate, steelRate % 1 === 0 ? 0 : 2)} zł · profil ${profile}×${profile} mm · ${finish.name.toLowerCase()}`,
      amount: money(steelExact),
      exact: round2(steelExact),
    },
    {
      id: "top",
      label: `Półki · ${species.name.toLowerCase()}`,
      detail: `${geometry.shelves.length} desek · układ ze zdjęcia · grubość ${fmt(config.shelfThickness, 1)} cm`,
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
      width: round1(Math.max(0, geometry.innerW)),
      depth: round1(Math.max(0, config.depth - 2 * config.frameThickness)),
      height: round1(Math.max(0, shown.minGap)),
    },
  };
}

const referencePriced = priceRegalQuote(REGAL_REFERENCE);

export function getRegalCatalog() {
  return {
    product: "regal",
    limits: REGAL_LIMITS,
    woods: WOODS,
    paints: PAINTS,
    reference: REGAL_REFERENCE,
    referenceTotal: referencePriced.total,
    referenceNote: "180 × 96 × 28 cm, układ ze zdjęcia, rama 2 cm, sosna 2 cm, malowanie czerń",
    phone: "535 947 696",
    phoneHref: "tel:+48535947696",
  };
}

export function priceRegalWithReference(config) {
  return { ...priceRegalQuote(config), referenceTotal: referencePriced.total };
}

function assertRegalPricing() {
  const failures = [];
  const quote = priceRegalWithReference(REGAL_REFERENCE);
  const sum = quote.lines.reduce((total, line) => total + line.amount, 0);
  if (sum !== quote.total) failures.push(`Suma pozycji ${sum} nie schodzi się z total ${quote.total}.`);
  if (!(quote.total > 0)) failures.push("Model ze zdjęcia powinien mieć cenę.");

  const taller = priceRegalQuote({ ...REGAL_REFERENCE, height: 210 });
  const wider = priceRegalQuote({ ...REGAL_REFERENCE, width: 130 });
  if (!(taller.total > quote.total && wider.total > quote.total)) {
    failures.push("Wyższy i szerszy regał powinny być droższe.");
  }

  const oak = priceRegalQuote({ ...REGAL_REFERENCE, wood: "dab" });
  if (!(oak.total > quote.total)) failures.push("Dąb powinien być droższy od sosny.");

  const white = priceRegalQuote({ ...REGAL_REFERENCE, paint: "biel" });
  if (white.total !== quote.total) failures.push("Kolor malowania nie powinien zmieniać ceny.");

  const raised = priceRegalQuote({ ...REGAL_REFERENCE, legHeight: 20 });
  if (raised.total !== quote.total) failures.push("Wysokość nóg nie powinna zmieniać ceny.");
  if (!(raised.clearance.height < quote.clearance.height)) {
    failures.push("Wyższe nogi powinny zmniejszać odstęp między półkami.");
  }

  const low = regalGeometry({
    ...REGAL_REFERENCE,
    height: 150,
    shelfThickness: 4,
    legHeight: 30,
  });
  if (!(low.minGap < quote.clearance.height && low.minGap > 8)) {
    failures.push("Niski regał powinien mieć mniejszy, ale wciąż używalny odstęp.");
  }

  const tooShort = parseRegalConfig({ ...REGAL_REFERENCE, height: 140 });
  if (tooShort.ok) failures.push("Za niski regał powinien zostać odrzucony.");

  const snapped = parseRegalConfig({ ...REGAL_REFERENCE, frameThickness: 2.4, shelfThickness: 3.6 });
  if (!snapped.ok || snapped.config.frameThickness !== 2 || snapped.config.shelfThickness !== 4) {
    failures.push("Grubość ramy i półek powinna wskakiwać na pełne centymetry.");
  }

  const good = parseRegalConfig(REGAL_REFERENCE);
  if (!good.ok) failures.push(`Poprawna konfiguracja odrzucona: ${good.error}`);

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`Regał, model ze zdjęcia: ${quote.total} zł`);
  for (const line of quote.lines) {
    console.log(`  ${line.amount} zł  ${line.label} — ${line.detail}`);
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  assertRegalPricing();
}
