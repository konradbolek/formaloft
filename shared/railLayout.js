function round1(n) {
  return Math.round(n * 10) / 10;
}

function barsInBay(opening, diameter, gapTarget) {
  if (!(opening > 0)) return { count: 0, gap: 0 };
  if (opening <= gapTarget) return { count: 0, gap: round1(opening) };
  let count = Math.ceil((opening - gapTarget) / (diameter + gapTarget) - 1e-9);
  let gap = (opening - count * diameter) / (count + 1);
  while (count > 0 && gap < 0) {
    count -= 1;
    gap = (opening - count * diameter) / (count + 1);
  }
  return { count: Math.max(0, count), gap: round1(Math.max(0, gap)) };
}

function centersAlong(start, end, spacing) {
  const between = Math.max(0, end - start);
  const spans = Math.max(1, Math.ceil(between / spacing - 1e-9));
  const step = between / spans;
  const points = [];
  for (let index = 0; index <= spans; index += 1) points.push(start + index * step);
  return { points, spans };
}

function fillBays(points, postAlong, diameter, gapTarget, horizontal, opening) {
  let maxGap = 0;
  let tight = false;
  const bays = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index] + postAlong / 2;
    const right = points[index + 1] - postAlong / 2;
    const bayClear = right - left;
    if (bayClear < diameter) tight = true;
    const packed = horizontal
      ? barsInBay(opening, diameter, gapTarget)
      : barsInBay(Math.max(0, bayClear), diameter, gapTarget);
    maxGap = Math.max(maxGap, packed.gap, horizontal ? 0 : bayClear <= gapTarget ? bayClear : 0);
    const items = [];
    for (let bar = 0; bar < packed.count; bar += 1) {
      const offset = packed.gap + diameter / 2 + bar * (packed.gap + diameter);
      items.push(horizontal ? { along: (left + right) / 2, cross: offset, length: Math.max(0, bayClear) } : { along: left + offset });
    }
    bays.push({ items, bayClear });
  }
  return { bays, maxGap: round1(maxGap), tight };
}

/**
 * Barierka z czołem i opcjonalnymi bokami od ściany do czoła.
 * Narożny słupek liczy się raz. Prześwit z suwaka jest górną granicą.
 * bars: "pion" albo "poziom". fill: "pret" albo "profil".
 * sides: "brak", "lewa", "prawa", "obie".
 */
export function railLayout(config) {
  const length = config.length;
  const height = config.height;
  const postWidth = config.postWidth;
  const postDepth = config.postDepth;
  const postSpacing = config.postSpacing;
  const handrailWidth = config.handrailWidth;
  const handrailThickness = config.handrailThickness;
  const bottom = Boolean(config.bottom);
  const bottomWidth = config.bottomWidth;
  const bottomThickness = bottom ? config.bottomThickness : 0;
  const floorGap = Math.max(0, config.floorGap || 0);
  const member = config.fill === "profil" ? config.fillWidth || 2 : config.barDiameter;
  const barGap = config.barGap;
  const horizontal = config.bars === "poziom";
  const sideLength = config.sideLength || 110;
  const sides = config.sides || "brak";
  const faceMount = config.mount === "czolo";
  const slabThickness = config.slabThickness || 0;
  const leftOn = sides === "lewa" || sides === "obie";
  const rightOn = sides === "prawa" || sides === "obie";
  const y0 = faceMount ? -slabThickness : 0;
  const barBottom = floorGap + (bottom ? bottomThickness : 0);
  const opening = height - handrailThickness - bottomThickness - floorGap;
  const frontZ = sideLength - postDepth / 2;

  const frontLine = centersAlong(-length / 2 + postWidth / 2, length / 2 - postWidth / 2, postSpacing);
  const frontFill = fillBays(frontLine.points, postWidth, member, barGap, horizontal, opening);

  const posts = frontLine.points.map((x) => ({ x, z: frontZ, y0, y1: height, face: "front" }));
  const rails = [
    {
      axis: "x",
      x: 0,
      z: frontZ,
      length,
      cross: handrailWidth,
      role: "handrail",
    },
  ];
  if (bottom) {
    rails.push({ axis: "x", x: 0, z: frontZ, length, cross: bottomWidth, role: "bottom" });
  }

  const bars = [];
  for (const bay of frontFill.bays) {
    for (const item of bay.items) {
      if (horizontal) {
        bars.push({ axis: "x", run: "x", x: item.along, y: barBottom + item.cross, z: frontZ, length: item.length });
      } else {
        bars.push({
          axis: "y",
          run: "x",
          x: item.along,
          y: barBottom + opening / 2,
          z: frontZ,
          length: opening,
        });
      }
    }
  }

  let maxGap = frontFill.maxGap;
  let tight = frontFill.tight;
  let handrailCm = length;
  let bottomCm = bottom ? length : 0;
  const sideRun = sideLength - postDepth / 2 - handrailWidth / 2;

  const addSide = (face) => {
    const x = face === "left" ? -length / 2 + postWidth / 2 : length / 2 - postWidth / 2;
    const sideLine = centersAlong(postDepth / 2, frontZ, postSpacing);
    const owned = sideLine.points.slice(0, -1);
    const sideFill = fillBays(sideLine.points, postDepth, member, barGap, horizontal, opening);
    maxGap = Math.max(maxGap, sideFill.maxGap);
    tight = tight || sideFill.tight;
    for (const z of owned) posts.push({ x, z, y0, y1: height, face });
    rails.push({
      axis: "z",
      x,
      z: sideRun / 2,
      length: sideRun,
      cross: handrailWidth,
      role: "handrail",
    });
    handrailCm += sideRun;
    if (bottom) {
      rails.push({ axis: "z", x, z: sideRun / 2, length: sideRun, cross: bottomWidth, role: "bottom" });
      bottomCm += sideRun;
    }
    for (const bay of sideFill.bays) {
      for (const item of bay.items) {
        if (horizontal) {
          bars.push({ axis: "z", run: "z", x, y: barBottom + item.cross, z: item.along, length: item.length });
        } else {
          bars.push({ axis: "y", run: "z", x, y: barBottom + opening / 2, z: item.along, length: opening });
        }
      }
    }
  };

  if (leftOn) addSide("left");
  if (rightOn) addSide("right");

  const warnings = [];
  if (height < 110) {
    warnings.push(
      `Wysokość ma ${round1(height)} cm. Przy balkonie zwykle zostawia się co najmniej 110 cm.`,
    );
  }
  if (floorGap > 12) {
    warnings.push(
      `Od płyty zostaje ${round1(floorGap)} cm. Powyżej 12 cm przy balkonie zwykle jest za szeroko.`,
    );
  }
  if (maxGap > 12) {
    warnings.push(
      `Prześwit ma ${maxGap.toLocaleString("pl-PL")} cm. Powyżej 12 cm przy balkonie zwykle jest za szeroko.`,
    );
  }

  const barCm = bars.reduce((sum, bar) => sum + Math.max(0, bar.length), 0);

  return {
    postCount: posts.length,
    barCount: bars.length,
    maxGap,
    tight,
    sideRun: round1(Math.max(0, sideRun)),
    handrailCm: round1(handrailCm),
    bottomCm: round1(bottomCm),
    barCm: round1(barCm),
    postSteelLength: round1(height + (faceMount ? slabThickness : 0)),
    posts,
    rails,
    bars,
    warnings,
  };
}
