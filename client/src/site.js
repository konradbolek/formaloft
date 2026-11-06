export const company = {
  name: "Forma Loft",
  phone: "535 947 696",
  phoneHref: "tel:+48535947696",
  tagline: "Drewno w dobrym stylu",
};

export const nav = [
  { label: "Start", to: "/" },
  { label: "Firma", to: "/#firma" },
  { label: "Realizacje", to: "/#realizacje" },
  { label: "Kalkulatory", to: "/#kalkulatory" },
  { label: "Kontakt", to: "/kontakt" },
];

export const atmosphere = [
  {
    src: "/stock-kominek.jpg",
    alt: "Czarny piec na tle drewnianej ściany, w palenisku widać ogień",
    caption: "Piec i drewno na ścianie",
  },
  {
    src: "/stock-stal.jpg",
    alt: "Spawacz w masce, iskry przy łączeniu stali",
    caption: "Spawanie stali",
  },
  {
    src: "/stock-salon.jpg",
    alt: "Salon z kominkiem, drewnianą podłogą i czarną lampą",
    caption: "Salon, w którym staje stojak",
  },
];

export const facts = [
  {
    title: "Stalowa konstrukcja",
    text: "Rama ze spawanych profili, malowana proszkowo na czarno.",
  },
  {
    title: "Drewniany blat",
    text: "Sosna, buk, jesion, dąb albo orzech. Grubość ustawiasz w kalkulatorze.",
  },
  {
    title: "Na wymiar",
    text: "Wysokość, szerokość i głębokość dopasowane do ściany przy kominku.",
  },
];

export const realizations = [
  {
    title: "Stojak na drewno przy schodach",
    meta: "Stal i drewno",
    text: "Czarna rama, drewniany blat i polana w środku. Ten sam układ można zamówić w innym wymiarze.",
    image: "/realizacja.jpg",
    price: "699 zł",
  },
];

export const calculators = [
  {
    title: "Stojak na drewno",
    text: "Zdjęcie ściany, wymiary, grubość ramy i blat. Cena liczy się od razu.",
    to: "/kalkulator/stojak-na-drewno",
    ready: true,
  },
  {
    title: "Półka pod telewizor",
    text: "Wysokość, szerokość, głębokość, liczba półek i segmentów. Ta sama stal i drewno.",
    to: "/kalkulator/polka-pod-telewizor",
    ready: true,
  },
  {
    title: "Regał asymetryczny",
    text: "Wysoki regał ze zdjęcia. Wymiary, rama, drewno i kolor stali. Układ półek zostaje.",
    to: "/kalkulator/regal",
    ready: true,
  },
];
