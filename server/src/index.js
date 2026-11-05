import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { getCatalog, parseConfig, priceWithReference } from "./pricing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
const uploadsDir = path.join(dataDir, "uploads");
const quotesDir = path.join(dataDir, "quotes");
const clientDist = path.resolve(__dirname, "../../client/dist");

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(quotesDir, { recursive: true });

const PORT = Number(process.env.PORT) || 3001;

const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function createId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "FL-";
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
      cb(null, `${req.quoteId}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Dozwolone formaty zdjęcia: JPG, PNG albo WEBP."));
  },
});

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

app.get("/api/catalog", (req, res) => {
  res.json(getCatalog());
});

app.post("/api/price", (req, res) => {
  const parsed = parseConfig(req.body);
  if (!parsed.ok) {
    res.status(400).json(parsed);
    return;
  }
  res.json(priceWithReference(parsed.config));
});

app.get("/api/quotes", (req, res) => {
  res.json(readQuotes().slice(0, 12));
});

app.post("/api/quotes", (req, res, next) => {
  req.quoteId = createId();
  upload.single("photo")(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    saveQuote(req, res).catch(next);
  });
});

async function saveQuote(req, res) {
  if (!req.file) {
    res.status(400).json({
      error: "Dodaj zdjęcie ściany.",
      fields: ["Dodaj zdjęcie ściany."],
    });
    return;
  }

  const parsed = parseConfig(req.body);
  if (!parsed.ok) {
    fs.rmSync(req.file.path, { force: true });
    res.status(400).json(parsed);
    return;
  }

  const price = priceWithReference(parsed.config);
  const ext = path.extname(req.file.filename);
  const quote = {
    id: req.quoteId,
    createdAt: new Date().toISOString(),
    config: parsed.config,
    price,
    photo: {
      url: `/uploads/${req.quoteId}${ext}`,
      originalName: req.file.originalname,
    },
  };

  await fs.promises.writeFile(
    path.join(quotesDir, `${req.quoteId}.json`),
    JSON.stringify(quote, null, 2),
  );
  res.status(201).json(quote);
}

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
  if (req.file?.path) fs.rmSync(req.file.path, { force: true });
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
  console.log(`Wycena Forma Loft: http://127.0.0.1:${PORT}`);
});
