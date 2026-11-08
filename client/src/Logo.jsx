export function Logo({ tone = "ink" }) {
  const steel = tone === "light" ? "#f7f3ec" : "#1b1714";
  const wood = "#ef8a32";

  return (
    <span className="logo">
      <svg className="logo-mark" viewBox="0 0 36 36" aria-hidden="true">
        <path fill={wood} d="M4.5 5.5h27v5.2h-27z" />
        <path fill={steel} d="M7 11.4h3.4V27H7zM25.6 11.4H29V27h-3.4zM7 23.6h22V27H7z" />
        <path fill={steel} d="M9.2 27.6h2.6V32H9.2zM24.2 27.6H26.8V32h-2.6z" />
      </svg>
      <span className="logo-word">Stilowo</span>
    </span>
  );
}
