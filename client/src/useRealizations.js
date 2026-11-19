import { useEffect, useState } from "react";
import { publishedRealizations } from "./api.js";
import { realizations } from "./site.js";

const fallback = realizations.map((item) => ({
  id: item.title,
  title: item.title,
  kicker: item.meta,
  summary: item.text,
  body: item.text,
  priceLabel: item.price,
  image: item.image,
  alt: item.title,
  calculatorPath: "/kalkulator/stojak-na-drewno",
  published: true,
}));

export function useRealizations() {
  const [items, setItems] = useState(fallback);

  useEffect(() => {
    let live = true;
    publishedRealizations()
      .then((data) => {
        if (live && Array.isArray(data.items)) setItems(data.items);
      })
      .catch(() => {
        if (live) setItems(fallback);
      });
    return () => {
      live = false;
    };
  }, []);

  return items;
}
