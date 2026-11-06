import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Embers } from "./Embers.jsx";
import { atmosphere, calculators, company, facts, realizations } from "./site.js";

const ribbon = ["Stal", "Dąb", "Jesion", "Orzech", "Buk", "Sosna", "Na wymiar", "Ręcznie"];

function Reveal({ as: Tag = "div", className = "", delay = 0, children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal${shown ? " is-in" : ""} ${className}`.trim()}
      style={{ "--delay": `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

function Price({ value }) {
  const amount = Number.parseInt(value, 10);
  const suffix = value.replace(/^\d+\s*/, "");
  const ref = useRef(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || !Number.isFinite(amount)) return undefined;
    let frame = 0;
    let start = 0;

    const play = () => {
      const step = (now) => {
        if (!start) start = now;
        const progress = Math.min((now - start) / 900, 1);
        const eased = 1 - (1 - progress) ** 3;
        setShown(Math.round(amount * eased));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(amount);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [amount]);

  return (
    <p ref={ref} className="realization-price" aria-label={value}>
      {shown.toLocaleString("pl-PL")} {suffix}
    </p>
  );
}

export function Home() {
  const loop = [...ribbon, ...ribbon];

  return (
    <div className="page home">
      <section className="home-hero">
        <Embers />
        <div className="hero-copy">
          <p className="section-kicker">{company.name}</p>
          <h1>{company.tagline}</h1>
          <p className="lede">
            Robimy loftowe stojaki na drewno: czarna stal, drewniany blat i porządek
            przy kominku. Każdy egzemplarz spawamy ręcznie, w wymiarze ściany.
          </p>
          <div className="hero-actions">
            <Link className="submit hero-submit" to="/#kalkulatory">
              Kalkulatory
            </Link>
            <Link className="ghost" to="/#realizacje">
              Realizacje
            </Link>
          </div>
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {loop.map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <section className="home-section" id="firma">
        <Reveal>
          <div className="section-head">
            <p className="section-kicker">Firma</p>
            <h2>Stal, drewno i wymiar Twojej ściany</h2>
          </div>
          <p className="section-copy">
            Forma Loft składa meble, które mają stać przy kominku i dobrze wyglądać
            na co dzień. Rama jest ze stali, blat z litego drewna. Wysokość,
            szerokość i głębokość ustala się pod konkretne miejsce, nie pod jeden
            wzór z katalogu.
          </p>
        </Reveal>
        <ul className="fact-list">
          {facts.map((fact, index) => (
            <Reveal as="li" key={fact.title} delay={index * 90}>
              <span className="fact-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{fact.title}</h3>
              <p>{fact.text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="home-section" aria-label="Zdjęcia poglądowe">
        <Reveal>
          <div className="section-head">
            <p className="section-kicker">Materiał</p>
            <h2>Stal, ogień i drewno</h2>
          </div>
          <p className="section-copy">
            Zdjęcia poglądowe. Pokazują piec, spawanie i salon z kominkiem, nie
            konkretne zamówienia.
          </p>
        </Reveal>
        <ul className="atmosphere">
          {atmosphere.map((item, index) => (
            <Reveal as="li" key={item.src} delay={index * 80}>
              <figure>
                <img src={item.src} alt={item.alt} />
                <figcaption>{item.caption}</figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="home-section" id="realizacje">
        <Reveal>
          <div className="section-head">
            <p className="section-kicker">Realizacje</p>
            <h2>Stojak przy schodach</h2>
          </div>
        </Reveal>
        <ul className="realization-list">
          {realizations.map((item) => (
            <Reveal as="li" key={item.title} className="realization">
              <div className="realization-photo">
                <img src={item.image} alt={item.title} />
              </div>
              <div>
                <p className="section-kicker">{item.meta}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <Price value={item.price} />
                <Link to="/kalkulator/stojak-na-drewno">Policz swój wymiar</Link>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="home-section" id="kalkulatory">
        <Reveal>
          <div className="section-head">
            <p className="section-kicker">Kalkulatory</p>
            <h2>Policz zanim zamówisz</h2>
          </div>
        </Reveal>
        <ul className="calc-list">
          {calculators.map((item, index) => (
            <li key={item.title}>
              <Reveal as="article" className="calc-card" delay={index * 80}>
                <p className="section-kicker">{item.ready ? "Dostępny" : "W przygotowaniu"}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                {item.ready ? (
                  <Link className="submit calc-open" to={item.to}>
                    Otwórz kalkulator
                  </Link>
                ) : null}
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
