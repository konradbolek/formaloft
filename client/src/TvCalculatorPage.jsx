import { useEffect, useMemo, useRef, useState } from "react";
import { getCatalog, getPrice, saveQuote } from "./api.js";
import { formatCm, formatZl } from "./format.js";
import { Measure } from "./Measure.jsx";
import { PieceSwitch } from "./Pieces.jsx";
import { Embers } from "./Embers.jsx";
import { TvShelfView } from "./TvShelfView.jsx";

const PRODUCT = "polka-rtv";

const WALL_COLORS = [
  { name: "Beż", color: "#eadccb" },
  { name: "Piasek", color: "#e4d3b5" },
  { name: "Szary", color: "#d4d0c8" },
  { name: "Biel", color: "#f7f4ee" },
  { name: "Szałwia", color: "#c9d0c0" },
  { name: "Grafit", color: "#6e6a66" },
];

const EMPTY_CONFIG = {
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

function sameConfig(a, b) {
  return (
    a.height === b.height &&
    a.width === b.width &&
    a.depth === b.depth &&
    a.frameThickness === b.frameThickness &&
    a.shelfThickness === b.shelfThickness &&
    a.shelves === b.shelves &&
    a.bays === b.bays &&
    a.wood === b.wood &&
    (a.paint || "czern") === (b.paint || "czern") &&
    (a.legHeight || 0) === (b.legHeight || 0)
  );
}

export function TvCalculatorPage() {
  const [catalog, setCatalog] = useState(null);
  const [bootError, setBootError] = useState("");
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [quote, setQuote] = useState(null);
  const [pricing, setPricing] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const viewRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [wallColor, setWallColor] = useState(WALL_COLORS[0].color);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    document.title = "Stilowo — półka pod telewizor";
    return () => {
      document.title = "Stilowo — wycena stojaka";
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    getCatalog(PRODUCT)
      .then((data) => {
        if (cancel) return;
        setCatalog(data);
        setConfig(data.reference);
      })
      .catch(() => {
        if (!cancel) {
          setBootError(
            "Nie mogę połączyć się z serwerem wyceny. Uruchom aplikację poleceniem npm run dev.",
          );
        }
      });
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
      getPrice({ ...config, product: PRODUCT }, controller.signal)
        .then((data) => {
          setQuote(data);
          setPriceError("");
        })
        .catch((error) => {
          if (error.name === "AbortError") return;
          setQuote(null);
          setPriceError(error.fields?.join(" ") || error.message);
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
      /image\/(jpeg|png|webp)/.test(next.type) || /\.(jpe?g|png|webp)$/i.test(next.name);
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
    const shot = viewRef.current?.capture();
    if (!shot) {
      setFormError("Nie udało się zrobić grafiki mebla. Odśwież podgląd i spróbuj jeszcze raz.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const created = await saveQuote({ ...config, product: PRODUCT }, shot, file);
      setSaved(created);
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
        <div className="hero spark-hero">
          <Embers />
          <div className="spark-copy">
            <h1>Półka pod telewizor, na wymiar</h1>
            <p className="lede">
              Ustaw wysokość, szerokość, głębokość, liczbę półek i segmentów. Cena liczy się od stali,
              drewna i robocizny, tymi samymi stawkami co stojak.
            </p>
          </div>
        </div>

        <PieceSwitch />

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
                <img src="/wizualizacja-polka.jpg" alt="Wizualizacja półki pod telewizor, czarna stal i dąb" />
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
                hint="od podłogi do dolnej półki"
                {...limits.legHeight}
                value={config.legHeight ?? 0}
                onChange={(legHeight) => patch({ legHeight })}
              />
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Rama i półki</h2>
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
                  label="Grubość półek"
                  hint="deski na ramie"
                  {...limits.shelfThickness}
                  value={config.shelfThickness}
                  onChange={(shelfThickness) => patch({ shelfThickness })}
                />
              </div>
              <div className="pair">
                <Measure
                  label="Liczba półek"
                  hint="blat i półki pod nim"
                  {...limits.shelves}
                  value={config.shelves}
                  onChange={(shelves) => patch({ shelves })}
                />
                <Measure
                  label="Liczba segmentów"
                  hint="pionowe podziały"
                  {...limits.bays}
                  value={config.bays}
                  onChange={(bays) => patch({ bays })}
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
                <legend>Drewno półek</legend>
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
              <TvShelfView
                ref={viewRef}
                height={config.height}
                width={config.width}
                depth={config.depth}
                frame={config.frameThickness}
                board={config.shelfThickness}
                shelves={config.shelves}
                bays={config.bays}
                legs={config.legHeight ?? 0}
                woodColor={wood.color}
                woodEdge={wood.edge}
                frameColor={paint.color}
                photoUrl={previewUrl}
                wallColor={wallColor}
              />
              <p className="stage-chip">{photoLabel}</p>
            </div>
            <p className="caption">
              Półka ma proporcje z suwaków. Przeciągnij ją, żeby obrócić. Kółkiem myszy albo dwoma
              palcami lekko przybliżysz i oddalisz. Zdjęcie wchodzi na trzy ściany.
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
                    ? "Tyle kosztuje model ze zdjęcia przy tych stawkach."
                    : `${formatZl(Math.abs(quote.total - quote.referenceTotal))} ${
                        quote.total > quote.referenceTotal ? "więcej" : "mniej"
                      } niż model ze zdjęcia.`}
                </p>
              )}

              <p className="clearance">
                Segment ma {formatCm(quote?.clearance.width ?? 0)} × {formatCm(quote?.clearance.depth ?? 0)} cm,
                odstęp między półkami {formatCm(quote?.clearance.height ?? 0)} cm
                {config.legHeight > 0 ? `, dolna półka od ${formatCm(config.legHeight)} cm` : ""}.
              </p>

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
                  Cena jest już policzona. Zdjęcie ściany nie jest wymagane — do wyceny zapisze się grafika mebla.
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
                    {formatZl(saved.price.total)} · grafika mebla jest przy tej wycenie.
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

        <p className="caption tool-note">
          Stawki warsztatowe są te same co przy stojaku, w <code>server/src/pricing.js</code>.
        </p>
      </main>
    </div>
  );
}
