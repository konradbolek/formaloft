import { useEffect, useMemo, useRef, useState } from "react";
import { getCatalog, getPrice, saveQuote } from "./api.js";
import { formatCm, formatZl } from "./format.js";
import { Measure } from "./Measure.jsx";
import { PieceSwitch } from "./Pieces.jsx";
import { Embers } from "./Embers.jsx";
import { RailView } from "./RailView.jsx";

const PRODUCT = "barierka";

const FACADE_COLORS = [
  { name: "Beż", color: "#e4d3b5" },
  { name: "Piasek", color: "#eadccb" },
  { name: "Szary", color: "#d4d0c8" },
  { name: "Biel", color: "#f4f1ea" },
  { name: "Szałwia", color: "#c9d0c0" },
  { name: "Grafit", color: "#6e6a66" },
];

function sameConfig(a, b) {
  return (
    a.length === b.length &&
    a.height === b.height &&
    a.postWidth === b.postWidth &&
    a.postDepth === b.postDepth &&
    a.postSpacing === b.postSpacing &&
    a.handrailWidth === b.handrailWidth &&
    a.handrailThickness === b.handrailThickness &&
    Boolean(a.bottom) === Boolean(b.bottom) &&
    a.bottomWidth === b.bottomWidth &&
    a.bottomThickness === b.bottomThickness &&
    (a.floorGap || 0) === (b.floorGap || 0) &&
    a.barDiameter === b.barDiameter &&
    (a.fill || "pret") === (b.fill || "pret") &&
    (a.fillWidth || 2) === (b.fillWidth || 2) &&
    (a.fillDepth || 2) === (b.fillDepth || 2) &&
    a.barGap === b.barGap &&
    a.mount === b.mount &&
    a.slabThickness === b.slabThickness &&
    (a.sides || "brak") === (b.sides || "brak") &&
    (a.sideLength || 110) === (b.sideLength || 110) &&
    (a.bars || "pion") === (b.bars || "pion") &&
    (a.paint || "czern") === (b.paint || "czern")
  );
}

