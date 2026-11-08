import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminDesk,
  adminLogin,
  adminLogout,
  adminPatchMessage,
  adminPatchQuote,
  adminSession,
} from "./api.js";
import { formatZl } from "./format.js";
import { Logo } from "./Logo.jsx";
import { company } from "./site.js";

const STATUSES = [
  { id: "nowa", label: "Nowa" },
  { id: "rozmowa", label: "W rozmowie" },
  { id: "produkcja", label: "W produkcji" },
  { id: "gotowa", label: "Gotowa" },
  { id: "odebrana", label: "Odebrana" },
];

function statusLabel(id) {
  return STATUSES.find((item) => item.id === id)?.label || "Nowa";
}

function when(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `dziś, ${time}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `wczoraj, ${time}`;
  return `${date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}, ${time}`;
}

function sameDraft(draft, quote) {
  return (
    draft.clientName === (quote.clientName || "") &&
    draft.clientPhone === (quote.clientPhone || "") &&
    draft.note === (quote.note || "")
  );
}

export function AdminPage() {
  const [phase, setPhase] = useState("checking");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [section, setSection] = useState("quotes");
  const [desk, setDesk] = useState({ quotes: [], messages: [] });
  const [deskReady, setDeskReady] = useState(false);
  const [deskError, setDeskError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quoteQuery, setQuoteQuery] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState({ clientName: "", clientPhone: "", note: "" });
  const [messageNote, setMessageNote] = useState("");
  const [saveState, setSaveState] = useState("");
  const saveChain = useRef(Promise.resolve());

  useEffect(() => {
    const previous = document.title;
    document.title = `${company.name} — warsztat`;
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    const previousContent = meta.getAttribute("content");
    meta.setAttribute("content", "noindex, nofollow");
    return () => {
      document.title = previous;
      if (created) meta.remove();
      else if (previousContent) meta.setAttribute("content", previousContent);
    };
  }, []);

  useEffect(() => {
    let gone = false;
    adminSession()
      .then((result) => {
        if (gone) return;
        if (result.ok) {
          setPhase("desk");
          return loadDesk();
        }
        setPhase("login");
      })
      .catch(() => {
        if (!gone) setPhase("login");
      });
    return () => {
      gone = true;
    };
  }, []);

  async function loadDesk() {
    setDeskError("");
    try {
      const next = await adminDesk();
      setDesk({ quotes: next.quotes || [], messages: next.messages || [] });
    } catch (error) {
      setDeskError(error.message || "Nie udało się otworzyć kolejki.");
    } finally {
      setDeskReady(true);
    }
  }

  const quotes = desk.quotes;
  const messages = desk.messages;
  const freshQuotes = quotes.filter((item) => item.status === "nowa").length;
  const openQuotes = quotes.filter((item) => item.status !== "odebrana").length;
  const making = quotes.filter((item) => item.status === "produkcja").length;
  const ready = quotes.filter((item) => item.status === "gotowa").length;
  const openMessages = messages.filter((item) => !item.handled).length;

  const visibleQuotes = useMemo(() => {
    const query = quoteQuery.trim().toLowerCase();
    return quotes.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!query) return true;
      return [item.id, item.clientName, item.clientPhone, item.productName, item.summary]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [quotes, quoteQuery, statusFilter]);

  const visibleMessages = useMemo(() => {
    const query = messageQuery.trim().toLowerCase();
    return messages.filter((item) => {
      if (onlyOpen && item.handled) return false;
      if (!query) return true;
      return [item.id, item.name, item.email, item.phone, item.message, item.note]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [messages, messageQuery, onlyOpen]);

  const selectedQuote = quotes.find((item) => item.id === selectedId) || null;
  const selectedMessage = messages.find((item) => item.id === selectedId) || null;
  const list = section === "quotes" ? visibleQuotes : visibleMessages;

  useEffect(() => {
    if (selectedId && list.some((item) => item.id === selectedId)) return;
    if (!list[0]) {
      if (selectedId) setSelectedId("");
      return;
    }
    const wide = window.matchMedia("(min-width: 881px)").matches;
    if (selectedId || wide) setSelectedId(list[0].id);
  }, [list, selectedId]);

  useEffect(() => {
    if (!selectedQuote) return;
    setDraft({
      clientName: selectedQuote.clientName || "",
      clientPhone: selectedQuote.clientPhone || "",
      note: selectedQuote.note || "",
    });
    setSaveState("");
  }, [selectedQuote?.id]);

  useEffect(() => {
    if (!selectedMessage) return;
    setMessageNote(selectedMessage.note || "");
    setSaveState("");
  }, [selectedMessage?.id]);

  async function onLogin(event) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      await adminLogin(password);
      setPassword("");
      setPhase("desk");
      await loadDesk();
    } catch (error) {
      setLoginError(error.message || "Hasło nie pasuje.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function onLogout() {
    await adminLogout().catch(() => {});
    setDesk({ quotes: [], messages: [] });
    setSelectedId("");
    setPhase("login");
  }

  function replaceQuote(next) {
    setDesk((current) => ({
      ...current,
      quotes: current.quotes.map((item) => (item.id === next.id ? next : item)),
    }));
  }

  function replaceMessage(next) {
    setDesk((current) => ({
      ...current,
      messages: current.messages.map((item) => (item.id === next.id ? next : item)),
    }));
  }

  function enqueue(work) {
    setSaveState("saving");
    setDeskError("");
    const job = saveChain.current.then(work);
    saveChain.current = job.then(
      () => {},
      () => {},
    );
    return job;
  }

  function saveQuote(id, patch) {
    return enqueue(async () => {
      try {
        const next = await adminPatchQuote(id, patch);
        replaceQuote(next);
        setSaveState("saved");
      } catch (error) {
        setSaveState("");
        setDeskError(error.message || "Nie udało się zapisać.");
      }
    });
  }

  function saveMessage(id, patch) {
    return enqueue(async () => {
      try {
        const next = await adminPatchMessage(id, patch);
        replaceMessage(next);
        setSaveState("saved");
      } catch (error) {
        setSaveState("");
        setDeskError(error.message || "Nie udało się zapisać.");
      }
    });
  }

  function commitDraft() {
    if (!selectedQuote || sameDraft(draft, selectedQuote)) return;
    saveQuote(selectedQuote.id, draft);
  }

  function commitMessageNote() {
    if (!selectedMessage || messageNote === (selectedMessage.note || "")) return;
    saveMessage(selectedMessage.id, { note: messageNote });
  }

  if (phase === "checking") {
    return (
      <main className="admin-login">
        <Logo tone="light" />
        <p>Sprawdzam wejście…</p>
      </main>
    );
  }

  if (phase === "login") {
    return (
      <main className="admin-login">
        <form onSubmit={onLogin}>
          <Logo tone="light" />
          <h1>Warsztat</h1>
          <p className="admin-lede">
            Wyceny ze zdjęciem ściany, wiadomości z formularza i status mebla. Hasło zostaje u nas.
          </p>
          <label>
            Hasło
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {loginError && <p className="admin-error">{loginError}</p>}
          <button className="admin-enter" type="submit" disabled={loginBusy || !password}>
            {loginBusy ? "Sprawdzam…" : "Wejdź"}
          </button>
        </form>
      </main>
    );
  }

  const queue = [];
  if (freshQuotes) queue.push(`${freshQuotes} ${freshQuotes === 1 ? "nowa wycena" : "nowe wyceny"}`);
  if (openMessages) queue.push(`${openMessages} ${openMessages === 1 ? "wiadomość" : "wiadomości"}`);
  if (making) queue.push(`${making} w produkcji`);
  if (ready) queue.push(`${ready} ${ready === 1 ? "gotowa do odbioru" : "gotowe do odbioru"}`);

  return (
    <div className="admin">
      <aside className="admin-side">
        <Logo tone="light" />
        <p className="admin-kicker">Warsztat</p>
        <nav className="admin-tabs" aria-label="Kolejka">
          <button
            type="button"
            className={section === "quotes" ? "is-on" : ""}
            onClick={() => {
              setSection("quotes");
              setSelectedId("");
            }}
          >
            Wyceny
            <span>{openQuotes}</span>
          </button>
          <button
            type="button"
            className={section === "messages" ? "is-on" : ""}
            onClick={() => {
              setSection("messages");
              setSelectedId("");
            }}
          >
            Wiadomości
            <span>{openMessages}</span>
          </button>
        </nav>
        <div className="admin-side-foot">
          <Link to="/">Na stronę</Link>
          <button type="button" onClick={onLogout}>
            Wyloguj
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-head">
          <div>
            <h1>{section === "quotes" ? "Wyceny" : "Wiadomości"}</h1>
            <p>
              {!deskReady
                ? "Otwieram kolejkę…"
                : queue.length
                  ? queue.join(" · ")
                  : "Kolejka pusta. Nowe rzeczy wpadną tutaj same."}
            </p>
          </div>
          <button type="button" className="admin-refresh" onClick={loadDesk}>
            Odśwież
          </button>
        </header>
        {deskError && <p className="admin-error">{deskError}</p>}

        {!deskReady ? (
          <p className="admin-empty">Otwieram kolejkę…</p>
        ) : section === "quotes" ? (
          <QuoteDesk
            items={visibleQuotes}
            quotes={quotes}
            query={quoteQuery}
            setQuery={setQuoteQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            selected={selectedQuote}
            setSelectedId={setSelectedId}
            draft={draft}
            setDraft={setDraft}
            saveState={saveState}
            onStatus={(status) => selectedQuote && saveQuote(selectedQuote.id, { status })}
            onCommit={commitDraft}
          />
        ) : (
          <MessageDesk
            items={visibleMessages}
            query={messageQuery}
            setQuery={setMessageQuery}
            onlyOpen={onlyOpen}
            setOnlyOpen={setOnlyOpen}
            selected={selectedMessage}
            setSelectedId={setSelectedId}
            note={messageNote}
            setNote={setMessageNote}
            saveState={saveState}
            onHandled={(handled) => selectedMessage && saveMessage(selectedMessage.id, { handled })}
            onCommit={commitMessageNote}
          />
        )}
      </main>
    </div>
  );
}

function QuoteDesk({
  items,
  quotes,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  selected,
  setSelectedId,
  draft,
  setDraft,
  saveState,
  onStatus,
  onCommit,
}) {
  return (
    <div className={`admin-split${selected ? " is-open" : ""}`}>
      <section className="admin-list" aria-label="Lista wycen">
        <label className="admin-search">
          Szukaj
          <input
            value={query}
            placeholder="Numer, imię albo telefon"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="admin-filters" role="tablist" aria-label="Status">
          <button
            type="button"
            className={statusFilter === "all" ? "is-on" : ""}
            onClick={() => setStatusFilter("all")}
          >
            Wszystkie
            <span>{quotes.length}</span>
          </button>
          {STATUSES.map((status) => (
            <button
              key={status.id}
              type="button"
              className={statusFilter === status.id ? "is-on" : ""}
              onClick={() => setStatusFilter(status.id)}
            >
              {status.label}
              <span>{quotes.filter((item) => item.status === status.id).length}</span>
            </button>
          ))}
        </div>
        {items.length === 0 ? (
          <p className="admin-empty">
            {quotes.length === 0
              ? "Nie ma jeszcze wycen. Zapis z kalkulatora wpadnie tutaj razem z grafiką mebla."
              : "Nic nie pasuje do tego filtra."}
          </p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`admin-row${item.id === selected?.id ? " is-on" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  {item.preview || item.photo ? (
                    <img src={(item.preview || item.photo).url} alt="" />
                  ) : (
                    <span className="admin-ph">Bez grafiki</span>
                  )}
                  <span>
                    <strong>{item.clientName || item.id}</strong>
                    <span className="admin-row-meta">
                      {item.clientName ? `${item.id} · ` : ""}
                      {item.productName}
                    </span>
                    <span className="admin-row-meta">{when(item.createdAt)}</span>
                  </span>
                  <span className="admin-row-end">
                    <span className={`admin-chip status-${item.status}`}>{statusLabel(item.status)}</span>
                    <span className="admin-row-price">{formatZl(item.price.total)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {selected && (
        <article className="admin-detail">
          <button type="button" className="admin-back" onClick={() => setSelectedId("")}>
            Wróć do listy
          </button>
          <div className="admin-detail-top">
            {selected.preview || selected.photo ? (
              <div className="admin-shots">
                <a href={(selected.preview || selected.photo).url} target="_blank" rel="noreferrer">
                  <img
                    src={(selected.preview || selected.photo).url}
                    alt={selected.preview ? "Grafika mebla z tej wyceny" : "Zdjęcie do tej wyceny"}
                  />
                </a>
                {selected.preview && selected.photo && (
                  <a href={selected.photo.url} target="_blank" rel="noreferrer">
                    Zdjęcie ściany
                  </a>
                )}
              </div>
            ) : (
              <p className="admin-ph big">Brak grafiki mebla</p>
            )}
            <div>
              <p className="admin-kicker light">{selected.productName}</p>
              <h2>{selected.id}</h2>
              <p className="admin-size">{selected.summary.split(" · ")[0]}</p>
              <p className="admin-amount">{formatZl(selected.price.total)}</p>
              <p className="admin-summary">{selected.summary}</p>
              <p className="admin-when">Zapisano {when(selected.createdAt)}</p>
            </div>
          </div>
          <div className="admin-status" role="group" aria-label="Status mebla">
            {STATUSES.map((status) => (
              <button
                key={status.id}
                type="button"
                className={`status-${status.id}${selected.status === status.id ? " is-on" : ""}`}
                aria-pressed={selected.status === status.id}
                onClick={() => onStatus(status.id)}
              >
                {status.label}
              </button>
            ))}
          </div>
          <form
            className="admin-client"
            onSubmit={(event) => {
              event.preventDefault();
              onCommit();
            }}
          >
            <label>
              Imię klienta
              <input
                value={draft.clientName}
                maxLength={80}
                onChange={(event) => setDraft({ ...draft, clientName: event.target.value })}
                onBlur={onCommit}
              />
            </label>
            <label>
              Telefon
              <input
                value={draft.clientPhone}
                inputMode="tel"
                maxLength={40}
                onChange={(event) => setDraft({ ...draft, clientPhone: event.target.value })}
                onBlur={onCommit}
              />
            </label>
            <label className="admin-note">
              Notatka warsztatu
              <textarea
                rows={5}
                maxLength={2000}
                value={draft.note}
                placeholder="Ustalenia z rozmowy, termin, kolor, odbiór…"
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                onBlur={onCommit}
              />
            </label>
            <div className="admin-savebar">
              <button type="submit">Zapisz dane</button>
              <span>{saveState === "saving" ? "Zapisuję…" : saveState === "saved" ? "Zapisano" : ""}</span>
              {draft.clientPhone && (
                <a href={`tel:${draft.clientPhone.replace(/\s+/g, "")}`}>Zadzwoń</a>
              )}
            </div>
          </form>
          {selected.price.lines.length > 0 && (
            <ul className="admin-lines">
              {selected.price.lines.map((line) => (
                <li key={line.label}>
                  <span>
                    <strong>{line.label}</strong>
                    <span>{line.detail}</span>
                  </span>
                  <span>{formatZl(line.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="admin-caption">
            Grafika mebla zostaje w warsztacie. Na stronę realizacji nie idzie sama.
          </p>
        </article>
      )}
    </div>
  );
}

function MessageDesk({
  items,
  query,
  setQuery,
  onlyOpen,
  setOnlyOpen,
  selected,
  setSelectedId,
  note,
  setNote,
  saveState,
  onHandled,
  onCommit,
}) {
  return (
    <div className={`admin-split${selected ? " is-open" : ""}`}>
      <section className="admin-list" aria-label="Lista wiadomości">
        <label className="admin-search">
          Szukaj
          <input
            value={query}
            placeholder="Imię, mail, telefon albo treść"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="admin-filters">
          <button type="button" className={!onlyOpen ? "is-on" : ""} onClick={() => setOnlyOpen(false)}>
            Wszystkie
          </button>
          <button type="button" className={onlyOpen ? "is-on" : ""} onClick={() => setOnlyOpen(true)}>
            Nieogarnięte
          </button>
        </div>
        {items.length === 0 ? (
          <p className="admin-empty">
            {onlyOpen || query
              ? "Nic nie pasuje do tego filtra."
              : "Nie ma jeszcze wiadomości z formularza."}
          </p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`admin-row message${item.id === selected?.id ? " is-on" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={`admin-dot${item.handled ? " is-done" : ""}`} aria-hidden="true" />
                  <span>
                    <strong>{item.name || "Bez imienia"}</strong>
                    <span className="admin-row-meta">{item.message}</span>
                    <span className="admin-row-meta">{when(item.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {selected && (
        <article className="admin-detail">
          <button type="button" className="admin-back" onClick={() => setSelectedId("")}>
            Wróć do listy
          </button>
          <p className="admin-kicker light">{selected.id}</p>
          <h2>{selected.name || "Bez imienia"}</h2>
          <p className="admin-when">{when(selected.createdAt)}</p>
          <p className="admin-letter">{selected.message}</p>
          <div className="admin-contacts">
            {selected.phone && <a href={`tel:${selected.phone.replace(/\s+/g, "")}`}>{selected.phone}</a>}
            {selected.email && <a href={`mailto:${selected.email}`}>{selected.email}</a>}
          </div>
          <div className="admin-status">
            <button
              type="button"
              className={!selected.handled ? "is-on status-nowa" : ""}
              aria-pressed={!selected.handled}
              onClick={() => onHandled(false)}
            >
              Do odpowiedzi
            </button>
            <button
              type="button"
              className={selected.handled ? "is-on status-odebrana" : ""}
              aria-pressed={selected.handled}
              onClick={() => onHandled(true)}
            >
              Ogarnięta
            </button>
          </div>
          <form
            className="admin-client"
            onSubmit={(event) => {
              event.preventDefault();
              onCommit();
            }}
          >
            <label className="admin-note">
              Notatka warsztatu
              <textarea
                rows={4}
                maxLength={2000}
                value={note}
                placeholder="Co ustaliliśmy i czy oddzwonić"
                onChange={(event) => setNote(event.target.value)}
                onBlur={onCommit}
              />
            </label>
            <div className="admin-savebar">
              <button type="submit">Zapisz notatkę</button>
              <span>{saveState === "saving" ? "Zapisuję…" : saveState === "saved" ? "Zapisano" : ""}</span>
            </div>
          </form>
        </article>
      )}
    </div>
  );
}
