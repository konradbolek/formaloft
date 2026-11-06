import { useEffect, useRef } from "react";
import * as THREE from "three";

function hashSeed(parts) {
  let seed = 2166136261;
  const text = parts.join("|");
  for (let i = 0; i < text.length; i += 1) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(draw) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  draw(canvas.getContext("2d"), canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function woodTexture(color, edge) {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i += 1) {
      const y = (i / 46) * h + Math.sin(i * 1.7) * 6;
      ctx.strokeStyle = edge;
      ctx.globalAlpha = 0.18 + (i % 5) * 0.05;
      ctx.lineWidth = i % 7 === 0 ? 2.4 : 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 24) {
        ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 4);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = edge;
      ctx.fillRect((i * 67) % w, 0, 3, h);
    }
  });
}

function endGrainTexture(rand) {
  return canvasTexture((ctx, w, h) => {
    const woods = [
      { face: "#f2e2c6", early: "#f7ead4", late: "#7a4e2c", ray: "#e7d3b0", bark: "#3c2a1e" },
      { face: "#e7c48a", early: "#f0d2a4", late: "#6a3e22", ray: "#efd0a2", bark: "#3a2618" },
      { face: "#f6efe2", early: "#fbf6ec", late: "#8a6a48", ray: "#efe4d2", bark: "#4a3b30" },
      { face: "#e8d2ae", early: "#f3e0c2", late: "#6e4224", ray: "#edd4b0", bark: "#3e291c" },
    ];
    const wood = woods[Math.floor(rand() * woods.length)];
    const cx = w * (0.47 + rand() * 0.06);
    const cy = h * (0.47 + rand() * 0.06);
    const squash = 0.9 + rand() * 0.12;
    const phase = rand() * Math.PI * 2;

    ctx.fillStyle = wood.bark;
    ctx.fillRect(0, 0, w, h);

    const face = ctx.createRadialGradient(cx, cy, w * 0.05, cx, cy, w * 0.48);
    face.addColorStop(0, wood.early);
    face.addColorStop(0.72, wood.face);
    face.addColorStop(1, wood.late);
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.47, 0, Math.PI * 2);
    ctx.fill();

    const ring = (radius, color, width, alpha) => {
      ctx.beginPath();
      const steps = 72;
      for (let i = 0; i <= steps; i += 1) {
        const angle = (i / steps) * Math.PI * 2;
        const drift = 1
          + Math.sin(angle * 2 + phase) * 0.045
          + Math.sin(angle * 5 - phase) * 0.02
          + Math.sin(angle * 11 + radius) * 0.012;
        const x = cx + Math.cos(angle) * radius * drift;
        const y = cy + Math.sin(angle) * radius * squash * drift;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      ctx.stroke();
    };

    const years = 7 + Math.floor(rand() * 3);
    for (let year = years; year >= 1; year -= 1) {
      const t = year / years;
      const radius = w * (0.07 + t * 0.34 + rand() * 0.012);
      ring(radius, wood.late, w * (0.014 + rand() * 0.016), 0.82 + rand() * 0.15);
    }

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = wood.ray;
    ctx.lineWidth = 1;
    const rays = 22 + Math.floor(rand() * 10);
    for (let i = 0; i < rays; i += 1) {
      const angle = (i / rays) * Math.PI * 2 + rand() * 0.08;
      const inner = w * (0.04 + rand() * 0.04);
      const outer = w * (0.28 + rand() * 0.16);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner * squash);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer * squash);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = wood.late;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.018, h * 0.014, rand(), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#5a3b24";
    ctx.lineWidth = Math.max(1.4, w * 0.008);
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.55;
    const cracks = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < cracks; i += 1) {
      const angle = rand() * Math.PI * 2;
      const reach = w * (0.12 + rand() * 0.22);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(
        cx + Math.cos(angle + 0.3) * reach * 0.45,
        cy + Math.sin(angle + 0.3) * reach * 0.45,
        cx + Math.cos(angle) * reach,
        cy + Math.sin(angle) * reach * squash,
      );
      ctx.stroke();
    }

    if (rand() > 0.62) {
      const knotX = cx + (rand() - 0.5) * w * 0.36;
      const knotY = cy + (rand() - 0.5) * h * 0.36;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = wood.late;
      ctx.beginPath();
      ctx.ellipse(knotX, knotY, w * 0.028, h * 0.02, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 700; i += 1) {
      const angle = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * w * 0.42;
      ctx.fillStyle = rand() > 0.5 ? "#fff8ee" : wood.late;
      ctx.fillRect(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 1.3, 1.3);
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = wood.bark;
    ctx.lineWidth = w * 0.055;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.445, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

function barkTexture(rand) {
  return canvasTexture((ctx, w, h) => {
    const weathered = rand() > 0.55;
    ctx.fillStyle = weathered ? "#6e5b4c" : "#3f2c22";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 42; i += 1) {
      const x = (i / 42) * w + Math.sin(i * 1.4) * 5;
      ctx.strokeStyle = rand() > 0.45 ? (weathered ? "#d5cdc2" : "#8a6852") : "#1c120e";
      ctx.globalAlpha = 0.28 + rand() * 0.4;
      ctx.lineWidth = 1 + rand() * (weathered ? 4 : 2.4);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(
        x + rand() * 16 - 8,
        h * 0.33,
        x + rand() * 16 - 8,
        h * 0.68,
        x + rand() * 8 - 4,
        h,
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 80; i += 1) {
      ctx.fillStyle = rand() > 0.8 ? "#efe6da" : "#140e0b";
      ctx.fillRect(rand() * w, rand() * h, 3 + rand() * 20, 2 + rand() * 7);
    }
    ctx.globalAlpha = 1;
  });
}

function splitTexture(rand) {
  return canvasTexture((ctx, w, h) => {
    const hue = 30 + rand() * 10;
    ctx.fillStyle = `hsl(${hue}, 36%, 74%)`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 56; i += 1) {
      const y = ((i + rand()) / 56) * h;
      ctx.strokeStyle = `hsl(${hue - 6}, 28%, ${52 + (i % 4) * 8}%)`;
      ctx.globalAlpha = 0.28 + (i % 3) * 0.08;
      ctx.lineWidth = i % 6 === 0 ? 3.2 : 1.1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + 5, w * 0.7, y - 4, w, y + 1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

function logSection(profile, radius, rand) {
  const phase = rand() * Math.PI * 2;
  const raw = [];
  const arc = (start, end, steps) => {
    for (let i = 0; i < steps; i += 1) {
      const angle = start + (end - start) * (i / steps);
      const wobble = 1 + Math.sin(angle * 2 + phase) * 0.018 + Math.sin(angle * 5 - phase) * 0.01;
      raw.push([Math.cos(angle) * radius * wobble, Math.sin(angle) * radius * wobble]);
    }
  };
  const flatPairs = [];
  if (profile === "round") {
    arc(0, Math.PI * 2, 30);
  } else if (profile === "half") {
    arc(0.05, Math.PI - 0.05, 16);
    flatPairs.push([raw.length - 1, 0]);
  } else {
    arc(-0.15, Math.PI * 0.58, 12);
    const arcEnd = raw.length - 1;
    raw.push([radius * 0.08, radius * 0.02]);
    flatPairs.push([arcEnd, raw.length - 1]);
    flatPairs.push([raw.length - 1, 0]);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of raw) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const originX = (minX + maxX) / 2;
  const originY = (minY + maxY) / 2;
  const points = raw.map(([x, y]) => new THREE.Vector2(x - originX, y - originY));
  return {
    shape: new THREE.Shape(points),
    points,
    flatEdges: flatPairs.map(([a, b]) => ({
      ax: raw[a][0] - originX,
      ay: raw[a][1] - originY,
      bx: raw[b][0] - originX,
      by: raw[b][1] - originY,
    })),
  };
}

function remapSurfaceUVs(geometry, length) {
  const uv = geometry.attributes.uv;
  const pos = geometry.attributes.position;
  const index = geometry.index;
  const caps = geometry.groups[0];
  const sides = geometry.groups[1];
  if (!caps) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const capIds = [];
  for (let i = caps.start; i < caps.start + caps.count; i += 1) {
    const vertex = index ? index.getX(i) : i;
    capIds.push(vertex);
    minX = Math.min(minX, pos.getX(vertex));
    maxX = Math.max(maxX, pos.getX(vertex));
    minY = Math.min(minY, pos.getY(vertex));
    maxY = Math.max(maxY, pos.getY(vertex));
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const seen = new Set();
  for (const vertex of capIds) {
    if (seen.has(vertex)) continue;
    seen.add(vertex);
    uv.setXY(
      vertex,
      (pos.getX(vertex) - centerX) / span + 0.5,
      (pos.getY(vertex) - centerY) / span + 0.5,
    );
  }

  if (sides) {
    for (let i = sides.start; i < sides.start + sides.count; i += 1) {
      const vertex = index ? index.getX(i) : i;
      const angle = Math.atan2(pos.getY(vertex), pos.getX(vertex));
      uv.setXY(vertex, ((angle + Math.PI) / (Math.PI * 2)) * 2, (pos.getZ(vertex) / length + 0.5) * 3);
    }
  }
  uv.needsUpdate = true;
}

function makeLog(profile, radius, length, rand, endMat, barkMat, splitMat, bucket) {
  const section = logSection(profile, radius, rand);
  const geometry = new THREE.ExtrudeGeometry(section.shape, { depth: length, bevelEnabled: false, steps: 1 });
  geometry.translate(0, 0, -length / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const taper = 1 - (pos.getZ(i) / length) * 0.02;
    pos.setX(i, pos.getX(i) * taper);
    pos.setY(i, pos.getY(i) * taper);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  remapSurfaceUVs(geometry, length);

  const holder = new THREE.Group();
  const body = new THREE.Mesh(geometry, [endMat, barkMat]);
  body.castShadow = true;
  body.receiveShadow = true;
  holder.add(body);
  remember(bucket.geometries, geometry);
  remember(bucket.materials, [endMat, barkMat]);

  for (const edge of section.flatEdges) {
    const dx = edge.bx - edge.ax;
    const dy = edge.by - edge.ay;
    const width = Math.hypot(dx, dy);
    if (width < 0.4) continue;
    let nx = -dy;
    let ny = dx;
    const midX = (edge.ax + edge.bx) / 2;
    const midY = (edge.ay + edge.by) / 2;
    if (nx * midX + ny * midY < 0) {
      nx = -nx;
      ny = -ny;
    }
    const normalLength = Math.hypot(nx, ny) || 1;
    nx /= normalLength;
    ny /= normalLength;
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.97, length * 0.96), splitMat);
    cover.castShadow = true;
    cover.receiveShadow = true;
    cover.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(
        new THREE.Vector3(dx, dy, 0).normalize(),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(nx, ny, 0),
      ),
    );
    cover.position.set(midX + nx * 0.12, midY + ny * 0.12, 0);
    holder.add(cover);
    remember(bucket.geometries, cover.geometry);
    remember(bucket.materials, splitMat);
  }

  holder.userData.points = section.points;
  return holder;
}

function floorTexture() {
  return canvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#c6a57a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i += 1) {
      ctx.fillStyle = i % 2 ? "#b89368" : "#d2b48a";
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, (i / 7) * h, w, h / 7 - 2);
    }
  });
}

function remember(set, value) {
  if (Array.isArray(value)) value.forEach((item) => set.add(item));
  else if (value) set.add(value);
}

function paintMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.22,
    roughness: 0.58,
  });
}

