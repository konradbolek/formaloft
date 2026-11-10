import { pathToFileURL } from "node:url";
import { LABOR_PER_METER, PAINTS, frameRatePerMeter } from "./pricing.js";
import { railLayout } from "../../shared/railLayout.js";

/**
 * Barierka balkonowa. Profile słupka, pochwytu i rygla biorą stawkę ramy mebla.
 * Pręt wypełnienia ma własną, niższą stawkę. Profil wypełnienia liczy się jak rama.
 * To ceny startowe, do poprawy
 * po pierwszej realizacji z prawdziwą kwotą.
 */

export const RAIL_LIMITS = {
  length: { min: 80, max: 600, step: 1 },
  height: { min: 80, max: 130, step: 1 },
  postWidth: { min: 3, max: 6, step: 1 },
  postDepth: { min: 3, max: 6, step: 1 },
  postSpacing: { min: 80, max: 160, step: 5 },
  handrailWidth: { min: 3, max: 8, step: 1 },
  handrailThickness: { min: 2, max: 5, step: 1 },
  bottomWidth: { min: 2, max: 5, step: 1 },
  bottomThickness: { min: 2, max: 4, step: 1 },
  barDiameter: { min: 1, max: 2, step: 0.2 },
  fillWidth: { min: 1, max: 4, step: 1 },
  fillDepth: { min: 1, max: 4, step: 1 },
  barGap: { min: 6, max: 18, step: 1 },
  floorGap: { min: 0, max: 20, step: 1 },
  slabThickness: { min: 12, max: 24, step: 1 },
  sideLength: { min: 60, max: 220, step: 1 },
};

export const RAIL_REFERENCE = {
  length: 300,
  height: 110,
  postWidth: 4,
  postDepth: 4,
  postSpacing: 120,
  handrailWidth: 4,
  handrailThickness: 2,
  bottom: true,
  bottomWidth: 2,
  bottomThickness: 2,
  floorGap: 0,
  barDiameter: 1.2,
  fill: "pret",
  fillWidth: 2,
  fillDepth: 2,
  barGap: 11,
  mount: "plyta",
  slabThickness: 16,
  sides: "obie",
  sideLength: 110,
  bars: "pion",
  paint: "czern",
};

const BAR_RATE_AT_1CM = 8;
const BAR_RATE_AT_2CM = 18;
const RAIL_LABOR_BASE = 280;
const RAIL_LABOR_PER_BAR = 12;

const paintById = new Map(PAINTS.map((paint) => [paint.id, paint]));

function lerp(a0, v0, a1, v1, a) {
  return v0 + ((a - a0) / (a1 - a0)) * (v1 - v0);
}

function barRatePerMeter(diameterCm) {
  return lerp(1, BAR_RATE_AT_1CM, 2, BAR_RATE_AT_2CM, diameterCm);
}

