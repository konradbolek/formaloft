import { useEffect, useState } from "react";
import { formatCm, roundToStep } from "./format.js";

export function Measure({ label, hint, min, max, step, value, onChange }) {
  const [draft, setDraft] = useState(formatCm(value));

  useEffect(() => {
    setDraft(formatCm(value));
  }, [value]);

  const span = max - min || 1;
  const percent = ((value - min) / span) * 100;
  const fieldId = label
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  function commit(raw) {
    const parsed = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setDraft(formatCm(value));
      return;
    }
    const next = Math.min(max, Math.max(min, roundToStep(parsed, step)));
    onChange(next);
    setDraft(formatCm(next));
  }

  return (
    <div className="measure">
      <div className="measure-top">
        <label htmlFor={fieldId}>{label}</label>
        <div className="measure-value">
          <input
            id={fieldId}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={draft}
            aria-describedby={`${fieldId}-hint`}
            onChange={(event) => {
              const raw = event.target.value;
              setDraft(raw);
              const parsed = Number(raw.replace(",", "."));
              if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
                onChange(roundToStep(parsed, step));
              }
            }}
            onBlur={(event) => commit(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit(event.currentTarget.value);
              }
            }}
          />
          <span>cm</span>
        </div>
      </div>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ "--p": `${percent}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="measure-scale" id={`${fieldId}-hint`}>
        <span>
          {formatCm(min)} cm{hint ? ` · ${hint}` : ""}
        </span>
        <span>{formatCm(max)} cm</span>
      </div>
    </div>
  );
}
