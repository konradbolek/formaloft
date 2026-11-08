import { useState } from "react";
import { sendContact } from "./api.js";
import { PieceCards } from "./Pieces.jsx";
import { company } from "./site.js";
import { StoryHero } from "./StoryHero.jsx";

const EMPTY = { name: "", email: "", phone: "", message: "", website: "" };

export function ContactPage() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await sendContact(form);
      setSavedId(created.id);
      setForm(EMPTY);
    } catch (err) {
      setError(err.fields?.join(" ") || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page story">
      <StoryHero
        kicker={company.name}
        title="Napisz albo zadzwoń"
        lede="Wycena wymiaru jest w kalkulatorze. Tutaj zostaw wiadomość o ścianie, terminie albo wizycie w warsztacie."
      />
      <section className="story-block">
        <p className="section-kicker">Najpierw wymiar</p>
        <h2>Wycena jest w kalkulatorze</h2>
        <p className="lede">
          Wiadomość zostaw, kiedy chcesz umówić wizytę albo dopytać o ścianę. Sam mebel policzysz od razu.
        </p>
        <PieceCards />
      </section>
      <main className="contact">
        <div className="contact-layout">
          <form className="panel contact-form" onSubmit={onSubmit} noValidate>
            <h2>Wiadomość</h2>
            <label className="field">
              <span>Imię</span>
              <input
                name="name"
                autoComplete="name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Telefon</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Wiadomość</span>
              <textarea
                name="message"
                rows={6}
                value={form.message}
                onChange={(event) => update("message", event.target.value)}
                required
              />
            </label>
            <label className="hp" aria-hidden="true">
              Strona
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
              />
            </label>
            <button className="submit" type="submit" disabled={busy}>
              {busy ? "Wysyłam…" : "Wyślij"}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {savedId && (
              <div className="saved" role="status">
                <p className="saved-kicker">Wiadomość zapisana</p>
                <p className="saved-id">{savedId}</p>
                <p>Odezwiemy się na podany e-mail albo telefon.</p>
              </div>
            )}
          </form>

          <aside className="contact-side">
            <div className="panel contact-card">
              <p className="section-kicker">Adres</p>
              <p className="address">
                <span>{company.street}</span>
                <span>{company.place}</span>
              </p>
              <p className="section-kicker">Telefon</p>
              <a className="contact-phone" href={company.phoneHref}>
                {company.phone}
              </a>
              <p>Wizytę w warsztacie umawiamy telefonicznie.</p>
            </div>
            <figure className="contact-map">
              <iframe
                title="Mapa: ul. Grodzisko 10, Pogorzyce"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${company.mapLon - 0.012}%2C${company.mapLat - 0.008}%2C${company.mapLon + 0.012}%2C${company.mapLat + 0.008}&layer=mapnik&marker=${company.mapLat}%2C${company.mapLon}`}
              />
              <figcaption>
                {company.street}, {company.place}.{" "}
                <a
                  href={`https://www.openstreetmap.org/?mlat=${company.mapLat}&mlon=${company.mapLon}#map=17/${company.mapLat}/${company.mapLon}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Otwórz większą mapę
                </a>
              </figcaption>
            </figure>
          </aside>
        </div>
      </main>
    </div>
  );
}
