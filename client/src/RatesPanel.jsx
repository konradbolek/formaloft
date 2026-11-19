import { useEffect, useState } from "react";
import { panelRates, savePanelRates } from "./api.js";

const WALLS = [
  { id: "15", label: "1,5 mm" },
  { id: "20", label: "2 mm" },
  { id: "30", label: "3 mm" },
];

const PROFILES = [
  { key: "frame2", label: "2 cm" },
  { key: "frame3", label: "3 cm" },
  { key: "frame4", label: "4 cm" },
];

const STARTS = [
  { key: "stojak", label: "Stojak" },
  { key: "polka", label: "Półka pod telewizor" },
  { key: "regal", label: "Regał" },
  { key: "barierka", label: "Barierka" },
];

const FIELDS = [
  { group: "Drewno", key: "sosna", label: "Sosna", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Drewno", key: "buk", label: "Buk", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Drewno", key: "jesion", label: "Jesion", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Drewno", key: "dab", label: "Dąb", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Drewno", key: "orzech", label: "Orzech", hint: "zł/m² przy 2 cm", wood: true },
  { group: "Wykończenie", key: "finishM2", label: "Olejowanie", hint: "zł za m²" },
  { group: "Wykończenie", key: "laborMeter", label: "Robocizna za metr stali", hint: "doliczana do startu" },
  { group: "Barierka", key: "bar1", label: "Pręt 1 cm", hint: "zł za metr" },
  { group: "Barierka", key: "bar2", label: "Pręt 2 cm", hint: "zł za metr" },
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

  function editSteel(wall, key, raw) {
    const next = raw === "" ? "" : Number(raw);
    setRates((current) => {
      const steel = {
        ...current.steel,
        [wall]: { ...current.steel[wall], [key]: next },
      };
      const mirror = wall === "20" ? { [key]: next } : {};
      return { ...current, ...mirror, steel };
    });
    setSaved("");
  }

  function editLabor(key, raw) {
    const next = raw === "" ? "" : Number(raw);
    setRates((current) => ({
      ...current,
      laborBase: key === "stojak" ? next : current.laborBase,
      railLaborBase: key === "barierka" ? next : current.railLaborBase,
      labor: { ...current.labor, [key]: next },
    }));
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
        Stawki startowe zostają w kodzie. Zapis zmienia ceny w kalkulatorze.
        Profil między 2 a 4 cm liczy się liniowo. Cieńsza i grubsza ścianka ma własną stawkę za metr.
      </p>
      <section className="rate-card">
        <h2>Stal, zł za metr</h2>
        <table className="rate-table">
          <thead>
            <tr>
              <th>Ścianka</th>
              {PROFILES.map((profile) => (
                <th key={profile.key}>{profile.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WALLS.map((wall) => (
              <tr key={wall.id}>
                <th>{wall.label}</th>
                {PROFILES.map((profile) => (
                  <td key={profile.key}>
                    <input
                      type="number"
                      min="0"
                      max="20000"
                      step="1"
                      inputMode="numeric"
                      aria-label={`Profil ${profile.label}, ścianka ${wall.label}`}
                      value={rates.steel?.[wall.id]?.[profile.key] ?? ""}
                      onChange={(event) => editSteel(wall.id, profile.key, event.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="rate-card">
        <h2>Robocizna na start</h2>
        <div className="rate-grid">
          {STARTS.map((item) => (
            <label key={item.key}>
              {item.label}
              <span>zł, zanim doliczy się metry stali</span>
              <input
                type="number"
                min="0"
                max="20000"
                step="1"
                inputMode="numeric"
                value={rates.labor?.[item.key] ?? ""}
                onChange={(event) => editLabor(item.key, event.target.value)}
              />
            </label>
          ))}
        </div>
      </section>
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
