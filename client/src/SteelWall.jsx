const OPTIONS = [
  { value: 1.5, label: "1,5 mm" },
  { value: 2, label: "2 mm" },
  { value: 3, label: "3 mm" },
];

export function SteelWall({ value, onChange }) {
  return (
    <fieldset className="steel-wall">
      <legend>Grubość stali</legend>
      <p className="hint">ścianka profilu, wchodzi w cenę metra</p>
      <div className="paint-row">
        {OPTIONS.map((item) => {
          const selected = item.value === value;
          return (
            <button
              key={item.label}
              type="button"
              className={selected ? "paint-chip is-selected" : "paint-chip"}
              aria-pressed={selected}
              onClick={() => onChange(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
