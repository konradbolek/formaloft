import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal.jsx";
import { StoryHero } from "./StoryHero.jsx";
import { PieceCards } from "./Pieces.jsx";
import { company, opinions } from "./site.js";

function usePageTitle(title) {
  useEffect(() => {
    document.title = title;
    return () => {
      document.title = `${company.name} — wycena stojaka`;
    };
  }, [title]);
}

export function CompanyPage() {
  usePageTitle(`${company.name} — firma`);

  return (
    <div className="page story">
      <StoryHero
        kicker="Firma"
        title="Stal, drewno i konkretna ściana"
        lede={`${company.name} spawa loftowe meble na wymiar miejsca, w którym mają stać. Rama jest ze stali malowanej proszkowo, blaty i półki z litego drewna. Cenę liczysz w kalkulatorze, zanim cokolwiek powstanie.`}
      />

      <section className="story-block">
        <h2>Jak powstaje mebel</h2>
        <ol className="story-grid steps">
          <Reveal as="li" delay={0}>
            <span className="fact-index">01</span>
            <h3>Wybór</h3>
            <p>Stojak na drewno, półka pod telewizor albo regał asymetryczny. Każdy ma własny kalkulator.</p>
          </Reveal>
          <Reveal as="li" delay={80}>
            <span className="fact-index">02</span>
            <h3>Ściana</h3>
            <p>
              Zdjęcie miejsca jest dobrowolne. Bez niego podgląd używa koloru ściany. Do wyceny i tak
              zapisuje się grafika mebla.
            </p>
          </Reveal>
          <Reveal as="li" delay={160}>
            <span className="fact-index">03</span>
            <h3>Wymiar</h3>
            <p>
              Wysokość, szerokość, głębokość, grubość ramy i drewna skaczą co centymetr. Nogi podnosisz
              od podłogi. Kolor stali wybierasz z pięciu lakierów.
            </p>
          </Reveal>
          <Reveal as="li" delay={240}>
            <span className="fact-index">04</span>
            <h3>Cena</h3>
            <p>
              Suma stali, drewna, olejowania i robocizny. Na ekranie zostaje jedna kwota. Potem dzwonisz
              albo zostawiasz wiadomość.
            </p>
          </Reveal>
        </ol>
      </section>

      <section className="story-block">
        <p className="section-kicker">Meble</p>
        <h2>Trzy rzeczy, które liczymy</h2>
        <p className="lede">
          Stojak jest ze zdjęcia realizacji. Półka i regał to wizualizacje modelu: pokazują stal i
          drewno, nie stoją u klienta.
        </p>
        <PieceCards />
      </section>

      <section className="story-block">
        <h2>Z czego składamy</h2>
        <div className="story-grid">
          <Reveal as="article" className="story-card">
            <h3>Stal</h3>
            <p>
              Rama ze spawanych profili, malowana proszkowo. Grubość 2, 3 albo 4 cm. Kolory: czerń,
              antracyt, biel, zieleń i brąz. Czerń jest kolorem stojaka ze zdjęcia. Lakier nie zmienia
              ceny.
            </p>
          </Reveal>
          <Reveal as="article" className="story-card" delay={90}>
            <h3>Drewno</h3>
            <p>
              Lite: sosna, buk, jesion, dąb albo orzech. Grubość od 1 do 4 cm. Drewno olejujemy. Gatunek
              i grubość wchodzą w cenę, bo zmienia się ilość materiału.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="story-block">
        <h2>Czego cena nie liczy</h2>
        <p className="lede">
          Wysokość nóg nie zmienia kwoty. Kolor stali też nie. Kolor ściany w podglądzie jest tylko do
          obejrzenia mebla i nie jedzie z wyceną.
        </p>
        <p className="lede">
          Model stojaka ze zdjęcia, w wymiarze kalkulatora, wychodzi 699 zł. Inny wymiar daje inną sumę.
        </p>
      </section>

      <section className="story-block story-end">
        <h2>Warsztat</h2>
        <p className="lede">
          Warsztat: {company.street}, {company.place}. Wizytę umawiamy telefonicznie. Wiadomość z
          formularza zostaje u nas, oddzwaniamy albo odpisujemy.
        </p>
        <div className="story-actions">
          <a className="submit hero-submit" href={company.phoneHref}>
            {company.phone}
          </a>
          <Link className="ghost" to="/kontakt">
            Napisz wiadomość
          </Link>
          <Link className="ghost" to="/kalkulatory">
            Kalkulatory
          </Link>
        </div>
      </section>
    </div>
  );
}