function addMesh(group, geometry, material, x, y, z, bucket) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  remember(bucket.geometries, geometry);
  remember(bucket.materials, material);
  return mesh;
}

function buildShelf(spec) {
  const { height, width, depth, frame, top, woodColor, woodEdge, frameColor, legs } = spec;
  const group = new THREE.Group();
  const bucket = { geometries: new Set(), materials: new Set() };
  const postH = Math.max(height - top, frame * 2 + 8);
  const rand = mulberry32(hashSeed([height, width, depth, frame, top]));

  const metal = paintMaterial(frameColor || "#1c1c1c");
  const topMap = woodTexture(woodColor, woodEdge);
  topMap.repeat.set(width / 40, depth / 28);
  const woodTop = new THREE.MeshStandardMaterial({
    map: topMap,
    roughness: 0.55,
    metalness: 0.04,
  });
  const woodSide = new THREE.MeshStandardMaterial({
    color: woodEdge,
    roughness: 0.68,
  });
  const ends = Array.from({ length: 7 }, () => {
    const map = endGrainTexture(rand);
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({
      map,
      emissive: "#ffffff",
      emissiveMap: map,
      emissiveIntensity: 0.28,
      roughness: 0.74,
      metalness: 0,
    });
  });
  const barks = Array.from({ length: 4 }, () => {
    const map = barkTexture(rand);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.96, metalness: 0 });
  });
  const splits = Array.from({ length: 2 }, () => {
    const map = splitTexture(rand);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.78,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  });
  for (const material of [...ends, ...barks, ...splits]) remember(bucket.materials, material);

  const post = new THREE.BoxGeometry(frame, postH, frame);
  const corners = [
    [frame / 2, frame / 2],
    [width - frame / 2, frame / 2],
    [frame / 2, depth - frame / 2],
    [width - frame / 2, depth - frame / 2],
  ];
  for (const [x, z] of corners) {
    addMesh(group, post, metal, x, postH / 2, z, bucket);
  }

  const woodStart = Math.max(legs || 0, frame);
  const railX = new THREE.BoxGeometry(Math.max(width - frame * 2, frame), frame, frame);
  const railZ = new THREE.BoxGeometry(frame, frame, Math.max(depth - frame * 2, frame));
  for (const y of [woodStart - frame / 2, postH - frame / 2]) {
    addMesh(group, railX, metal, width / 2, y, frame / 2, bucket);
    addMesh(group, railX, metal, width / 2, y, depth - frame / 2, bucket);
    addMesh(group, railZ, metal, frame / 2, y, depth / 2, bucket);
    addMesh(group, railZ, metal, width - frame / 2, y, depth / 2, bucket);
  }

  const boardMaterials = [woodSide, woodSide, woodTop, woodSide, woodSide, woodSide];
  addMesh(
    group,
    new THREE.BoxGeometry(width, top, depth),
    boardMaterials,
    width / 2,
    postH + top / 2,
    depth / 2,
    bucket,
  );

  const innerW = Math.max(width - frame * 2 - 1.4, 6);
  const innerD = Math.max(depth - frame * 2 - 1.2, 6);
  const maxStack = postH - frame - 1.2;
  const maxRadius = Math.min(5.6, innerD * 0.3);
  const touch = 1.84;
  let packed = Math.max(1, Math.round(innerW / (maxRadius * touch)));
  let radius = innerW / ((packed - 1) * touch + 2);
  if (radius > maxRadius) {
    packed = Math.max(1, Math.floor((innerW + maxRadius * 0.15) / (maxRadius * touch)));
    radius = Math.min(maxRadius, innerW / ((packed - 1) * touch + 2));
  }
  const pitch = radius * touch;
  const rise = packed > 1 ? Math.sqrt(pitch * pitch - (pitch / 2) ** 2) : radius * touch;
  const origin = frame + 0.7 + radius + Math.max(0, (innerW - ((packed - 1) * pitch + radius * 2)) / 2);
  let cursor = woodStart + radius;
  let nested = false;

  while (cursor + radius <= maxStack) {
    const count = nested ? packed - 1 : packed;
    const start = nested ? origin + pitch / 2 : origin;
    for (let i = 0; i < count; i += 1) {
      const length = innerD * (0.95 + rand() * 0.03);
      const log = makeLog(
        "round",
        radius * (1.02 + rand() * 0.012),
        length,
        rand,
        ends[Math.floor(rand() * ends.length)],
        barks[Math.floor(rand() * barks.length)],
        splits[0],
        bucket,
      );
      log.rotation.z = (rand() - 0.5) * 0.02;
      log.rotation.y = (rand() - 0.5) * 0.012;
      log.rotation.x = (rand() - 0.5) * 0.01;
      log.position.set(start + i * pitch, cursor, depth / 2 + (rand() - 0.5) * 0.25);
      group.add(log);
    }
    cursor += rise;
    nested = packed > 1 && !nested;
  }

  group.position.set(-width / 2, 0, -depth / 2);
  group.userData.bucket = bucket;
  return group;
}