function profileRate(widthCm, depthCm) {
  return (frameRatePerMeter(widthCm) + frameRatePerMeter(depthCm)) / 2;
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

function snapCm(value, limit) {
  const steps = Math.round((value - limit.min) / limit.step);
  const snapped = limit.min + steps * limit.step;
  const rounded = Math.round(snapped * 1000) / 1000;
  return Math.min(limit.max, Math.max(limit.min, rounded));
}

function flag(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return fallback;
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

function readOrDefault(input, key, limit, label, fields, fallback) {
  if (input[key] === undefined || input[key] === null || input[key] === "") return fallback;
  return readSection(input, key, limit, label, fields);
}

function readSection(input, key, limit, label, fields) {
  let value = round1(num(input[key]));
  if (!inRange(value, limit)) {
    fields.push(`${label}: od ${fmt(limit.min, limit.step < 1 ? 1 : 0)} do ${fmt(limit.max, limit.step < 1 ? 1 : 0)} cm.`);
    return value;
  }
  return snapCm(value, limit);
}

export function parseRailConfig(input = {}) {
  const fields = [];
  const limits = RAIL_LIMITS;
  const length = Math.round(num(input.length));
  const height = Math.round(num(input.height));
  const postSpacing = Math.round(num(input.postSpacing));
  const barGap = Math.round(num(input.barGap));
  const slabThickness = Math.round(num(input.slabThickness));
  const sideLength =
    input.sideLength === undefined || input.sideLength === null || input.sideLength === ""
      ? 110
      : Math.round(num(input.sideLength));
  const postWidth = readSection(input, "postWidth", limits.postWidth, "Szerokość słupka", fields);
  const postDepth = readSection(input, "postDepth", limits.postDepth, "Głębokość słupka", fields);
  const handrailWidth = readSection(input, "handrailWidth", limits.handrailWidth, "Szerokość pochwytu", fields);
  const handrailThickness = readSection(
    input,
    "handrailThickness",
    limits.handrailThickness,
    "Grubość pochwytu",
    fields,
  );
  const bottomWidth = readSection(input, "bottomWidth", limits.bottomWidth, "Szerokość rygla", fields);
  const bottomThickness = readSection(
    input,
    "bottomThickness",
    limits.bottomThickness,
    "Grubość rygla",
    fields,
  );
  const barDiameter = readSection(input, "barDiameter", limits.barDiameter, "Średnica pręta", fields);
  const fill = input.fill === "profil" ? "profil" : "pret";
  const fillWidth = readOrDefault(input, "fillWidth", limits.fillWidth, "Szerokość profilu", fields, 2);
  const fillDepth = readOrDefault(input, "fillDepth", limits.fillDepth, "Grubość profilu", fields, 2);
  const bottom = flag(input.bottom, true);
  const floorGap =
    input.floorGap === undefined || input.floorGap === null || input.floorGap === ""
      ? 0
      : Math.round(num(input.floorGap));
  const mount = input.mount === "czolo" || input.mount === "plyta" ? input.mount : "";
  const sides = ["brak", "lewa", "prawa", "obie"].includes(input.sides) ? input.sides : "brak";
  const bars = input.bars === "poziom" ? "poziom" : "pion";
  const paint =
    typeof input.paint === "string" && input.paint.trim() !== "" ? input.paint : "czern";

  if (!inRange(length, limits.length)) {
    fields.push(`Długość: od ${limits.length.min} do ${limits.length.max} cm.`);
  }
  if (!inRange(height, limits.height)) {
    fields.push(`Wysokość: od ${limits.height.min} do ${limits.height.max} cm.`);
  }
  if (!inRange(postSpacing, limits.postSpacing)) {
    fields.push(`Rozstaw słupków: od ${limits.postSpacing.min} do ${limits.postSpacing.max} cm.`);
  }
  if (!inRange(barGap, limits.barGap)) {
    fields.push(`Prześwit: od ${limits.barGap.min} do ${limits.barGap.max} cm.`);
  }
  if (!inRange(floorGap, limits.floorGap)) {
    fields.push(`Odstęp od płyty: od ${limits.floorGap.min} do ${limits.floorGap.max} cm.`);
  }
  if (!inRange(slabThickness, limits.slabThickness)) {
    fields.push(`Grubość płyty: od ${limits.slabThickness.min} do ${limits.slabThickness.max} cm.`);
  }
  if (!inRange(sideLength, limits.sideLength)) {
    fields.push(`Wysięg od ściany: od ${limits.sideLength.min} do ${limits.sideLength.max} cm.`);
  }
  if (!mount) fields.push("Wybierz mocowanie: na płycie albo do czoła.");
  if (!paintById.has(paint)) fields.push("Wybierz kolor malowania stali.");

  if (
    inRange(height, limits.height) &&
    inRange(handrailThickness, limits.handrailThickness) &&
    inRange(bottomThickness, limits.bottomThickness)
  ) {
    const taken = handrailThickness + (bottom ? bottomThickness : 0) + (inRange(floorGap, limits.floorGap) ? floorGap : 0);
    if (height - taken < 15) {
      fields.push("Pochwyt, rygiel i odstęp od płyty zostawiają mniej niż 15 cm na wypełnienie.");
    }
  }
  const member = fill === "profil" ? fillWidth : barDiameter;
  if (Number.isFinite(member) && inRange(barGap, limits.barGap) && member >= barGap) {
    fields.push(fill === "profil" ? "Profil jest szerszy niż ustawiony prześwit." : "Pręt jest grubszy niż ustawiony prześwit.");
  }
  if (
    inRange(length, limits.length) &&
    inRange(postWidth, limits.postWidth) &&
    inRange(postSpacing, limits.postSpacing) &&
    length - postWidth < postWidth
  ) {
    fields.push("Słupki nie mieszczą się w tej długości.");
  }

  if (fields.length) return { ok: false, error: "Sprawdź konfigurację.", fields };

  const config = {
    length,
    height,
    postWidth,
    postDepth,
    postSpacing,
    handrailWidth,
    handrailThickness,
    bottom,
    bottomWidth,
    bottomThickness,
    floorGap,
    barDiameter,
    fill,
    fillWidth,
    fillDepth,
    barGap,
    mount,
    slabThickness,
    sides,
    sideLength,
    bars,
    paint,
  };
  const layout = railLayout(config);
  if (sides !== "brak" && layout.sideRun < 20) {
    fields.push("Bok jest za krótki. Pochwyt nie schodzi od ściany do czoła.");
  }
  if (layout.tight) {
    fields.push("Między słupkami nie zostaje miejsca na wypełnienie. Zwiększ rozstaw albo zmniejsz słupek.");
  }
  if (fields.length) return { ok: false, error: "Sprawdź konfigurację.", fields };

  return { ok: true, config };
}

export function priceRail(config) {
  const layout = railLayout(config);
  const finish = paintById.get(config.paint) || paintById.get("czern");
  const postMeters = (layout.postCount * layout.postSteelLength) / 100;
  const railMeters = layout.handrailCm / 100;
  const bottomMeters = layout.bottomCm / 100;
  const barMeters = layout.barCm / 100;
  const postRate = profileRate(config.postWidth, config.postDepth);
  const handrailRate = profileRate(config.handrailWidth, config.handrailThickness);
  const bottomRate = profileRate(config.bottomWidth, config.bottomThickness);
  const profileFill = config.fill === "profil";
  const fillRate = profileFill
    ? profileRate(config.fillWidth, config.fillDepth)
    : barRatePerMeter(config.barDiameter);
  const fillSection = profileFill
    ? `${config.fillWidth}×${config.fillDepth} cm`
    : `ø ${fmt(config.barDiameter, 1)} cm`;
  const structuralMeters = postMeters + railMeters + bottomMeters;
  const laborExact = RAIL_LABOR_BASE + structuralMeters * LABOR_PER_METER + layout.barCount * RAIL_LABOR_PER_BAR;
  const mountNote = config.mount === "czolo" ? `do czoła, płyta ${config.slabThickness} cm` : "na płycie";

  const lines = [
    {
      id: "posts",
      label: "Słupki",
      detail: `${layout.postCount} szt. × ${fmt(layout.postSteelLength, 1)} cm · ${config.postWidth}×${config.postDepth} cm · ${fmt(postMeters, 2)} mb × ${fmt(postRate, 0)} zł · ${mountNote}`,
      amount: money(postMeters * postRate),
    },
    {
      id: "handrail",
      label: "Pochwyt",
      detail: `${fmt(layout.handrailCm, 0)} cm · ${config.handrailWidth}×${config.handrailThickness} cm · ${fmt(railMeters, 2)} mb × ${fmt(handrailRate, 0)} zł · ${finish.name.toLowerCase()}`,
      amount: money(railMeters * handrailRate),
    },
  ];

  if (config.bottom) {
    lines.push({
      id: "bottom",
      label: "Rygiel dolny",
      detail: `${fmt(layout.bottomCm, 0)} cm · ${config.bottomWidth}×${config.bottomThickness} cm · ${fmt(bottomMeters, 2)} mb × ${fmt(bottomRate, 0)} zł`,
      amount: money(bottomMeters * bottomRate),
    });
  }

  lines.push(
    {
      id: "bars",
      label: profileFill ? "Profile" : "Pręty",
      detail: `${layout.barCount} szt. · ${config.bars === "poziom" ? "poziomo" : "pionowo"} · ${fillSection} · prześwit ${fmt(layout.maxGap, 1)} cm · ${fmt(barMeters, 2)} mb × ${fmt(fillRate, 0)} zł`,
      amount: money(barMeters * fillRate),
    },
    {
      id: "labor",
      label: "Robocizna",
      detail: "Cięcie, spawanie, szlif i malowanie proszkowe",
      amount: money(laborExact),
    },
  );

  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return {
    total,
    currency: "PLN",
    lines,
    steelMeters: round2(structuralMeters + barMeters),
    postCount: layout.postCount,
    barCount: layout.barCount,
    gap: layout.maxGap,
    warnings: layout.warnings,
  };
}

const referencePriced = priceRail(RAIL_REFERENCE);

export function getRailCatalog() {
  return {
    limits: RAIL_LIMITS,
    paints: PAINTS,
    reference: RAIL_REFERENCE,
    referenceTotal: referencePriced.total,
    referenceNote:
      "300 × 110 cm, wysięg 110 cm, boki od ściany, słupek 4×4 cm, pochwyt 4×2 cm, rygiel 2×2 cm, pręty pionowe 1,2 cm, prześwit do 11 cm, na płycie",
    phone: "535 947 696",
    phoneHref: "tel:+48535947696",
  };
}

export function priceRailWithReference(config) {
  return { ...priceRail(config), referenceTotal: referencePriced.total };
}

function assertRailPricing() {
  const failures = [];
  const parsed = parseRailConfig(RAIL_REFERENCE);
  if (!parsed.ok) failures.push(`Model wyjściowy odrzucony: ${parsed.fields.join(" ")}`);
  const quote = priceRailWithReference(RAIL_REFERENCE);
  const sum = quote.lines.reduce((total, line) => total + line.amount, 0);
  if (sum !== quote.total) failures.push(`Suma pozycji ${sum} nie schodzi się z total ${quote.total}.`);
  if (quote.referenceTotal !== quote.total) failures.push("referenceTotal modelu wyjściowego się rozjechał.");
  if (quote.warnings.length) failures.push("Model 110 cm i prześwit 11 cm nie powinien mieć uwag.");

  const white = priceRail({ ...RAIL_REFERENCE, paint: "biel" });
  if (white.total !== quote.total) failures.push("Kolor malowania nie powinien zmieniać ceny barierki.");

  const thickerSlab = priceRail({ ...RAIL_REFERENCE, slabThickness: 24 });
  if (thickerSlab.total !== quote.total) {
    failures.push("Grubość płyty na mocowaniu od góry nie powinna zmieniać ceny.");
  }

  const face = priceRail({ ...RAIL_REFERENCE, mount: "czolo" });
  if (!(face.total > quote.total)) failures.push("Mocowanie do czoła powinno wydłużać słupki i podnosić cenę.");

  const longer = priceRail({ ...RAIL_REFERENCE, length: 500 });
  if (!(longer.total > quote.total)) failures.push("Dłuższa barierka powinna być droższa.");

  const dense = priceRail({ ...RAIL_REFERENCE, barGap: 6 });
  if (!(dense.barCount > quote.barCount && dense.total > quote.total)) {
    failures.push("Mniejszy prześwit powinien dokładać pręty i podnosić cenę.");
  }

  const wide = priceRail({ ...RAIL_REFERENCE, barGap: 16 });
  if (!wide.warnings.some((line) => line.includes("12 cm"))) {
    failures.push("Prześwit powyżej 12 cm powinien dać uwagę, nie blokadę.");
  }

  const low = priceRail({ ...RAIL_REFERENCE, height: 90 });
  if (!(low.total < quote.total) || !low.warnings.some((line) => line.includes("110 cm"))) {
    failures.push("Niższa barierka powinna być tańsza i dostać uwagę o 110 cm.");
  }

  const open = priceRail({ ...RAIL_REFERENCE, bottom: false });
  if (!(open.total < quote.total)) failures.push("Barierka bez rygla powinna być tańsza.");

  const thickPost = priceRail({ ...RAIL_REFERENCE, postWidth: 6, postDepth: 6 });
  if (!(thickPost.total > quote.total)) failures.push("Grubszy słupek powinien podnosić cenę.");

  const frontOnly = priceRail({ ...RAIL_REFERENCE, sides: "brak" });
  if (!(quote.total > frontOnly.total && quote.postCount > frontOnly.postCount)) {
    failures.push("Boki od ściany powinny dokładać słupki i podnosić cenę.");
  }
  const frontDepth = priceRail({ ...RAIL_REFERENCE, sides: "brak", sideLength: 180 });
  if (frontDepth.total !== frontOnly.total) {
    failures.push("Wysięg bez boków nie powinien zmieniać ceny.");
  }
  const longerSide = priceRail({ ...RAIL_REFERENCE, sideLength: 180 });
  if (!(longerSide.total > quote.total)) failures.push("Dłuższy bok powinien podnosić cenę.");

  const horizontal = priceRail({ ...RAIL_REFERENCE, bars: "poziom" });
  if (!(horizontal.barCount > 0)) failures.push("Poziome pręty powinny się policzyć.");
  const plain = parseRailConfig({
    ...RAIL_REFERENCE,
    sides: undefined,
    bars: undefined,
    sideLength: undefined,
    fill: undefined,
    fillWidth: undefined,
    fillDepth: undefined,
  });
  if (
    !plain.ok ||
    plain.config.sides !== "brak" ||
    plain.config.bars !== "pion" ||
    plain.config.sideLength !== 110 ||
    plain.config.fill !== "pret" ||
    plain.config.fillWidth !== 2
  ) {
    failures.push("Brak boków, kierunku i wypełnienia powinien wrócić do czoła, pionu i prętów.");
  }

  const profiles = priceRail({ ...RAIL_REFERENCE, fill: "profil" });
  if (!(profiles.total > quote.total && profiles.barCount > 0)) {
    failures.push("Profil w wypełnieniu powinien być droższy niż pręt 1,2 cm.");
  }
  const thickFill = priceRail({ ...RAIL_REFERENCE, fill: "profil", fillWidth: 4, fillDepth: 4 });
  if (!(thickFill.total > profiles.total)) failures.push("Grubszy profil wypełnienia powinien podnosić cenę.");
  const ignoredProfile = priceRail({ ...RAIL_REFERENCE, fillWidth: 4, fillDepth: 4 });
  if (ignoredProfile.total !== quote.total) {
    failures.push("Wymiar profilu przy prętach nie powinien zmieniać ceny.");
  }

  const lifted = priceRail({ ...RAIL_REFERENCE, floorGap: 8 });
  if (!(lifted.total < quote.total) || lifted.postCount !== quote.postCount) {
    failures.push("Odstęp od płyty powinien skracać wypełnienie i obniżać cenę, bez ruszania słupków.");
  }
  const tallGap = priceRail({ ...RAIL_REFERENCE, floorGap: 16 });
  if (!tallGap.warnings.some((line) => line.includes("Od płyty"))) {
    failures.push("Odstęp od płyty powyżej 12 cm powinien dać uwagę, nie blokadę.");
  }
  const missingGap = parseRailConfig({ ...RAIL_REFERENCE, floorGap: undefined });
  if (!missingGap.ok || missingGap.config.floorGap !== 0) {
    failures.push("Brak odstępu od płyty powinien być zerem.");
  }

  const bad = parseRailConfig({ ...RAIL_REFERENCE, height: 40, paint: "zloto" });
  if (bad.ok) failures.push("Zła konfiguracja barierki nie powinna przejść.");

  const missingPaint = parseRailConfig({ ...RAIL_REFERENCE, paint: undefined });
  if (!missingPaint.ok || missingPaint.config.paint !== "czern") {
    failures.push("Brak koloru powinien oznaczać czerń.");
  }

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`Barierka wyjściowa: ${quote.total} zł`);
  for (const line of quote.lines) {
    console.log(`  ${line.amount} zł  ${line.label} — ${line.detail}`);
  }
  console.log(`  słupki ${quote.postCount}, pręty ${quote.barCount}, prześwit ${quote.gap} cm`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) assertRailPricing();
