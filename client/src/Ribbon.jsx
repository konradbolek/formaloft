const WORDS = ["Stal", "Dąb", "Jesion", "Orzech", "Buk", "Sosna", "Na wymiar", "Ręcznie"];

export function Ribbon() {
  const loop = [...WORDS, ...WORDS];

  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {loop.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
