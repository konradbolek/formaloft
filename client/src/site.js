export const company = {
  name: "Stilowo",
  phone: "535 947 696",
  phoneHref: "tel:+48535947696",
  tagline: "Drewno w dobrym stylu",
  street: "ul. Grodzisko 10",
  place: "Pogorzyce 32-500",
  mapLat: 50.0960405,
  mapLon: 19.425334,
};

export const nav = [
  { label: "Start", to: "/" },
  { label: "Firma", to: "/firma" },
  { label: "Realizacje", to: "/realizacje" },
  { label: "Opinie", to: "/opinie" },
  { label: "Kalkulatory", to: "/kalkulatory" },
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

export const opinions = [
  {
    quote: "Czarna rama, drewniany blat i polana widoczne od frontu. Tak ma stać przy kominku.",
    name: "Stilowo",
    detail: "Stojak ze zdjęcia",
    home: true,
  },
  {
    quote: "Wymiar bierzemy ze ściany. To, co ustawisz w kalkulatorze, jest tym, co później spawamy.",
    name: "Stilowo",
    detail: "Na wymiar",
    home: true,
  },
  {
    quote: "Stal malowana proszkowo, blat z litego drewna. Kolor ramy nie zmienia ceny.",
    name: "Stilowo",
    detail: "Materiał",
    home: true,
  },
  {
    quote: "Nogi podnoszą polana od podłogi. Do ceny nic nie dokładają.",
    name: "Stilowo",
    detail: "Nogi",
  },
  {
    quote: "Zdjęcie ściany zostaje przy wycenie. Kolor ściany oglądasz tylko w podglądzie.",
    name: "Stilowo",
    detail: "Ściana",
  },
  {
    quote: "Półka pod telewizor i regał liczą tę samą stal i to samo drewno co stojak.",
    name: "Stilowo",
    detail: "Jedna stawka",
  },
  {
    quote: "Układ regału jest ze zdjęcia. Zmieniasz wymiar, nie liczbę półek.",
    name: "Stilowo",
    detail: "Regał",
  },
  {
    quote: "Warsztat jest przy ul. Grodzisko 10 w Pogorzycach. Wizytę umawiamy telefonicznie.",
    name: "Stilowo",
    detail: "Pogorzyce",
  },
];

export const calculators = [
  {
    id: "stojak",
    short: "Stojak",
    title: "Stojak na drewno",
    text: "Otwarta rama przy kominku. Polana w środku, blat na górze.",
    size: "140 × 45 × 30 cm",
    price: "699 zł",
    image: "/realizacja.jpg",
    visual: false,
    to: "/kalkulator/stojak-na-drewno",
    ready: true,
  },
  {
    id: "polka",
    short: "Półka",
    title: "Półka pod telewizor",
    text: "Niski mebel z półkami i segmentami. Ta sama stal i to samo drewno.",
    size: "50 × 180 × 40 cm",
    price: "2 123 zł",
    image: "/wizualizacja-polka.jpg",
    visual: true,
    to: "/kalkulator/polka-pod-telewizor",
    ready: true,
  },
  {
    id: "regal",
    short: "Regał",
    title: "Regał asymetryczny",
    text: "Układ półek jest ze zdjęcia. Zmieniasz wymiar, nie liczbę półek.",
    size: "180 × 96 × 28 cm",
    price: "1 513 zł",
    image: "/wizualizacja-regal.jpg",
    visual: true,
    to: "/kalkulator/regal",
    ready: true,
  },
];
