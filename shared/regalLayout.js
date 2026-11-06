/**
 * Układ regału ze zdjęcia, w ułamkach wnętrza ramy.
 * x rośnie w prawo, y od dołu do góry.
 */
export const REGAL_LAYOUT = {
  shelves: [
    { x0: 0, x1: 1, y: 0.045 },
    { x0: 0.34, x1: 1, y: 0.24 },
    { x0: 0, x1: 0.4, y: 0.42 },
    { x0: 0.4, x1: 1, y: 0.48 },
    { x0: 0.4, x1: 1, y: 0.62 },
    { x0: 0, x1: 0.4, y: 0.72 },
    { x0: 0, x1: 1, y: 0.95 },
  ],
  verticals: [
    { x: 0.4, y0: 0.24, y1: 0.95 },
    { x: 0.34, y0: 0.045, y1: 0.42 },
    { x: 0.62, y0: 0.24, y1: 0.48 },
  ],
};
