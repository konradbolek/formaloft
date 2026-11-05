import { pathToFileURL } from "node:url";

/**
 * Stawki warsztatowe Forma Loft.
 *
 * Model ze zdjęcia (REFERENCE) ma wychodzić 699 zł — tyle kosztuje
 * stojak na plakacie. Żeby podmienić cennik, edytuj stałe niżej.
 *
 * Wysokość w konfiguracji jest całkowita: od podłogi do wierzchu blatu.
 * Słupki są krótsze o grubość blatu, blat leży na ramie.
 *
 * Długość stali: 4 słupki + rama górna + rama dolna
 *   = 4 × (wysokość słupka + szerokość + głębokość)
 */

export const LIMITS = {
  height: { min: 100, max: 160, step: 1 },
  width: { min: 30, max: 80, step: 1 },
  depth: { min: 20, max: 40, step: 1 },
  frameThickness: { min: 2, max: 4, step: 0.5 },
  topThickness: { min: 1.5, max: 4, step: 0.1 },
};

export const REFERENCE = {
  height: 140,
  width: 45,
  depth: 30,
  frameThickness: 3,
  wood: "dab",
  topThickness: 2,
};

export const WOODS = [
  {
    id: "sosna",
    name: "Sosna",
    pricePerM2At2cm: 190,
    color: "#e4c78a",
    edge: "#c6a15c",
    note: "Jasna, lekka",
  },
  {
    id: "buk",
    name: "Buk",
    pricePerM2At2cm: 310,
    color: "#d7a56a",
    edge: "#b07d45",
    note: "Równa, ciepła",
  },
  {
    id: "jesion",
    name: "Jesion",
    pricePerM2At2cm: 450,
    color: "#e6d3b0",
    edge: "#c4b08a",
    note: "Jasny rysunek",
  },
  {
    id: "dab",
    name: "Dąb",
    pricePerM2At2cm: 520,
    color: "#c48a3a",
    edge: "#8d5e22",
    note: "Twardy, klasyczny",
  },
  {
    id: "orzech",
    name: "Orzech",
    pricePerM2At2cm: 760,
    color: "#6e4630",
    edge: "#4a2e1e",
    note: "Ciemny, gęsty",
  },
];

// zł za metr bieżący profilu zamkniętego, z malowaniem proszkowym na czarno.
// 2 cm → 20×20, 3 cm → 30×30, 4 cm → 40×40. Wartości pomiędzy są liczone liniowo.
const FRAME_RATE_AT_2CM = 22;
const FRAME_RATE_AT_3CM = 32;
const FRAME_RATE_AT_4CM = 46;

const FINISH_PER_M2 = 80;
const LABOR_BASE = 200;
const LABOR_PER_METER = 17;

const woodById = new Map(WOODS.map((wood) => [wood.id, wood]));

function lerp(a0, v0, a1, v1, a) {
  return v0 + ((a - a0) / (a1 - a0)) * (v1 - v0);
}

