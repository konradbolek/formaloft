import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { getCatalog, parseConfig, priceWithReference } from "./pricing.js";
import { getTvCatalog, parseTvConfig, priceTvWithReference } from "./tvPricing.js";
import { getRegalCatalog, parseRegalConfig, priceRegalWithReference } from "./regalPricing.js";
import { getRailCatalog, parseRailConfig, priceRailWithReference } from "./railPricing.js";
import { registerAdmin } from "./admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
const uploadsDir = path.join(dataDir, "uploads");
const quotesDir = path.join(dataDir, "quotes");
const messagesDir = path.join(dataDir, "messages");
const clientDist = path.resolve(__dirname, "../../client/dist");

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(quotesDir, { recursive: true });
fs.mkdirSync(messagesDir, { recursive: true });

loadEnvFile(path.resolve(__dirname, "../.env"));

const PORT = Number(process.env.PORT) || 3001;

const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function createId(prefix = "FL") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = `${prefix}-`;
  for (let i = 0; i < 5; i += 1) {
    id += alphabet[crypto.randomInt(alphabet.length)];
  }
  return id;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename(req, file, cb) {
      const ext = ALLOWED_TYPES.get(file.mimetype) || ".jpg";
      const stem = file.fieldname === "preview" ? `${req.quoteId}-podglad` : req.quoteId;
      cb(null, `${stem}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Dozwolone formaty zdjęcia: JPG, PNG albo WEBP."));
  },
});

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function readQuotes() {
  const files = fs.readdirSync(quotesDir).filter((name) => name.endsWith(".json"));
  const quotes = [];
  for (const name of files) {
    try {
      quotes.push(JSON.parse(fs.readFileSync(path.join(quotesDir, name), "utf8")));
    } catch {
      // Pomijamy uszkodzony plik, reszta listy ma się wczytać.
    }
  }
  quotes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return quotes;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

function productOf(body) {
  if (body?.product === "polka-rtv" || body?.product === "regal" || body?.product === "barierka") {
    return body.product;
  }
  return "stojak";
}

function quoteTools(product) {
  if (product === "polka-rtv") {
    return { parse: parseTvConfig, price: priceTvWithReference, catalog: getTvCatalog };
  }
  if (product === "regal") {
    return { parse: parseRegalConfig, price: priceRegalWithReference, catalog: getRegalCatalog };
  }
  if (product === "barierka") {
    return { parse: parseRailConfig, price: priceRailWithReference, catalog: getRailCatalog };
  }
  return { parse: parseConfig, price: priceWithReference, catalog: getCatalog };
}

app.get("/api/catalog", (req, res) => {
  res.json(quoteTools(productOf({ product: req.query.product })).catalog());
});

app.post("/api/price", (req, res) => {
  const tools = quoteTools(productOf(req.body));
  const parsed = tools.parse(req.body);
  if (!parsed.ok) {
    res.status(400).json(parsed);
    return;
  }
  res.json(tools.price(parsed.config));
});

function publicQuote(quote) {
  return {
    id: quote.id,
    createdAt: quote.createdAt,
    product: quote.product || "stojak",
    config: quote.config,
    price: quote.price,
    preview: quote.preview || null,
    photo: quote.photo || null,
  };
}

app.get("/api/quotes", (req, res) => {
  const product = productOf({ product: req.query.product });
  res.json(
    readQuotes()
      .filter((item) => (item.product || "stojak") === product)
      .slice(0, 12)
      .map(publicQuote),
  );
});

function oneLine(value, max) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

app.post("/api/contact", async (req, res, next) => {
  try {
    if (oneLine(req.body?.website, 80)) {
      res.status(201).json({ id: createId("WK") });
      return;
    }

    const name = oneLine(req.body?.name, 80);
    const email = oneLine(req.body?.email, 120);
    const phone = oneLine(req.body?.phone, 40);
    const message = String(req.body?.message ?? "").trim().slice(0, 2000);
    const fields = [];

    if (name.length < 2) fields.push("Podaj imię.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.push("Podaj poprawny e-mail.");
    if (phone && !/^[0-9+\s()-]{6,40}$/.test(phone)) {
      fields.push("Telefon może mieć cyfry, spacje i znak plus.");
    }
    if (message.length < 10) fields.push("Wiadomość jest za krótka. Napisz przynajmniej zdanie.");

    if (fields.length) {
      res.status(400).json({ error: "Sprawdź formularz.", fields });
      return;
    }

    const id = createId("WK");
    const record = {
      id,
      createdAt: new Date().toISOString(),
      name,
      email,
      phone,
      message,
    };
    await fs.promises.writeFile(
      path.join(messagesDir, `${id}.json`),
      JSON.stringify(record, null, 2),
    );
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

const previewUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Dozwolone formaty zdjęcia: JPG, PNG albo WEBP."));
  },
});

app.post("/api/realistic", (req, res, next) => {
  previewUpload.single("image")(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    renderRealistic(req, res).catch(next);
  });
});

function imagePrompt(body) {
  const wood = oneLine(body?.wood, 40);
  const paint = oneLine(body?.paint, 40);
  const size = oneLine(body?.size, 48);
  return [
    "Turn this 3D visualization into one photorealistic interior photograph of the same loft bookshelf.",
    "Keep the exact shelf layout, proportions, camera angle, wall, floor, and ceiling.",
    paint ? `Powder-coated steel color: ${paint}.` : "Keep the steel color from the picture.",
    wood ? `Wood species and color: ${wood}.` : "Keep the wood color from the picture.",
    size ? `Furniture size: ${size}.` : "",
    "Leave every shelf empty. Do not add books, plants, decor, people, or text. No watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cursorApi(key, path, { method = "GET", body, timeout = 30000 } = {}) {
  const response = await fetch(`https://api.cursor.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function cursorFailure(status, payload) {
  const code = payload?.code || payload?.error?.code || "";
  const detail = payload?.message || payload?.error?.message || "";
  const safeDetail = String(detail).replace(/crsr_[A-Za-z0-9]+/g, "[key]").slice(0, 180);
  console.error("Cursor image request failed", status, code, safeDetail);
  const error = new Error(polishImageError(status, code));
  error.status = 502;
  throw error;
}

async function editWithCursor(file, prompt) {
  const key = process.env.CURSOR_API_KEY;
  if (!key) {
    const error = new Error("Brak klucza do generowania zdjęć.");
    error.status = 503;
    throw error;
  }

  const created = await cursorApi(key, "/v1/agents", {
    method: "POST",
    timeout: 40000,
    body: {
      name: "Zdjęcie regału",
      model: { id: "composer-2.5" },
      prompt: {
        text: [
          prompt,
          "The attached image is the reference. Call the image generation tool and make one photorealistic photograph from it.",
          "Save only that photograph as artifacts/stilowo-regal.png.",
          "Do not change other files and do not open a pull request.",
        ].join(" "),
        images: [
          {
            data: file.buffer.toString("base64"),
            mimeType: file.mimetype || "image/jpeg",
          },
        ],
      },
    },
  });
  if (!created.response.ok) cursorFailure(created.response.status, created.payload);

  const agentId = created.payload?.agent?.id;
  const runId = created.payload?.run?.id;
  if (!agentId || !runId) {
    const error = new Error("Generator nie przyjął grafiki.");
    error.status = 502;
    throw error;
  }

  try {
    const deadline = Date.now() + 190000;
    let run = created.payload.run;
    while (!["FINISHED", "ERROR", "CANCELLED", "EXPIRED"].includes(run?.status) && Date.now() < deadline) {
      await wait(4000);
      const checked = await cursorApi(key, `/v1/agents/${agentId}/runs/${runId}`);
      if (!checked.response.ok) cursorFailure(checked.response.status, checked.payload);
      run = checked.payload;
    }
    if (run?.status !== "FINISHED") {
      console.error("Cursor image run ended", run?.status || "timeout");
      const error = new Error(
        run?.status ? "Nie udało się wygenerować zdjęcia. Spróbuj jeszcze raz." : "Generowanie trwało za długo. Spróbuj jeszcze raz.",
      );
      error.status = 502;
      throw error;
    }

    const listed = await cursorApi(key, `/v1/agents/${agentId}/artifacts`);
    if (!listed.response.ok) cursorFailure(listed.response.status, listed.payload);
    const artifact = (listed.payload.items || []).find((item) => /\.(png|jpe?g|webp)$/i.test(item.path || ""));
    if (!artifact?.path) {
      const error = new Error("Generator skończył, ale nie odesłał zdjęcia.");
      error.status = 502;
      throw error;
    }

    const download = await cursorApi(
      key,
      `/v1/agents/${agentId}/artifacts/download?path=${encodeURIComponent(artifact.path)}`,
    );
    if (!download.response.ok || !download.payload.url) cursorFailure(download.response.status, download.payload);
    const imageResponse = await fetch(download.payload.url, { signal: AbortSignal.timeout(60000) });
    if (!imageResponse.ok) {
      const error = new Error("Nie udało się odebrać zdjęcia.");
      error.status = 502;
      throw error;
    }
    const mime = /png/i.test(artifact.path)
      ? "image/png"
      : /webp/i.test(artifact.path)
        ? "image/webp"
        : "image/jpeg";
    return { buffer: Buffer.from(await imageResponse.arrayBuffer()), mime };
  } finally {
    await cursorApi(key, `/v1/agents/${agentId}/archive`, { method: "POST" }).catch(() => {});
  }
}

function polishImageError(status, code) {
  if (status === 401 || /unauth|invalid.*key/i.test(code)) return "Klucz Cursora został odrzucony.";
  if (status === 403) return "To konto nie może uruchomić generowania zdjęcia.";
  if (status === 429) return "Generator jest chwilowo zajęty. Spróbuj za moment.";
  return "Nie udało się wygenerować zdjęcia. Spróbuj jeszcze raz.";
}

async function renderRealistic(req, res) {
  if (!req.file) {
    res.status(400).json({ error: "Brak grafiki do wygenerowania zdjęcia." });
    return;
  }

  let image;
  try {
    image = await editWithCursor(req.file, imagePrompt(req.body));
  } catch (error) {
    res.status(error.status || 502).json({
      error: error.message || "Nie udało się wygenerować zdjęcia.",
    });
    return;
  }

  res.setHeader("Content-Type", image.mime || "image/png");
  res.setHeader("Cache-Control", "no-store");
  res.send(image.buffer);
}

function savedFiles(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    for (const group of Object.values(req.files)) {
      if (Array.isArray(group)) files.push(...group);
    }
  }
  return files;
}

