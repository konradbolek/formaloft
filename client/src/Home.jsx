import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Embers } from "./Embers.jsx";
import { Reveal } from "./Reveal.jsx";
import { Ribbon } from "./Ribbon.jsx";
import { PiecePicker } from "./Pieces.jsx";
import { atmosphere, company, facts, opinions, realizations } from "./site.js";

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

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      play();
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
          play();
          observer.disconnect();
        }
      },
      { threshold: 0 },
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
  return (
    <div className="page home">
      <section className="home-hero">
        <Embers />
        <div className="hero-copy">
          <p className="hero-stamp">Ręcznie</p>
          <p className="section-kicker">{company.name}</p>
          <h1>
            {company.tagline.replace(/\s+\S+$/, "")} <span>{company.tagline.split(" ").at(-1)}</span>
          </h1>
          <p className="lede">
            Stojak, półka pod telewizor albo regał. Stal i lite drewno, spawane
            ręcznie w wymiarze ściany. Cenę widzisz, zanim cokolwiek powstanie.
          </p>
          <div className="hero-actions">
            <Link className="submit hero-submit" to="/#meble">
              Wybierz mebel
            </Link>
            <Link className="ghost" to="/realizacje">
              Realizacje
            </Link>
          </div>
        </div>
      </section>

      <Ribbon />

      <PiecePicker />

      <section className="home-section" id="firma">
        <Reveal>
          <div className="section-head">
            <p className="section-kicker">Firma</p>
            <h2>Stal, drewno i wymiar Twojej ściany</h2>
          </div>
          <p className="section-copy">
            {company.name} składa meble, które mają stać przy kominku i dobrze wyglądać
            na co dzień. Rama jest ze stali, blat z litego drewna. Wysokość,
            szerokość i głębokość ustala się pod konkretne miejsce, nie pod jeden
            wzór z katalogu.
          </p>
          <Link className="more-link" to="/firma">
            Więcej o firmie
          </Link>
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
            <Link className="more-link" to="/realizacje">
              Więcej o realizacji
            </Link>
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

      <section className="home-section opinion-band" id="opinie">
        <div className="opinion-inner">
          <Reveal>
            <div className="section-head">
              <p className="section-kicker">Opinie</p>
              <h2>Głos warsztatu</h2>
            </div>
            <p className="section-copy">
              Cytaty klientów dopiszemy z prawdziwych odbiorów. Na razie mówi {company.name}.
            </p>
            <Link className="more-link" to="/opinie">
              Więcej z warsztatu
            </Link>
          </Reveal>
          <ul className="opinion-list">
            {opinions.filter((item) => item.home).map((item, index) => (
              <Reveal as="li" key={item.detail} className="opinion-card" delay={index * 90}>
                <blockquote>
                  <p>{item.quote}</p>
                  <footer>
                    <strong>{item.name}</strong>
                    <span>{item.detail}</span>
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="home-section" id="kalkulatory">
        <Reveal>
          <div className="section-head">
            <p className="section-kicker">Jak liczymy</p>
            <h2>Od ściany do ceny</h2>
          </div>
          <p className="section-copy">
            Kolor ramy i wysokość nóg nie zmieniają ceny. Zdjęcie ściany możesz dołożyć, ale do
            wyceny i tak zapisuje się grafika mebla.
          </p>
          <Link className="more-link" to="/kalkulatory">
            Jak liczymy
          </Link>
        </Reveal>
        <ol className="path-list">
          <li>
            <span>01</span>
            <h3>Wybierz mebel</h3>
            <p>Stojak, półka albo regał. Każdy ma własny kalkulator.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Ustaw wymiar</h3>
            <p>Suwak rusza podgląd. Suma liczy się od stali, drewna i robocizny.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Zapisz wycenę</h3>
            <p>Zostaje numer, cena i grafika. Warsztat widzi to u siebie.</p>
          </li>
        </ol>
      </section>
    </div>
  );
}