export function frameRatePerMeter(thicknessCm) {
  if (thicknessCm <= 3) {
    return lerp(2, FRAME_RATE_AT_2CM, 3, FRAME_RATE_AT_3CM, thicknessCm);
  }
  return lerp(3, FRAME_RATE_AT_3CM, 4, FRAME_RATE_AT_4CM, thicknessCm);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function money(n) {
  return Math.round(n);
}

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

export function parseConfig(input = {}) {
  const fields = [];
  const height = Math.round(num(input.height));
  const width = Math.round(num(input.width));
  const depth = Math.round(num(input.depth));
  const frameThickness = round1(num(input.frameThickness));
  const topThickness = round1(num(input.topThickness));
  const wood = typeof input.wood === "string" ? input.wood : "";

  if (!inRange(height, LIMITS.height)) {
    fields.push(
      `Wysokość: od ${LIMITS.height.min} do ${LIMITS.height.max} cm.`,
    );
  }
  if (!inRange(width, LIMITS.width)) {
    fields.push(`Szerokość: od ${LIMITS.width.min} do ${LIMITS.width.max} cm.`);
  }
  if (!inRange(depth, LIMITS.depth)) {
    fields.push(`Głębokość: od ${LIMITS.depth.min} do ${LIMITS.depth.max} cm.`);
  }
  if (!inRange(frameThickness, LIMITS.frameThickness)) {
    fields.push(
      `Grubość ramy: od ${LIMITS.frameThickness.min} do ${LIMITS.frameThickness.max} cm.`,
    );
  }
  if (!inRange(topThickness, LIMITS.topThickness)) {
    fields.push(
      `Grubość blatu: od ${LIMITS.topThickness.min} do ${LIMITS.topThickness.max} cm.`,
    );
  }
  if (!woodById.has(wood)) {
    fields.push("Wybierz gatunek drewna na blat.");
  }

  if (fields.length) {
    return { ok: false, error: "Sprawdź konfigurację.", fields };
  }

  return {
    ok: true,
    config: { height, width, depth, frameThickness, wood, topThickness },
  };
}

function fmt(n, digits) {
  return n.toLocaleString("pl-PL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function priceQuote(config) {
  const { height, width, depth, frameThickness, wood, topThickness } = config;
  const species = woodById.get(wood);
  const postHeight = height - topThickness;
  const meters = (4 * (postHeight + width + depth)) / 100;
  const area = (width / 100) * (depth / 100);
  const steelRate = frameRatePerMeter(frameThickness);
  const steelExact = meters * steelRate;
  const woodRate = species.pricePerM2At2cm * (topThickness / 2);
  const woodExact = area * woodRate;
  const finishExact = area * FINISH_PER_M2;
  const laborExact = LABOR_BASE + meters * LABOR_PER_METER;
  const profile = Math.round(frameThickness * 10);

  const lines = [
    {
      id: "steel",
      label: "Rama stalowa",
      detail: `${fmt(meters, 1)} mb × ${fmt(steelRate, steelRate % 1 === 0 ? 0 : 2)} zł · profil ${profile}×${profile} mm`,
      amount: money(steelExact),
      exact: round2(steelExact),
    },
    {
      id: "top",
      label: `Blat · ${species.name.toLowerCase()}`,
      detail: `${width} × ${depth} cm · grubość ${fmt(topThickness, 1)} cm`,
      amount: money(woodExact),
      exact: round2(woodExact),
    },
    {
      id: "finish",
      label: "Olejowanie blatu",
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

  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  return {
    total,
    currency: "PLN",
    lines,
    steelMeters: round2(meters),
    topAreaM2: round2(area),
    clearance: {
      width: round1(Math.max(0, width - 2 * frameThickness)),
      depth: round1(Math.max(0, depth - 2 * frameThickness)),
      height: round1(Math.max(0, postHeight - 2 * frameThickness)),
    },
  };
}

const referencePriced = priceQuote(REFERENCE);

export function getCatalog() {
  return {
    limits: LIMITS,
    woods: WOODS,
    reference: REFERENCE,
    referenceTotal: referencePriced.total,
    referenceNote: "140 × 45 × 30 cm, rama 3 cm, blat dąb 2 cm",
    phone: "535 947 696",
    phoneHref: "tel:+48535947696",
  };
}

export function priceWithReference(config) {
  return { ...priceQuote(config), referenceTotal: referencePriced.total };
}

function assertPricing() {
  const failures = [];
  const quote = priceWithReference(REFERENCE);
  const sum = quote.lines.reduce((total, line) => total + line.amount, 0);

  if (quote.total !== 699) {
    failures.push(`Model ze zdjęcia ma kosztować 699 zł, wyszło ${quote.total}.`);
  }
  if (sum !== quote.total) {
    failures.push(`Suma pozycji ${sum} nie schodzi się z total ${quote.total}.`);
  }
  if (quote.referenceTotal !== 699) {
    failures.push("referenceTotal powinien wynosić 699.");
  }

  const pine = priceQuote({ ...REFERENCE, wood: "sosna" });
  const walnut = priceQuote({ ...REFERENCE, wood: "orzech" });
  if (!(walnut.total > quote.total && quote.total > pine.total)) {
    failures.push("Orzech powinien być droższy od dębu, a dąb od sosny.");
  }

  const thickFrame = priceQuote({ ...REFERENCE, frameThickness: 4 });
  const thinFrame = priceQuote({ ...REFERENCE, frameThickness: 2 });
  if (!(thickFrame.total > quote.total && quote.total > thinFrame.total)) {
    failures.push("Grubsza rama powinna podnosić cenę.");
  }

  const tall = priceQuote({ ...REFERENCE, height: 160 });
  const short = priceQuote({ ...REFERENCE, height: 100 });
  if (!(tall.total > quote.total && quote.total > short.total)) {
    failures.push("Wyższy stojak powinien być droższy.");
  }

  const thickTop = priceQuote({ ...REFERENCE, topThickness: 4 });
  if (!(thickTop.total > quote.total)) {
    failures.push("Grubszy blat powinien podnosić cenę.");
  }

  const wide = priceQuote({ ...REFERENCE, width: 80, depth: 40 });
  if (!(wide.total > quote.total)) {
    failures.push("Większy obrys powinien podnosić cenę.");
  }

  const bad = parseConfig({ ...REFERENCE, height: 90, wood: "mahon" });
  if (bad.ok) failures.push("Zła konfiguracja nie powinna przejść.");

  const good = parseConfig(REFERENCE);
  if (!good.ok) failures.push(`Poprawna konfiguracja odrzucona: ${good.error}`);

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`Model ze zdjęcia: ${quote.total} zł`);
  for (const line of quote.lines) {
    console.log(`  ${line.amount} zł  ${line.label} — ${line.detail}`);
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  assertPricing();
}