export function RealizationsPage() {
  usePageTitle(`${company.name} — realizacje`);

  return (
    <div className="page story">
      <StoryHero
        kicker="Realizacje"
        title="Jedna robota, którą pokazujemy"
        lede="Na stronie jest jedno zdjęcie gotowego mebla. Półka pod telewizor i regał są modelami w kalkulatorze, nie zamówieniami klientów."
      />

      <section className="story-block">
        <Reveal as="article" className="realization">
          <div className="realization-photo">
            <img src="/realizacja.jpg" alt="Czarny stojak na drewno przy schodach, z dębowym blatem i polanami w środku" />
          </div>
          <div>
            <p className="section-kicker">Stal i drewno</p>
            <h2>Stojak na drewno przy schodach</h2>
            <p>
              Czarna rama, dębowy blat i polana ułożone w środku. Stoi przy schodach, na jasnej
              drewnianej podłodze, obok szarej ściany i wnęki. Na zdjęciu widać krótkie nogi.
            </p>
            <p>
              W kalkulatorze ten model to 140 × 45 × 30 cm, rama 3 cm, blat dąb 2 cm, malowanie czerń.
              Cena modelu ze zdjęcia: 699 zł. Wysokość nóg ustawiasz osobno i nie zmienia tej kwoty.
              Po otwarciu kalkulator startuje z nogami 10 cm. Przycisk „Model ze zdjęcia” ustawia 0 cm,
              czyli wersję, od której liczymy 699 zł.
            </p>
            <p className="realization-price">699 zł</p>
            <Link to="/kalkulator/stojak-na-drewno">Policz swój wymiar</Link>
          </div>
        </Reveal>
      </section>

      <section className="story-block">
        <p className="section-kicker">To nie są realizacje</p>
        <h2>Modele w kalkulatorze</h2>
        <p className="lede">
          Te zdjęcia pokazują meble, które można policzyć. Nie stoją u klienta i nie dopisujemy do nich
          adresu ani nazwiska.
        </p>
        <ul className="model-list">
          <Reveal as="li">
            <img src="/wizualizacja-polka.jpg" alt="Wizualizacja półki pod telewizor: czarna stal i dębowe półki, dwa segmenty" />
            <div>
              <h3>Półka pod telewizor</h3>
              <p>
                Wizualizacja, nie zdjęcie z odbioru. Model: 50 × 180 × 40 cm, 3 półki, 2 segmenty, rama
                2 cm, dąb 2 cm. <span className="keep">2 123 zł.</span>
              </p>
              <Link to="/kalkulator/polka-pod-telewizor">Otwórz kalkulator</Link>
            </div>
          </Reveal>
          <Reveal as="li" delay={90}>
            <img src="/wizualizacja-regal.jpg" alt="Wizualizacja regału asymetrycznego: czarna rama i jasne półki" />
            <div>
              <h3>Regał asymetryczny</h3>
              <p>
                Wizualizacja, nie zdjęcie z odbioru. Model: 180 × 96 × 28 cm, rama 2 cm, sosna 2 cm.
                Układ półek w kalkulatorze jest stały. <span className="keep">1 513 zł.</span>
              </p>
              <Link to="/kalkulator/regal">Otwórz kalkulator</Link>
            </div>
          </Reveal>
        </ul>
      </section>
    </div>
  );
}

function Spec({ label, value }) {
  return (
    <li>
      <span>{label}</span>
      <strong>{value}</strong>
    </li>
  );
}

