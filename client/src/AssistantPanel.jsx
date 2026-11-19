import { useState } from "react";
import { askWorkshop } from "./api.js";

const EXAMPLES = ["Ile wycen jest w produkcji?", "Jaka jest stawka dębu przy ściance 2 mm?"];

export function AssistantPanel({ onOpen }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [quoteIds, setQuoteIds] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await askWorkshop(text);
      setAnswer(data.answer || "");
      setQuoteIds(Array.isArray(data.quoteIds) ? data.quoteIds : []);
    } catch (err) {
      setAnswer("");
      setQuoteIds([]);
      setError(err.message || "Nie udało się zapytać asystenta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="assistant" onSubmit={submit}>
      <p className="admin-when">
        Asystent czyta kolejkę i cennik. Nie dopisuje klientów ani cen, których tam nie ma.
        Klucz zostaje w pliku warsztatu jako OPENAI_API_KEY.
      </p>
      <label>
        Pytanie
        <textarea
          rows={4}
          maxLength={800}
          value={question}
          placeholder="Na przykład: które wyceny są nowe?"
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>
      <div className="assistant-examples">
        {EXAMPLES.map((item) => (
          <button key={item} type="button" onClick={() => setQuestion(item)}>
            {item}
          </button>
        ))}
      </div>
      {error && <p className="admin-error">{error}</p>}
      {answer && (
        <div className="assistant-answer">
          <p>{answer}</p>
          {quoteIds.length > 0 && (
            <div className="assistant-links">
              {quoteIds.map((id) => (
                <button key={id} type="button" onClick={() => onOpen(id)}>
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="admin-savebar">
        <button type="submit" disabled={busy || !question.trim()}>
          {busy ? "Pytam…" : "Zapytaj"}
        </button>
      </div>
    </form>
  );
}
