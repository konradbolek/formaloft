import { useEffect, useState } from "react";
import {
  createRealization,
  panelRealizations,
  removeRealization,
  saveRealization,
  uploadRealizationPhoto,
} from "./api.js";

const EMPTY = {
  title: "",
  kicker: "",
  summary: "",
  body: "",
  priceLabel: "",
  alt: "",
  calculatorPath: "",
  published: false,
};

export function RealizationsPanel() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState("");
  const [state, setState] = useState("");

  const selected = items.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    panelRealizations()
      .then((data) => {
        const next = data.items || [];
        setItems(next);
        setSelectedId((current) => current || next[0]?.id || "");
      })
      .catch((err) => setError(err.message || "Nie udało się otworzyć realizacji."));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDraft({
      title: selected.title || "",
      kicker: selected.kicker || "",
      summary: selected.summary || "",
      body: selected.body || "",
      priceLabel: selected.priceLabel || "",
      alt: selected.alt || "",
      calculatorPath: selected.calculatorPath || "",
      published: Boolean(selected.published),
    });
    setState("");
  }, [selected]);

  function replace(next) {
    setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  async function onCreate() {
    setError("");
    try {
      const created = await createRealization("Nowa realizacja");
      setItems((current) => [...current, created]);
      setSelectedId(created.id);
    } catch (err) {
      setError(err.message || "Nie udało się dodać realizacji.");
    }
  }

  async function onSave(event) {
    event.preventDefault();
    if (!selected) return;
    setState("saving");
    setError("");
    try {
      const saved = await saveRealization(selected.id, draft);
      replace(saved);
      setState("saved");
    } catch (err) {
      setState("");
      setError(err.message || "Nie udało się zapisać.");
    }
  }

  async function onPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selected) return;
    setState("photo");
    setError("");
    try {
      replace(await uploadRealizationPhoto(selected.id, file));
      setState("saved");
    } catch (err) {
      setState("");
      setError(err.message || "Nie udało się wgrać zdjęcia.");
    }
  }

  async function onDelete() {
    if (!selected) return;
    if (!window.confirm("Usunąć tę realizację ze strony i z panelu?")) return;
    setError("");
    try {
      await removeRealization(selected.id);
      const next = items.filter((item) => item.id !== selected.id);
      setItems(next);
      setSelectedId(next[0]?.id || "");
    } catch (err) {
      setError(err.message || "Nie udało się usunąć.");
    }
  }

  return (
    <div className={`admin-split${selected ? " is-open" : ""}`}>
      <section className="admin-list" aria-label="Lista realizacji">
        <div className="admin-filters">
          <button type="button" onClick={onCreate}>
            Nowa realizacja
          </button>
        </div>
        {items.length === 0 ? (
          <p className="admin-empty">Nie ma jeszcze realizacji. Nowa zostaje ukryta, dopóki jej nie pokażesz.</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`admin-row${item.id === selected?.id ? " is-on" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  {item.image ? <img src={item.image} alt="" /> : <span className="admin-ph">Bez zdjęcia</span>}
                  <span>
                    <strong>{item.title || item.id}</strong>
                    <span className="admin-row-meta">{item.id}</span>
                  </span>
                  <span className="admin-row-end">
                    <span className="admin-chip">{item.published ? "Na stronie" : "Ukryta"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {selected && (
        <article className="admin-detail">
          <form onSubmit={onSave}>
            {selected.image && (
              <img className="realization-editor-photo" src={selected.image} alt={selected.alt || selected.title} />
            )}
            <label className="admin-note">
              Tytuł
              <input
                value={draft.title}
                maxLength={120}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <label className="admin-note">
              Podpis
              <input
                value={draft.kicker}
                maxLength={80}
                onChange={(event) => setDraft({ ...draft, kicker: event.target.value })}
              />
            </label>
            <label className="admin-note">
              Krótki opis, na stronie głównej
              <textarea
                rows={3}
                maxLength={400}
                value={draft.summary}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
              />
            </label>
            <label className="admin-note">
              Opis na stronie realizacji
              <textarea
                rows={8}
                maxLength={2000}
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
              />
            </label>
            <label className="admin-note">
              Cena na stronie
              <input
                value={draft.priceLabel}
                maxLength={40}
                onChange={(event) => setDraft({ ...draft, priceLabel: event.target.value })}
              />
            </label>
            <label className="admin-note">
              Link do kalkulatora
              <input
                value={draft.calculatorPath}
                maxLength={80}
                placeholder="/kalkulator/stojak-na-drewno"
                onChange={(event) => setDraft({ ...draft, calculatorPath: event.target.value })}
              />
            </label>
            <label className="admin-note">
              Opis zdjęcia
              <input
                value={draft.alt}
                maxLength={200}
                onChange={(event) => setDraft({ ...draft, alt: event.target.value })}
              />
            </label>
            <label className="admin-note">
              Zdjęcie
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(event) => setDraft({ ...draft, published: event.target.checked })}
              />
              Pokaż na stronie
            </label>
            {error && <p className="admin-error">{error}</p>}
            <div className="admin-savebar">
              <button type="submit">{state === "saving" ? "Zapisuję…" : "Zapisz"}</button>
              <button type="button" onClick={onDelete}>
                Usuń
              </button>
              <span>{state === "saved" ? "Zapisano" : state === "photo" ? "Wgrywam zdjęcie…" : ""}</span>
            </div>
          </form>
          <p className="admin-when">Wycena oznaczona jako odebrana nie wchodzi tutaj sama.</p>
        </article>
      )}
    </div>
  );
}