export function RailCalculatorPage() {
  const [catalog, setCatalog] = useState(null);
  const [bootError, setBootError] = useState("");
  const [config, setConfig] = useState(null);
  const [quote, setQuote] = useState(null);
  const [pricing, setPricing] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const viewRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [facadeColor, setFacadeColor] = useState(FACADE_COLORS[0].color);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    document.title = "Stilowo — barierka balkonowa";
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
    if (!catalog || !config) return undefined;
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

  const paint = useMemo(() => {
    return catalog?.paints.find((item) => item.id === config?.paint) || catalog?.paints[0];
  }, [catalog, config]);

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

  function chooseFacade(color) {
    setFacadeColor(color);
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
    const shot = viewRef.current?.capture();
    if (!shot) {
      setFormError("Nie udało się zrobić grafiki barierki. Odśwież podgląd i spróbuj jeszcze raz.");
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

  if (!catalog || !config || !paint) {
    return (
      <main className="page">
        <p className="loading">Ładowanie kalkulatora…</p>
      </main>
    );
  }

  const limits = catalog.limits;
  const isReference = sameConfig(config, catalog.reference);
  const facadePreset = FACADE_COLORS.find((item) => item.color.toLowerCase() === facadeColor.toLowerCase());
  const photoLabel = file
    ? file.name
    : facadePreset
      ? `Elewacja ${facadePreset.name.toLowerCase()}`
      : "Kolor elewacji";

  return (
    <div className="page">
      <main>
        <div className="hero spark-hero">
          <Embers />
          <div className="spark-copy">
            <h1>Barierka balkonowa, na wymiar</h1>
            <p className="lede">
              Czoło i boki od ściany. Ustaw długość, wysokość, słupki, pochwyt i wypełnienie
              z prętów albo profili, w pionie albo w poziomie. Podgląd stoi na zewnątrz budynku.
            </p>
          </div>
        </div>

        <PieceSwitch />

        <form className="layout" onSubmit={onSubmit} noValidate>
          <section className="controls" aria-label="Wymiary barierki">
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
                  Model wyjściowy
                </button>
              </div>
              <p className="reference-note">
                <img src="/barierka.svg" alt="Rysunek barierki balkonowej przy elewacji" />
                <span>
                  Model wyjściowy: {catalog.referenceNote}. Stawka jest startowa, do poprawy po
                  pierwszej realizacji.
                </span>
              </p>

              <Measure
                label="Długość"
                hint="wzdłuż balkonu, razem ze słupkami"
                {...limits.length}
                value={config.length}
                onChange={(length) => patch({ length })}
              />
              <Measure
                label="Wysokość"
                hint="od płyty do wierzchu pochwytu"
                {...limits.height}
                value={config.height}
                onChange={(height) => patch({ height })}
              />
              <Measure
                label="Szerokość słupka"
                hint="wzdłuż barierki"
                {...limits.postWidth}
                value={config.postWidth}
                onChange={(postWidth) => patch({ postWidth })}
              />
              <Measure
                label="Głębokość słupka"
                hint="w stronę balkonu"
                {...limits.postDepth}
                value={config.postDepth}
                onChange={(postDepth) => patch({ postDepth })}
              />
              <Measure
                label="Rozstaw słupków"
                hint="największy odstęp między osiami"
                {...limits.postSpacing}
                value={config.postSpacing}
                onChange={(postSpacing) => patch({ postSpacing })}
              />
              <Measure
                label="Szerokość pochwytu"
                {...limits.handrailWidth}
                value={config.handrailWidth}
                onChange={(handrailWidth) => patch({ handrailWidth })}
              />
              <Measure
                label="Grubość pochwytu"
                {...limits.handrailThickness}
                value={config.handrailThickness}
                onChange={(handrailThickness) => patch({ handrailThickness })}
              />

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={config.bottom}
                  onChange={(event) => patch({ bottom: event.target.checked })}
                />
                Dolny rygiel
              </label>
              {config.bottom && (
                <>
                  <Measure
                    label="Szerokość rygla"
                    {...limits.bottomWidth}
                    value={config.bottomWidth}
                    onChange={(bottomWidth) => patch({ bottomWidth })}
                  />
                  <Measure
                    label="Grubość rygla"
                    {...limits.bottomThickness}
                    value={config.bottomThickness}
                    onChange={(bottomThickness) => patch({ bottomThickness })}
                  />
                </>
              )}
              <Measure
                label="Odstęp od płyty"
                hint="wolne miejsce od płyty do dołu wypełnienia"
                {...limits.floorGap}
                value={config.floorGap}
                onChange={(floorGap) => patch({ floorGap })}
              />

              <fieldset className="paints">
                <legend>Wypełnienie</legend>
                <div className="paint-row">
                  {[
                    { id: "pret", name: "Pręty" },
                    { id: "profil", name: "Profile" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={config.fill === item.id ? "paint-chip is-selected" : "paint-chip"}
                      aria-pressed={config.fill === item.id}
                      onClick={() => patch({ fill: item.id })}
                    >
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
                <p className="hint">Pręt jest okrągły. Profil to zamknięta rurka, liczona jak rama.</p>
              </fieldset>
              {config.fill === "profil" ? (
                <>
                  <Measure
                    label="Szerokość profilu"
                    hint="tyle zajmuje w prześwicie"
                    {...limits.fillWidth}
                    value={config.fillWidth}
                    onChange={(fillWidth) => patch({ fillWidth })}
                  />
                  <Measure
                    label="Grubość profilu"
                    {...limits.fillDepth}
                    value={config.fillDepth}
                    onChange={(fillDepth) => patch({ fillDepth })}
                  />
                </>
              ) : (
                <Measure
                  label="Średnica pręta"
                  {...limits.barDiameter}
                  value={config.barDiameter}
                  onChange={(barDiameter) => patch({ barDiameter })}
                />
              )}
              <Measure
                label="Prześwit"
                hint="największy, faktyczny wychodzi obok ceny"
                {...limits.barGap}
                value={config.barGap}
                onChange={(barGap) => patch({ barGap })}
              />

              <fieldset className="paints">
                <legend>Układ</legend>
                <div className="paint-row">
                  {[
                    { id: "pion", name: "Pionowo" },
                    { id: "poziom", name: "Poziomo" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={config.bars === item.id ? "paint-chip is-selected" : "paint-chip"}
                      aria-pressed={config.bars === item.id}
                      onClick={() => patch({ bars: item.id })}
                    >
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
                <p className="hint">Ten sam maksymalny prześwit, w pionie albo w poziomie.</p>
              </fieldset>

              <fieldset className="paints">
                <legend>Boki od ściany</legend>
                <div className="paint-row">
                  {[
                    { id: "brak", name: "Brak" },
                    { id: "lewa", name: "Lewa" },
                    { id: "prawa", name: "Prawa" },
                    { id: "obie", name: "Obie" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={config.sides === item.id ? "paint-chip is-selected" : "paint-chip"}
                      aria-pressed={config.sides === item.id}
                      onClick={() => patch({ sides: item.id })}
                    >
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <Measure
                label="Wysięg od ściany"
                hint={
                  config.sides === "brak"
                    ? "głębokość balkonu na podglądzie, bez dopłaty"
                    : "tyle ma bok od ściany do czoła"
                }
                {...limits.sideLength}
                value={config.sideLength}
                onChange={(sideLength) => patch({ sideLength })}
              />

              <fieldset className="paints">
                <legend>Mocowanie</legend>
                <div className="paint-row">
                  {[
                    { id: "plyta", name: "Na płycie" },
                    { id: "czolo", name: "Do czoła" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={config.mount === item.id ? "paint-chip is-selected" : "paint-chip"}
                      aria-pressed={config.mount === item.id}
                      onClick={() => patch({ mount: item.id })}
                    >
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
                <p className="hint">
                  Do czoła słupek schodzi o grubość płyty i ta stal wchodzi w cenę.
                </p>
              </fieldset>
              {config.mount === "czolo" && (
                <Measure
                  label="Grubość płyty"
                  hint="tyle dokładamy do słupka"
                  {...limits.slabThickness}
                  value={config.slabThickness}
                  onChange={(slabThickness) => patch({ slabThickness })}
                />
              )}

              <fieldset className="paints">
                <legend>Kolor stali</legend>
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
                <p className="hint">Kolor nie zmienia ceny.</p>
              </fieldset>

              <fieldset className="paints wall-colors">
                <legend>Kolor elewacji</legend>
                <div className="paint-row">
                  {FACADE_COLORS.map((item) => {
                    const selected = !file && item.color.toLowerCase() === facadeColor.toLowerCase();
                    return (
                      <button
                        key={item.color}
                        type="button"
                        className={selected ? "paint-chip is-selected" : "paint-chip"}
                        aria-pressed={selected}
                        onClick={() => chooseFacade(item.color)}
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
                      value={facadeColor}
                      aria-label="Własny kolor elewacji"
                      onChange={(event) => chooseFacade(event.target.value)}
                    />
                  </label>
                </div>
                <p className="hint">Zamiast zdjęcia. Płyta, drzwi i niebo zostają.</p>
              </fieldset>

              <div className="file-row">
                <label className="file-button">
                  {file ? "Zmień zdjęcie elewacji" : "Wgraj zdjęcie elewacji"}
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
              <RailView
                ref={viewRef}
                length={config.length}
                height={config.height}
                postWidth={config.postWidth}
                postDepth={config.postDepth}
                postSpacing={config.postSpacing}
                handrailWidth={config.handrailWidth}
                handrailThickness={config.handrailThickness}
                bottom={config.bottom}
                bottomWidth={config.bottomWidth}
                bottomThickness={config.bottomThickness}
                floorGap={config.floorGap}
                barDiameter={config.barDiameter}
                fill={config.fill}
                fillWidth={config.fillWidth}
                fillDepth={config.fillDepth}
                barGap={config.barGap}
                mount={config.mount}
                slabThickness={config.slabThickness}
                sides={config.sides}
                sideLength={config.sideLength}
                bars={config.bars}
                frameColor={paint.color}
                photoUrl={previewUrl}
                wallColor={facadeColor}
              />
              <p className="stage-chip">{photoLabel}</p>
            </div>
            <p className="caption">
              Barierka ma proporcje z suwaków. Przeciągnij ją, żeby obejrzeć z boku.
              Kółkiem myszy albo dwoma palcami lekko przybliżysz i oddalisz.
              Zdjęcie wchodzi na elewację. JPG, PNG lub WEBP, do 8 MB.
            </p>

            <div className="price-card" aria-live="polite">
              <div className={pricing ? "price-chip is-loading" : "price-chip"}>
                <div>
                  <p className="price-kicker">
                    {isReference ? "Model wyjściowy" : "Twoja konfiguracja"}
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
                    ? "Tyle kosztuje model wyjściowy."
                    : `${formatZl(Math.abs(quote.total - quote.referenceTotal))} ${
                        quote.total > quote.referenceTotal ? "więcej" : "mniej"
                      } niż model wyjściowy.`}
                </p>
              )}

              <p className="clearance">
                Słupki: {quote?.postCount ?? "…"}, {config.fill === "profil" ? "profile" : "pręty"}:{" "}
                {quote?.barCount ?? "…"}, prześwit {formatCm(quote?.gap ?? 0)} cm.
              </p>
              {quote?.warnings?.map((line) => (
                <p className="warn" key={line}>
                  {line}
                </p>
              ))}

              {priceError && (
                <p className="error" role="alert">
                  {priceError}
                </p>
              )}

              <button className="submit" type="submit" disabled={busy || pricing || !quote}>
                {busy ? "Zapisuję…" : "Zapisz wycenę"}
              </button>
              <p className="hint">
                Stawka startowa. Profile ramy i wypełnienia liczą się jak rama mebla, pręt ma własną
                cenę za metr. Kolor stali i elewacji nie zmienia kwoty. Zdjęcie nie jest wymagane.
              </p>
              {formError && (
                <p className="error" role="alert">
                  {formError}
                </p>
              )}
              {saved && (
                <div className="saved" role="status">
                  <p className="saved-kicker">Wycena zapisana</p>
                  <p className="saved-id">{saved.id}</p>
                  <p>{formatZl(saved.price.total)} · grafika barierki jest przy tej wycenie.</p>
                </div>
              )}
            </div>
          </aside>
        </form>

        <div className="dock">
          <span>{isReference ? "Model wyjściowy" : "Razem"}</span>
          <strong>{quote ? formatZl(quote.total) : "…"}</strong>
        </div>
      </main>
    </div>
  );
}
