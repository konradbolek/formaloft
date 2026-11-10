import { Link, NavLink } from "react-router-dom";
import { REGAL_LAYOUT } from "../../shared/regalLayout.js";
import { calculators } from "./site.js";

function StandMark() {
  return (
    <svg className="piece-mark" viewBox="0 0 64 96" aria-hidden="true">
      <rect className="wood" x="8" y="8" width="48" height="7" />
      <rect className="steel" x="12" y="15" width="5" height="58" />
      <rect className="steel" x="47" y="15" width="5" height="58" />
      <rect className="steel" x="12" y="66" width="40" height="5" />
      <rect className="steel" x="16" y="73" width="4" height="10" />
      <rect className="steel" x="44" y="73" width="4" height="10" />
      <circle className="log" cx="27" cy="46" r="6.5" />
      <circle className="log deep" cx="39" cy="49" r="6" />
      <circle className="log" cx="33" cy="35" r="5.5" />
    </svg>
  );
}

function ShelfMark() {
  return (
    <svg className="piece-mark" viewBox="0 0 128 64" aria-hidden="true">
      <rect className="wood" x="8" y="8" width="112" height="7" />
      <rect className="steel" x="10" y="15" width="4" height="32" />
      <rect className="steel" x="114" y="15" width="4" height="32" />
      <rect className="steel" x="62" y="15" width="4" height="32" />
      <rect className="wood" x="10" y="30" width="108" height="4" />
      <rect className="steel" x="10" y="43" width="108" height="4" />
      <rect className="steel" x="16" y="47" width="3.5" height="8" />
      <rect className="steel" x="108.5" y="47" width="3.5" height="8" />
    </svg>
  );
}

function BookcaseMark() {
  const left = 12;
  const top = 8;
  const width = 46;
  const height = 92;
  return (
    <svg className="piece-mark" viewBox="0 0 70 112" aria-hidden="true">
      <rect className="steel" x="6" y="4" width="4" height="104" />
      <rect className="steel" x="60" y="4" width="4" height="104" />
      <rect className="steel" x="6" y="4" width="58" height="4" />
      <rect className="steel" x="6" y="104" width="58" height="4" />
      {REGAL_LAYOUT.shelves.map((shelf) => (
        <rect
          key={`${shelf.x0}-${shelf.y}`}
          className="wood"
          x={left + shelf.x0 * width}
          y={top + (1 - shelf.y) * height}
          width={(shelf.x1 - shelf.x0) * width}
          height="3.2"
        />
      ))}
      {REGAL_LAYOUT.verticals.map((line) => {
        const y = top + (1 - line.y1) * height;
        const bottom = top + (1 - line.y0) * height;
        return (
          <rect
            key={`${line.x}-${line.y0}`}
            className="steel"
            x={left + line.x * width - 1.2}
            y={y}
            width="2.4"
            height={bottom - y}
          />
        );
      })}
    </svg>
  );
}

function RailMark() {
  return (
    <svg className="piece-mark" viewBox="0 0 96 64" aria-hidden="true">
      <rect className="steel" x="6" y="16" width="4" height="38" />
      <rect className="steel" x="46" y="16" width="4" height="38" />
      <rect className="steel" x="86" y="16" width="4" height="38" />
      <rect className="steel" x="6" y="14" width="84" height="4" />
      <rect className="steel" x="6" y="46" width="84" height="3" />
      <rect className="steel" x="18" y="22" width="2" height="22" />
      <rect className="steel" x="28" y="22" width="2" height="22" />
      <rect className="steel" x="58" y="22" width="2" height="22" />
      <rect className="steel" x="68" y="22" width="2" height="22" />
    </svg>
  );
}

function PieceMark({ id }) {
  if (id === "polka") return <ShelfMark />;
  if (id === "regal") return <BookcaseMark />;
  if (id === "barierka") return <RailMark />;
  return <StandMark />;
}

export function PieceCards() {
  return (
    <ul className="piece-list">
      {calculators.map((item) => (
        <li key={item.id}>
          <Link className="piece-card" to={item.to}>
            <span className="piece-stage">
              <img src={item.image} alt="" />
              <span className="piece-badge">{item.visual ? "Wizualizacja" : "Zdjęcie"}</span>
            </span>
            <span className="piece-name">{item.title}</span>
            <span className="piece-text">{item.text}</span>
            <span className="piece-meta">
              <span>{item.size}</span>
              <strong>{item.price}</strong>
            </span>
            <span className="piece-note">
              {item.visual ? "Wizualizacja modelu" : "Zdjęcie z realizacji"}
            </span>
            <span className="piece-go">Licz ten wymiar</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PiecePicker() {
  return (
    <section className="home-section piece-picker" id="meble">
      <div className="section-head">
        <p className="section-kicker">Meble</p>
        <h2>Wybierz kalkulator</h2>
      </div>
      <p className="section-copy">
        Cztery kalkulatory. Stojak jest ze zdjęcia realizacji. Półka, regał i barierka
        to wizualizacje modelu, nie zamówienia. Cena na karcie dotyczy wymiaru pod
        rysunkiem. Barierka ma stawkę startową.
      </p>
      <PieceCards />
    </section>
  );
}

export function PieceSwitch() {
  return (
    <nav className="piece-switch" aria-label="Wybór mebla">
      {calculators.map((item) => (
        <NavLink
          key={item.id}
          to={item.to}
          end
          className={({ isActive }) => (isActive ? "is-on" : undefined)}
        >
          <PieceMark id={item.id} />
          <span>{item.short}</span>
        </NavLink>
      ))}
    </nav>
  );
}