export function CalculatorsPage() {
  usePageTitle(`${company.name} — kalkulatory`);

  return (
    <div className="page story">
      <StoryHero
        kicker="Kalkulatory"
        title="Policz mebel, zanim powstanie"
        lede="Trzy kalkulatory liczą tę samą stawkę stali, drewna, olejowania i robocizny. Na ekranie widać tylko sumę. Zdjęcie ściany nie jest wymagane — do wyceny zapisuje się grafika mebla."
      />

      <section className="story-block">
        <h2>Wspólne zasady</h2>
        <ul className="story-grid plain">
          {[
            "Grubość ramy i drewna skacze co 1 cm.",
            "Kolor stali i wysokość nóg nie zmieniają ceny.",
            "Kolor ściany jest tylko w podglądzie. Zdjęcie ściany możesz dołożyć, ale nie musisz.",
            "Podgląd obracasz i przybliżasz. Kamera zostaje w pokoju.",
          ].map((line, index) => (
            <Reveal as="li" key={line} delay={index * 70}>
              {line}
            </Reveal>
          ))}
        </ul>
      </section>

      <Reveal as="section" className="story-block tool">
        <figure className="tool-figure">
          <img className="tool-photo" src="/realizacja.jpg" alt="Stojak na drewno przy schodach, zdjęcie realizacji" />
          <figcaption>Zdjęcie z realizacji. W kalkulatorze ten model kosztuje 699 zł.</figcaption>
        </figure>
        <div className="tool-copy">
          <p className="section-kicker">01</p>
          <h2>Stojak na drewno</h2>
          <p>
            Otwarta rama, blat na górze, polana w środku. Zdjęcie ściany kładzie się na trzech ścianach
            podglądu. Zamiast zdjęcia możesz wybrać kolor ściany.
          </p>
          <ul className="spec-list">
            <Spec label="Wysokość" value="100–160 cm" />
            <Spec label="Szerokość" value="30–80 cm" />
            <Spec label="Głębokość" value="20–40 cm" />
            <Spec label="Rama" value="2–4 cm" />
            <Spec label="Blat" value="1–4 cm" />
            <Spec label="Nogi" value="0–50 cm" />
          </ul>
          <p className="model-price">
            Model ze zdjęcia: 140 × 45 × 30 cm, rama 3 cm, blat dąb 2 cm, czerń. 699 zł.
          </p>
          <Link className="submit calc-open" to="/kalkulator/stojak-na-drewno">
            Otwórz kalkulator
          </Link>
        </div>
      </Reveal>

      <Reveal as="section" className="story-block tool" delay={40}>
        <figure className="tool-figure">
          <img className="tool-photo" src="/wizualizacja-polka.jpg" alt="Wizualizacja półki pod telewizor" />
          <figcaption>Wizualizacja modelu. To nie jest mebel od klienta.</figcaption>
        </figure>
        <div className="tool-copy">
          <p className="section-kicker">02</p>
          <h2>Półka pod telewizor</h2>
          <p>
            Niski mebel z drewnianymi poziomami i segmentami. Liczba półek obejmuje blat. Odstęp między
            półkami nie schodzi poniżej 8 cm.
          </p>
          <ul className="spec-list">
            <Spec label="Wysokość" value="40–70 cm" />
            <Spec label="Szerokość" value="100–240 cm" />
            <Spec label="Głębokość" value="30–50 cm" />
            <Spec label="Półki" value="2–4" />
            <Spec label="Segmenty" value="1–4" />
            <Spec label="Rama / półka" value="2–4 cm / 1–4 cm" />
            <Spec label="Nogi" value="0–20 cm" />
          </ul>
          <p className="model-price">
            Model ze zdjęcia: 50 × 180 × 40 cm, 3 półki, 2 segmenty, rama 2 cm, dąb 2 cm, nogi 10 cm.
            2 123 zł.
          </p>
          <Link className="submit calc-open" to="/kalkulator/polka-pod-telewizor">
            Otwórz kalkulator
          </Link>
        </div>
      </Reveal>

      <Reveal as="section" className="story-block tool" delay={80}>
        <figure className="tool-figure">
          <img className="tool-photo tall" src="/wizualizacja-regal.jpg" alt="Wizualizacja regału asymetrycznego" />
          <figcaption>Wizualizacja modelu. Układ półek w kalkulatorze zostaje ze wzoru.</figcaption>
        </figure>
        <div className="tool-copy">
          <p className="section-kicker">03</p>
          <h2>Regał asymetryczny</h2>
          <p>
            Układ półek jest ze zdjęcia i zostaje. Zmienia się wysokość, szerokość i głębokość, nie
            liczba półek. Nogi podnoszą wnętrze i nie zmieniają ceny. Z aktualnej grafiki można
            wygenerować zdjęcie. To nie jest zdjęcie mebla z warsztatu.
          </p>
          <ul className="spec-list">
            <Spec label="Wysokość" value="150–210 cm" />
            <Spec label="Szerokość" value="70–130 cm" />
            <Spec label="Głębokość" value="22–40 cm" />
            <Spec label="Rama" value="2–4 cm" />
            <Spec label="Półki" value="1–4 cm" />
            <Spec label="Nogi" value="0–30 cm" />
          </ul>
          <p className="model-price">
            Model ze zdjęcia: 180 × 96 × 28 cm, rama 2 cm, sosna 2 cm, czerń, nogi 0 cm. 1 513 zł.
          </p>
          <Link className="submit calc-open" to="/kalkulator/regal">
            Otwórz kalkulator
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

export function OpinionsPage() {
  usePageTitle(`${company.name} — opinie`);

  return (
    <div className="page story">
      <StoryHero
        kicker="Opinie"
        title="Głos warsztatu"
        lede={`Cytaty klientów dopiszemy z prawdziwych odbiorów. Na razie mówi ${company.name}.`}
      />
      <section className="opinion-band opinion-page">
        <ul className="opinion-list">
          {opinions.map((item, index) => (
            <Reveal as="li" key={item.detail} className="opinion-card" delay={index * 70}>
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
      </section>
      <section className="story-block">
        <p className="section-kicker">Dalej</p>
        <h2>Policz swój mebel</h2>
        <p className="lede">Cytaty wyżej są głosem warsztatu. Meble liczysz w kalkulatorze.</p>
        <PieceCards />
      </section>
    </div>
  );
}
