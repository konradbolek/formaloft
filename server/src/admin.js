import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PAINTS, WOODS } from "./pricing.js";

const COOKIE = "fl_admin";
const WEEK = 7 * 24 * 60 * 60;
const STATUSES = ["nowa", "rozmowa", "produkcja", "gotowa", "odebrana"];
const PRODUCT_NAMES = {
  stojak: "Stojak na drewno",
  "polka-rtv": "Półka pod telewizor",
  regal: "Regał asymetryczny",
};

const fails = new Map();

function oneLine(value, max) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function noteText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2000);
}

function labelOf(list, id) {
  return list.find((item) => item.id === id)?.name || "";
}

function summarize(quote) {
  const config = quote.config || {};
  const wood = labelOf(WOODS, config.wood);
  const paint = labelOf(PAINTS, config.paint || "czern");
  const bits = [`${config.height} × ${config.width} × ${config.depth} cm`, `rama ${config.frameThickness} cm`];
  if (config.topThickness) bits.push(`blat ${wood} ${config.topThickness} cm`);
  if (config.shelfThickness) bits.push(`${wood} ${config.shelfThickness} cm`);
  if (config.shelves) bits.push(`półki: ${config.shelves}`);
  if (config.bays) bits.push(`segmenty: ${config.bays}`);
  if (paint) bits.push(paint);
  if (config.legHeight) bits.push(`nogi ${config.legHeight} cm`);
  return bits.join(" · ");
}

function readDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const rows = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    try {
      rows.push(JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")));
    } catch {
      // Uszkodzony plik nie blokuje reszty kolejki.
    }
  }
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return rows;
}

function presentQuote(quote) {
  const status = STATUSES.includes(quote.status) ? quote.status : "nowa";
  const lines = Array.isArray(quote.price?.lines) ? quote.price.lines : [];
  return {
    id: quote.id,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt || quote.createdAt,
    product: quote.product || "stojak",
    productName: PRODUCT_NAMES[quote.product] || PRODUCT_NAMES.stojak,
    summary: summarize(quote),
    price: {
      total: quote.price?.total ?? 0,
      currency: "PLN",
      lines: lines.map((line) => ({
        label: line.label,
        detail: line.detail,
        amount: line.amount,
      })),
    },
    preview: quote.preview?.url ? { url: quote.preview.url } : null,
    photo: quote.photo?.url ? { url: quote.photo.url, originalName: quote.photo.originalName || "" } : null,
    status,
    clientName: quote.clientName || "",
    clientPhone: quote.clientPhone || "",
    note: quote.note || "",
  };
}

function presentMessage(message) {
  return {
    id: message.id,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt || message.createdAt,
    name: message.name || "",
    email: message.email || "",
    phone: message.phone || "",
    message: message.message || "",
    handled: Boolean(message.handled),
    note: message.note || "",
  };
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function passwordOk(input) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const left = crypto.createHash("sha256").update(String(input), "utf8").digest();
  const right = crypto.createHash("sha256").update(expected, "utf8").digest();
  return crypto.timingSafeEqual(left, right);
}

function mac(value) {
  const key = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";
  return crypto.createHmac("sha256", key).update(value).digest("base64url");
}

