import { useEffect, useMemo, useRef, useState } from "react";
import { getCatalog, getPrice, getQuotes, saveQuote } from "./api.js";
import { formatCm, formatZl } from "./format.js";
import { Measure } from "./Measure.jsx";
import { ShelfView } from "./ShelfView.jsx";

const WALL_COLORS = [
  { name: "Beż", color: "#eadccb" },
  { name: "Piasek", color: "#e4d3b5" },
  { name: "Szary", color: "#d4d0c8" },
  { name: "Biel", color: "#f7f4ee" },
  { name: "Szałwia", color: "#c9d0c0" },
  { name: "Grafit", color: "#6e6a66" },
];

const EMPTY_CONFIG = {
  height: 140,
  width: 45,
  depth: 30,
  frameThickness: 3,
  wood: "dab",
  topThickness: 2,
  paint: "czern",
  legHeight: 10,
};

function sameConfig(a, b) {
  return (
    a.height === b.height &&
    a.width === b.width &&
    a.depth === b.depth &&
    a.frameThickness === b.frameThickness &&
    a.wood === b.wood &&
    a.topThickness === b.topThickness &&
    (a.paint || "czern") === (b.paint || "czern") &&
    (a.legHeight || 0) === (b.legHeight || 0)
  );
}

export function CalculatorPage() {
  const [catalog, setCatalog] = useState(null);
  const [bootError, setBootError] = useState("");
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [quote, setQuote] = useState(null);
  const [pricing, setPricing] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [wallColor, setWallColor] = useState(WALL_COLORS[0].color);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(null);
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    let cancel = false;
    getCatalog()
      .then((data) => {
        if (cancel) return;
        setCatalog(data);
        setConfig({ ...data.reference, legHeight: 10 });
      })
      .catch(() => {
        if (!cancel) {
          setBootError(
            "Nie mogę połączyć się z serwerem wyceny. Uruchom aplikację poleceniem npm run dev.",
          );
        }
      });
    getQuotes()
      .then((data) => {
        if (!cancel) setQuotes(data);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!catalog) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPricing(true);
      getPrice(config, controller.signal)
        .then((data) => {
          setQuote(data);
          setPriceError("");
        })
        .catch((error) => {
          if (error.name === "AbortError") return;
          setPriceError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setPricing(false);
        });
    }, 160);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [catalog, config]);

  const wood = useMemo(() => {
    return catalog?.woods.find((item) => item.id === config.wood) || catalog?.woods[0];
  }, [catalog, config.wood]);

  const paint = useMemo(() => {
    return catalog?.paints.find((item) => item.id === config.paint) || catalog?.paints[0];
  }, [catalog, config.paint]);

  function patch(partial) {
    setSaved(null);
    setFormError("");
    setConfig((current) => ({ ...current, ...partial }));
  }

  function clearFile() {
    setFile(null);
    setFormError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function chooseWall(color) {
    setWallColor(color);
    clearFile();
  }

  function takeFile(next) {
    if (!next) return;
    const typeOk =
      /image\/(jpeg|png|webp)/.test(next.type) ||
      /\.(jpe?g|png|webp)$/i.test(next.name);
    if (!typeOk) {
      setFormError("Wybierz zdjęcie JPG, PNG albo WEBP.");
      return;
    }
    if (next.size > 8 * 1024 * 1024) {
      setFormError("Zdjęcie jest za duże. Maksymalnie 8 MB.");
      return;
    }
    setFormError("");
    setSaved(null);
    setFile(next);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!file) {
      setFormError("Dodaj zdjęcie ściany, żeby zapisać wycenę.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const created = await saveQuote(config, file);
      setSaved(created);
      setQuotes((current) => [created, ...current.filter((item) => item.id !== created.id)].slice(0, 12));
    } catch (error) {
      setFormError(error.fields?.join(" ") || error.message);
    } finally {
      setBusy(false);
    }
  }

  if (bootError) {
    return (
      <main className="page">
        <p className="boot-error" role="alert">
          {bootError}
        </p>
      </main>
    );
  }

  if (!catalog || !wood || !paint) {
    return (
      <main className="page">
        <p className="loading">Ładowanie kalkulatora…</p>
      </main>
    );
  }

  const limits = catalog.limits;
  const isReference = sameConfig(config, catalog.reference);
  const wallPreset = WALL_COLORS.find((item) => item.color.toLowerCase() === wallColor.toLowerCase());
  const photoLabel = file ? file.name : wallPreset ? `Ściana ${wallPreset.name.toLowerCase()}` : "Kolor ściany";

  return (
    <div className="page">
      <main>
        <div className="hero">
          <h1>Stojak na drewno, na wymiar</h1>
          <p className="lede">
            Ustaw wysokość, szerokość, głębokość, ramę, kolor stali i blat. Cena
            liczy się od stali, drewna i robocizny.
          </p>
        </div>

        <form className="layout" onSubmit={onSubmit} noValidate>
          <section className="controls" aria-label="Wymiary i materiał">
            <div className="panel">
              <div className="panel-head">
                <h2>Wymiary</h2>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setConfig(catalog.reference);
                    setSaved(null);
                    setFormError("");
                  }}
                >
                  Model ze zdjęcia
                </button>
              </div>
              <p className="reference-note">
                <img src="/realizacja.jpg" alt="Stojak Forma Loft przy schodach" />
                <span>Model ze zdjęcia: {catalog.referenceNote}.</span>
              </p>

              <Measure
                label="Wysokość całkowita"
                hint="od podłogi do wierzchu blatu"
                {...limits.height}
                value={config.height}
                onChange={(height) => patch({ height })}
              />
              <Measure
                label="Szerokość"
                hint="zewnętrzna, razem z ramą"
                {...limits.width}
                value={config.width}
                onChange={(width) => patch({ width })}
              />
              <Measure
                label="Głębokość"
                hint="zewnętrzna, razem z ramą"
                {...limits.depth}
                value={config.depth}
                onChange={(depth) => patch({ depth })}
              />
              <Measure
                label="Wysokość nóg"
                hint="od podłogi do pierwszego polana, 0 to rama przy podłodze"
                {...limits.legHeight}
                value={config.legHeight ?? 0}
                onChange={(legHeight) => patch({ legHeight })}
              />
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Rama i blat</h2>
              </div>
              <div className="pair">
                <Measure
                  label="Grubość ramy"
                  hint="przekrój profilu"
                  {...limits.frameThickness}
                  value={config.frameThickness}
                  onChange={(frameThickness) => patch({ frameThickness })}
                />
                <Measure
                  label="Grubość blatu"
                  hint="deska na wierzchu"
                  {...limits.topThickness}
                  value={config.topThickness}
                  onChange={(topThickness) => patch({ topThickness })}
                />
              </div>

              <fieldset className="paints">
                <legend>Malowanie stali</legend>
                <div className="paint-row">
                  {catalog.paints.map((item) => {
                    const selected = item.id === config.paint;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={selected ? "paint-chip is-selected" : "paint-chip"}
                        aria-pressed={selected}
                        onClick={() => patch({ paint: item.id })}
                      >
                        <span className="swatch" style={{ background: item.color }} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="hint">{paint.note}. Kolor nie zmienia ceny.</p>
              </fieldset>

              <fieldset className="woods">
                <legend>Drewno blatu</legend>
                <div className="wood-grid">
                  {catalog.woods.map((item) => {
                    const selected = item.id === config.wood;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={selected ? "wood-card is-selected" : "wood-card"}
                        aria-pressed={selected}
                        onClick={() => patch({ wood: item.id })}
                      >
                        <span className="swatch" style={{ background: item.color }} />
                        <span className="wood-name">{item.name}</span>
                        <span className="wood-note">{item.note}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </section>

          <aside className="side">
            <div
              className={dragOver ? "stage is-drag" : "stage"}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                takeFile(event.dataTransfer.files?.[0]);
              }}
            >
              <ShelfView
                height={config.height}
                width={config.width}
                depth={config.depth}
                frame={config.frameThickness}
                top={config.topThickness}
                woodColor={wood.color}
                woodEdge={wood.edge}
                frameColor={paint.color}
                legs={config.legHeight ?? 0}
                photoUrl={previewUrl}
                wallColor={wallColor}
              />
              <p className="stage-chip">{photoLabel}</p>
            </div>

            <fieldset className="paints wall-colors">
              <legend>Kolor ściany</legend>
              <div className="paint-row">
                {WALL_COLORS.map((item) => {
                  const selected = !file && item.color.toLowerCase() === wallColor.toLowerCase();
                  return (
                    <button
                      key={item.color}
                      type="button"
                      className={selected ? "paint-chip is-selected" : "paint-chip"}
                      aria-pressed={selected}
                      onClick={() => chooseWall(item.color)}
                    >
                      <span className="swatch" style={{ background: item.color }} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
                <label className="wall-custom">
                  Inny
                  <input
                    className="wall-color"
                    type="color"
                    value={wallColor}
                    aria-label="Własny kolor ściany"
                    onChange={(event) => chooseWall(event.target.value)}
                  />
                </label>
              </div>
              <p className="hint">Zamiast zdjęcia. Podłoga i sufit zostają.</p>
            </fieldset>

            <div className="file-row">
              <label className="file-button">
                {file ? "Zmień zdjęcie ściany" : "Wgraj zdjęcie ściany"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => takeFile(event.target.files?.[0])}
                />
              </label>
              {file && (
                <button type="button" className="ghost" onClick={clearFile}>
                  Pokaż model
                </button>
              )}
            </div>
            <p className="caption">
              Stojak na podglądzie ma proporcje z suwaków. Przeciągnij go, żeby obrócić.
              Kółkiem myszy albo dwoma palcami lekko przybliżysz i oddalisz.
              Zdjęcie wchodzi na trzy ściany. JPG, PNG lub WEBP, do 8 MB.
            </p>

            <div className="price-card" aria-live="polite">
              <div className={pricing ? "price-chip is-loading" : "price-chip"}>
                <div>
                  <p className="price-kicker">
                    {isReference ? "Model ze zdjęcia" : "Twoja konfiguracja"}
                  </p>
                  <p className="amount">
                    {quote ? (
                      <>
                        {quote.total}
                        <span> zł</span>
                      </>
                    ) : (
                      "…"
                    )}
                  </p>
                </div>
                <p className="price-sub">Cena brutto</p>
              </div>

              {quote && (
                <p className="delta">
                  {quote.total === quote.referenceTotal
                    ? "Tyle kosztuje model z oferty."
                    : `${formatZl(Math.abs(quote.total - quote.referenceTotal))} ${
                        quote.total > quote.referenceTotal ? "więcej" : "mniej"
                      } niż model ze zdjęcia.`}
                </p>
              )}

              <p className="clearance">
                Światło na drewno: {formatCm(quote?.clearance.width ?? 0)} ×{" "}
                {formatCm(quote?.clearance.depth ?? 0)} cm, wysokość wsadu{" "}
                {formatCm(quote?.clearance.height ?? 0)} cm
                {config.legHeight > 0 ? `, od ${formatCm(config.legHeight)} cm nad podłogą` : ""}.
              </p>
              {quote && (quote.clearance.depth < 16 || quote.clearance.width < 24) && (
                <p className="warn">
                  Zostaje {formatCm(quote.clearance.width)} × {formatCm(quote.clearance.depth)} cm
                  w środku. Przy tej ramie polana wejdą ciasno.
                </p>
              )}

              {priceError && (
                <p className="error" role="alert">
                  {priceError}
                </p>
              )}

              <button className="submit" type="submit" disabled={busy || pricing || !quote}>
                {busy ? "Zapisuję…" : "Zapisz wycenę"}
              </button>
              {!file && (
                <p className="hint">
                  Cena jest już policzona. Zdjęcie ściany jest potrzebne, żeby zapisać wycenę.
                </p>
              )}
              {formError && (
                <p className="error" role="alert">
                  {formError}
                </p>
              )}
              {saved && (
                <div className="saved" role="status">
                  <p className="saved-kicker">Wycena zapisana</p>
                  <p className="saved-id">{saved.id}</p>
                  <p>
                    {formatZl(saved.price.total)} · zdjęcie ściany jest przy tej wycenie.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </form>

        <div className="dock">
          <span>{isReference ? "Model ze zdjęcia" : "Razem"}</span>
          <strong>{quote ? formatZl(quote.total) : "…"}</strong>
        </div>

        {quotes.length > 0 && (
          <section className="history" aria-label="Zapisane wyceny">
            <h2>Zapisane wyceny</h2>
            <ul>
              {quotes.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="history-item"
                    onClick={() => {
                      setConfig({
                        ...item.config,
                        paint: item.config.paint || "czern",
                        legHeight: item.config.legHeight || 0,
                      });
                      setSaved(item);
                      setFormError("");
                    }}
                  >
                    <img src={item.photo.url} alt="" />
                    <span>
                      <strong>{item.id}</strong>
                      <span className="history-meta">
                        {item.config.height} × {item.config.width} × {item.config.depth} cm
                        {item.config.legHeight ? ` · nogi ${item.config.legHeight} cm` : ""}
                        {item.config.paint
                          ? ` · ${
                              catalog.paints.find((paintItem) => paintItem.id === item.config.paint)
                                ?.name || item.config.paint
                            }`
                          : ""}
                      </span>
                    </span>
                    <span className="history-price">{formatZl(item.price.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="caption tool-note">
          Stawki warsztatowe są w <code>server/src/pricing.js</code>. Model ze zdjęcia ma
          wychodzić {formatZl(catalog.referenceTotal)}.
        </p>
      </main>
    </div>
  );
}