function removeUploads(req) {
  for (const file of savedFiles(req)) {
    if (file?.path) fs.rmSync(file.path, { force: true });
  }
}

app.post("/api/quotes", (req, res, next) => {
  req.quoteId = createId();
  upload.fields([
    { name: "preview", maxCount: 1 },
    { name: "photo", maxCount: 1 },
  ])(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    saveQuote(req, res).catch(next);
  });
});

async function saveQuote(req, res) {
  const preview = req.files?.preview?.[0];
  const wall = req.files?.photo?.[0];
  if (!preview) {
    removeUploads(req);
    res.status(400).json({
      error: "Nie udało się zapisać grafiki mebla.",
      fields: ["Nie udało się zapisać grafiki mebla."],
    });
    return;
  }

  const product = productOf(req.body);
  const tools = quoteTools(product);
  const parsed = tools.parse(req.body);
  if (!parsed.ok) {
    removeUploads(req);
    res.status(400).json(parsed);
    return;
  }

  const price = tools.price(parsed.config);
  const previewExt = path.extname(preview.filename);
  const quote = {
    id: req.quoteId,
    createdAt: new Date().toISOString(),
    product,
    config: parsed.config,
    price,
    preview: {
      url: `/uploads/${req.quoteId}-podglad${previewExt}`,
    },
    photo: wall
      ? {
          url: `/uploads/${req.quoteId}${path.extname(wall.filename)}`,
          originalName: wall.originalname,
        }
      : null,
    status: "nowa",
    clientName: "",
    clientPhone: "",
    note: "",
  };

  await fs.promises.writeFile(
    path.join(quotesDir, `${req.quoteId}.json`),
    JSON.stringify(quote, null, 2),
  );
  res.status(201).json(publicQuote(quote));
}

registerAdmin(app, { quotesDir, messagesDir });

if (process.env.NODE_ENV === "production" && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((error, req, res, next) => {
  removeUploads(req);
  const tooBig = error?.code === "LIMIT_FILE_SIZE";
  const message = tooBig
    ? "Zdjęcie jest za duże. Maksymalnie 8 MB."
    : error.message || "Nie udało się policzyć wyceny.";
  if (res.headersSent) {
    next(error);
    return;
  }
  res.status(400).json({ error: message, fields: [message] });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Wycena Stilowo: http://127.0.0.1:${PORT}`);
});