function readToken(req) {
  const header = req.headers.cookie || "";
  for (const bit of header.split(";")) {
    const [name, ...rest] = bit.trim().split("=");
    if (name === COOKIE) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function sessionOk(req) {
  const token = readToken(req);
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const given = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(given, mac(exp));
}

function writeCookie(res, token, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`,
  );
}

function clientIp(req) {
  return req.ip || "local";
}

function locked(ip) {
  const row = fails.get(ip);
  return Boolean(row?.until && row.until > Date.now());
}

function noteFail(ip) {
  const row = fails.get(ip) || { count: 0 };
  if (row.until && row.until <= Date.now()) {
    row.count = 0;
    row.until = 0;
  }
  row.count += 1;
  if (row.count >= 8) {
    row.until = Date.now() + 60_000;
    row.count = 0;
  }
  fails.set(ip, row);
}

function requireAdmin(req, res, next) {
  if (!sessionOk(req)) {
    res.status(401).json({ error: "Zaloguj się do warsztatu." });
    return;
  }
  next();
}

function fileFor(dir, id, pattern) {
  if (!pattern.test(id)) return null;
  const file = path.join(dir, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return file;
}

function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export function registerAdmin(app, { quotesDir, messagesDir }) {
  app.post("/api/admin/login", (req, res) => {
    if (!process.env.ADMIN_PASSWORD) {
      res.status(503).json({ error: "Panel warsztatu nie jest włączony." });
      return;
    }
    const ip = clientIp(req);
    if (locked(ip)) {
      res.status(429).json({ error: "Za dużo prób. Odczekaj minutę." });
      return;
    }
    const password = String(req.body?.password ?? "").slice(0, 200);
    if (!passwordOk(password)) {
      noteFail(ip);
      res.status(401).json({ error: "Hasło nie pasuje." });
      return;
    }
    fails.delete(ip);
    const exp = Date.now() + WEEK * 1000;
    writeCookie(res, `${exp}.${mac(String(exp))}`, WEEK);
    res.json({ ok: true });
  });

  app.post("/api/admin/logout", (req, res) => {
    writeCookie(res, "", 0);
    res.json({ ok: true });
  });

  app.get("/api/admin/session", (req, res) => {
    if (!sessionOk(req)) {
      res.status(401).json({ error: "Zaloguj się do warsztatu." });
      return;
    }
    res.json({ ok: true });
  });

  app.get("/api/admin/desk", requireAdmin, (req, res) => {
    res.json({
      quotes: readDir(quotesDir).map(presentQuote),
      messages: readDir(messagesDir).map(presentMessage),
    });
  });

  app.patch("/api/admin/quotes/:id", requireAdmin, (req, res) => {
    const file = fileFor(quotesDir, req.params.id, /^FL-[A-HJ-NP-Z2-9]{5}$/);
    if (!file) {
      res.status(404).json({ error: "Nie ma takiej wyceny." });
      return;
    }
    const body = req.body || {};
    const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
    const hasName = Object.prototype.hasOwnProperty.call(body, "clientName");
    const hasPhone = Object.prototype.hasOwnProperty.call(body, "clientPhone");
    const hasNote = Object.prototype.hasOwnProperty.call(body, "note");
    if (!hasStatus && !hasName && !hasPhone && !hasNote) {
      res.status(400).json({ error: "Nie ma czego zapisać." });
      return;
    }
    if (hasStatus && !STATUSES.includes(body.status)) {
      res.status(400).json({ error: "Nie ma takiego statusu." });
      return;
    }
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const next = {
      ...raw,
      status: hasStatus ? body.status : STATUSES.includes(raw.status) ? raw.status : "nowa",
      clientName: hasName ? oneLine(body.clientName, 80) : raw.clientName || "",
      clientPhone: hasPhone ? oneLine(body.clientPhone, 40) : raw.clientPhone || "",
      note: hasNote ? noteText(body.note) : raw.note || "",
      updatedAt: new Date().toISOString(),
    };
    writeJson(file, next);
    res.json(presentQuote(next));
  });

  app.patch("/api/admin/messages/:id", requireAdmin, (req, res) => {
    const file = fileFor(messagesDir, req.params.id, /^WK-[A-HJ-NP-Z2-9]{5}$/);
    if (!file) {
      res.status(404).json({ error: "Nie ma takiej wiadomości." });
      return;
    }
    const body = req.body || {};
    const hasHandled = Object.prototype.hasOwnProperty.call(body, "handled");
    const hasNote = Object.prototype.hasOwnProperty.call(body, "note");
    if (!hasHandled && !hasNote) {
      res.status(400).json({ error: "Nie ma czego zapisać." });
      return;
    }
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const next = {
      ...raw,
      handled: hasHandled ? Boolean(body.handled) : Boolean(raw.handled),
      note: hasNote ? noteText(body.note) : raw.note || "",
      updatedAt: new Date().toISOString(),
    };
    writeJson(file, next);
    res.json(presentMessage(next));
  });
}