function disposeShelf(group) {
  const bucket = group.userData.bucket;
  if (!bucket) return;
  for (const geometry of bucket.geometries) geometry.dispose();
  for (const material of bucket.materials) {
    if (material.map) material.map.dispose();
    if (material.bumpMap && material.bumpMap !== material.map) material.bumpMap.dispose();
    material.dispose();
  }
}

export function ShelfView({
  height,
  width,
  depth,
  frame,
  top,
  woodColor,
  woodEdge,
  frameColor,
  legs,
  photoUrl,
  wallColor = "#eadccb",
}) {
  const mountRef = useRef(null);
  const spinRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 4000);
    const shelf = buildShelf({
      height,
      width,
      depth,
      frame,
      top,
      woodColor,
      woodEdge,
      frameColor,
      legs,
    });
    scene.add(shelf);
    scene.background = new THREE.Color(wallColor);

    const floorSize = 4800;
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.22 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.05;
    floor.receiveShadow = true;
    scene.add(floor);

    const room = [];
    const ceilingY = height + 28;
    const backZ = -Math.max(depth, 40) - 30;
    const roomHalf = 170;
    const frontZ = 70;
    const sideLength = frontZ - backZ;
    const midZ = (frontZ + backZ) / 2;
    const photoWidth = roomHalf * 2;
    const walls = [];
    const makeWallMaterial = () =>
      new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 1,
        side: THREE.DoubleSide,
      });
    const addWall = (mesh, material, planeWidth, planeHeight) => {
      mesh.receiveShadow = true;
      scene.add(mesh);
      room.push(mesh);
      walls.push({ material, width: planeWidth, height: planeHeight });
    };
    const backMaterial = makeWallMaterial();
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(photoWidth, ceilingY), backMaterial);
    wall.position.set(0, ceilingY / 2, backZ);
    addWall(wall, backMaterial, photoWidth, ceilingY);
    for (const side of [-1, 1]) {
      const sideMaterial = makeWallMaterial();
      const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(sideLength, ceilingY), sideMaterial);
      sideWall.rotation.y = side * -Math.PI / 2;
      sideWall.position.set(side * roomHalf, ceilingY / 2, midZ);
      addWall(sideWall, sideMaterial, sideLength, ceilingY);
    }

    const boards = floorTexture();
    boards.repeat.set(floorSize / 140, floorSize / 140);
    const deck = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      new THREE.MeshStandardMaterial({ map: boards, roughness: 0.86 }),
    );
    deck.rotation.x = -Math.PI / 2;
    deck.position.y = 0;
    deck.receiveShadow = true;
    scene.add(deck);
    room.push(deck);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(roomHalf * 2, sideLength),
      new THREE.MeshStandardMaterial({ color: "#f6f1e7", roughness: 1, side: THREE.DoubleSide }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, ceilingY, midZ);
    scene.add(ceiling);
    room.push(ceiling);

    let cancelled = false;
    let sourceTexture = null;
    if (photoUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(photoUrl, (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        sourceTexture = texture;
        texture.colorSpace = THREE.SRGBColorSpace;
        const imageAspect = texture.image.width / Math.max(texture.image.height, 1);
        for (const entry of walls) {
          const map = texture.clone();
          map.colorSpace = THREE.SRGBColorSpace;
          map.wrapS = THREE.ClampToEdgeWrapping;
          map.wrapT = THREE.ClampToEdgeWrapping;
          const planeAspect = entry.width / entry.height;
          if (imageAspect > planeAspect) {
            const repeatX = planeAspect / imageAspect;
            map.repeat.set(repeatX, 1);
            map.offset.set((1 - repeatX) / 2, 0);
          } else {
            const repeatY = imageAspect / planeAspect;
            map.repeat.set(1, repeatY);
            map.offset.set(0, (1 - repeatY) / 2);
          }
          entry.material.map = map;
          entry.material.color.set("#ffffff");
          entry.material.needsUpdate = true;
        }
        renderer.render(scene, camera);
      });
    }

    scene.add(new THREE.HemisphereLight("#fff4e4", "#b89a78", 0.72));
    const sun = new THREE.DirectionalLight("#fff7ee", 2.15);
    sun.position.set(width * 0.8, height * 1.6, depth * 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = height * 6;
    const shadowSpan = Math.max(height, width, depth);
    sun.shadow.camera.left = -shadowSpan;
    sun.shadow.camera.right = shadowSpan;
    sun.shadow.camera.top = shadowSpan;
    sun.shadow.camera.bottom = -shadowSpan;
    sun.shadow.bias = -0.0004;
    sun.target.position.set(0, height * 0.42, 0);
    scene.add(sun);
    scene.add(sun.target);
    const fill = new THREE.DirectionalLight("#d9e4ff", 0.45);
    fill.position.set(-width, height * 0.4, depth);
    scene.add(fill);

    if (!spinRef.current) {
      const direction = new THREE.Vector3(0.08, 0.3, 1).normalize();
      spinRef.current = {
        yaw: Math.atan2(direction.x, direction.z),
        pitch: Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)),
      };
    }
    const spin = spinRef.current;
    if (spin.distance == null) spin.distance = 1;
    const target = new THREE.Vector3();
    let fitRadius = 1;
    let radius = 1;
    const nearest = 0.74;
    const farthest = 1.36;

    const wallGap = 18;
    const cameraPose = (yaw, pitch, distance) => {
      const reach = fitRadius * distance;
      const planar = Math.cos(pitch) * reach;
      return {
        x: Math.sin(yaw) * planar,
        y: target.y + Math.sin(pitch) * reach,
        z: Math.cos(yaw) * planar,
      };
    };
    const insideWalls = (pose) =>
      pose.x >= -roomHalf + wallGap &&
      pose.x <= roomHalf - wallGap &&
      pose.z >= backZ + wallGap &&
      pose.y >= 16 &&
      pose.y <= ceilingY + 4;

    const placeCamera = () => {
      spin.pitch = THREE.MathUtils.clamp(spin.pitch, -0.2, 1.05);
      spin.distance = THREE.MathUtils.clamp(spin.distance, nearest, farthest);
      if (!insideWalls(cameraPose(spin.yaw, spin.pitch, spin.distance))) {
        const yaw = spin.yaw;
        const pitch = spin.pitch;
        let low = 0;
        let high = 1;
        for (let step = 0; step < 14; step += 1) {
          const blend = (low + high) / 2;
          const tryYaw = yaw * blend;
          const tryPitch = pitch * blend + 0.29 * (1 - blend);
          if (insideWalls(cameraPose(tryYaw, tryPitch, spin.distance))) low = blend;
          else high = blend;
        }
        spin.yaw = yaw * low;
        spin.pitch = pitch * low + 0.29 * (1 - low);
        if (!insideWalls(cameraPose(spin.yaw, spin.pitch, spin.distance))) {
          let near = nearest;
          let far = spin.distance;
          for (let step = 0; step < 12; step += 1) {
            const mid = (near + far) / 2;
            if (insideWalls(cameraPose(spin.yaw, spin.pitch, mid))) near = mid;
            else far = mid;
          }
          spin.distance = near;
        }
      }
      const pose = cameraPose(spin.yaw, spin.pitch, spin.distance);
      radius = fitRadius * spin.distance;
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(target);
    };

    const frameCamera = () => {
      const aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const boxH = height * 1.46;
      const boxW = (width + depth * 0.55) * 1.35;
      const distH = boxH / 2 / Math.tan(fov / 2);
      const distW = boxW / 2 / Math.tan(fov / 2) / Math.max(aspect, 0.4);
      fitRadius = Math.max(distH, distW);
      target.set(0, height * 0.46, 0);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      placeCamera();
      renderer.render(scene, camera);
    };

    const canvas = renderer.domElement;
    const pointers = new Map();
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pinchSpan = 0;

    const pointerSpan = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture?.(event.pointerId);
      if (pointers.size >= 2) {
        dragging = false;
        pinchSpan = pointerSpan();
        canvas.classList.remove("is-turning");
        return;
      }
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.classList.add("is-turning");
    };
    const onPointerMove = (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2 && pinchSpan > 0) {
        const nextSpan = pointerSpan();
        spin.distance *= pinchSpan / nextSpan;
        pinchSpan = nextSpan;
        placeCamera();
        renderer.render(scene, camera);
        return;
      }
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      spin.yaw -= dx * 0.008;
      spin.pitch += dy * 0.005;
      placeCamera();
      renderer.render(scene, camera);
    };
    const endDrag = (event) => {
      pointers.delete(event.pointerId);
      pinchSpan = 0;
      dragging = false;
      canvas.classList.remove("is-turning");
    };
    const onWheel = (event) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const step = Math.max(-0.09, Math.min(0.09, event.deltaY * unit * 0.0011));
      spin.distance += step;
      placeCamera();
      renderer.render(scene, camera);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    frameCamera();
    const observer = new ResizeObserver(frameCamera);
    observer.observe(mount);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("wheel", onWheel);
      cancelled = true;
      sourceTexture?.dispose();
      observer.disconnect();
      disposeShelf(shelf);
      floor.geometry.dispose();
      floor.material.dispose();
      for (const mesh of room) {
        mesh.geometry.dispose();
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
      }
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [height, width, depth, frame, top, woodColor, woodEdge, frameColor, legs, photoUrl, wallColor]);

  return <div ref={mountRef} className="shelf-view" />;
}
