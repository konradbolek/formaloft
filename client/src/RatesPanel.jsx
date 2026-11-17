import { useEffect, useState } from "react";
import { panelRates, savePanelRates } from "./api.js";

const FIELDS = [
  { group: "Stal", key: "frame2", label: "Profil 2 cm", hint: "zł za metr" },
  { group: "Stal", key: "frame3", label: "Profil 3 cm", hint: "zł za metr" },
  { group: "Stal", key: "frame4", label: "Profil 4 cm", hint: "zł za metr" },
  { group: "Drewno", key: "sosna", label: "Sosna", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Drewno", key: "buk", label: "Buk", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Drewno", key: "jesion", label: "Jesion", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Drewno", key: "dab", label: "Dąb", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Drewno", key: "orzech", label: "Orzech", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Meble", key: "finishM2", label: "Olejowanie", hint: "zł za m²" },
  { group: "Meble", key: "laborBase", label: "Robocizna, start", hint: "zł za mebel" },
  { group: "Meble", key: "laborMeter", label: "Robocizna stali", hint: "zł za metr" },
  { group: "Barierka", key: "bar1", label: "Pręt 1 cm", hint: "zł za metr" },
  { group: "Barierka", key: "bar2", label: "Pręt 2 cm", hint: "zł za metr" },
  { group: "Barierka", key: "railLaborBase", label: "Robocizna, start", hint: "zł za barierkę" },
  { group: "Barierka", key: "railLaborPiece", label: "Sztuka wypełnienia", hint: "zł za pręt lub profil" },
];

function valueOf(rates, field) {
  if (!rates) return "";
  return field.wood ? rates.woods[field.key] : rates[field.key];
}

export function RatesPanel() {
  const [rates, setRates] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [published, setPublished] = useState(0);
  const [examples, setExamples] = useState([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    panelRates()
      .then((data) => {
        if (!live) return;
        setRates(data.rates);
        setDefaults(data.defaults);
        setPublished(1);
      })
      .catch((err) => {
        if (live) setError(err.message || "Nie udało się otworzyć cennika.");
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!published) return undefined;
    let live = true;
    Promise.all(
      [
        ["stojak", "Stojak ze zdjęcia"],
        ["polka-rtv", "Półka ze zdjęcia"],
        ["regal", "Regał ze zdjęcia"],
        ["barierka", "Barierka wzorcowa"],
      ].map(async ([product, label]) => {
        const response = await fetch(`/api/catalog?product=${product}`);
        if (!response.ok) return null;
        const data = await response.json();
        return { label, total: data.referenceTotal };
      }),
    )
      .then((rows) => {
        if (live) setExamples(rows.filter(Boolean));
      })
      .catch(() => {
        if (live) setExamples([]);
      });
    return () => {
      live = false;
    };
  }, [published]);

  function edit(field, raw) {
    const next = raw === "" ? "" : Number(raw);
    setRates((current) => {
      if (field.wood) return { ...current, woods: { ...current.woods, [field.key]: next } };
      return { ...current, [field.key]: next };
    });
    setSaved("");
  }

  async function persist(next) {
    setBusy(true);
    setError("");
    try {
      const data = await savePanelRates(next);
      setRates(data.rates);
      setDefaults(data.defaults);
      setPublished((value) => value + 1);
      setSaved("Zapisane. Kalkulator na tym komputerze liczy już z tych stawek.");
    } catch (err) {
      setError(err.message || "Nie udało się zapisać cennika.");
    } finally {
      setBusy(false);
    }
  }

  if (!rates) {
    return <p className="admin-empty">{error || "Otwieram cennik…"}</p>;
  }

  const groups = [...new Set(FIELDS.map((field) => field.group))];

  return (
    <form
      className="rates"
      onSubmit={(event) => {
        event.preventDefault();
        persist(rates);
      }}
    >
      {error && <p className="admin-error">{error}</p>}
      <p className="admin-when">
        Stawki startowe zostają w kodzie. Tu zmieniasz cennik, z którego liczy kalkulator na tym komputerze.
        Grubszy profil między podanymi centymetrami liczy się liniowo.
      </p>
      {groups.map((group) => (
        <section key={group} className="rate-card">
          <h2>{group}</h2>
          <div className="rate-grid">
            {FIELDS.filter((field) => field.group === group).map((field) => (
              <label key={field.key}>
                {field.label}
                <span>{field.hint}</span>
                <input
                  type="number"
                  min="0"
                  max="20000"
                  step="1"
                  inputMode="numeric"
                  value={valueOf(rates, field)}
                  onChange={(event) => edit(field, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
      ))}
      {examples.length > 0 && (
        <ul className="rate-examples">
          {examples.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <strong>
                {new Intl.NumberFormat("pl-PL", {
                  style: "currency",
                  currency: "PLN",
                  maximumFractionDigits: 0,
                }).format(item.total)}
              </strong>
            </li>
          ))}
        </ul>
      )}
      <div className="admin-savebar">
        <button type="submit" disabled={busy}>
          {busy ? "Zapisuję…" : "Zapisz cennik"}
        </button>
        <button
          type="button"
          disabled={busy || !defaults}
          onClick={() => persist(defaults)}
        >
          Przywróć startowe
        </button>
        {saved && <span>{saved}</span>}
      </div>
    </form>
  );
}
