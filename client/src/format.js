export function formatZl(amount) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCm(value) {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toLocaleString("pl-PL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function roundToStep(value, step) {
  const steps = Math.round(value / step);
  return Math.round(steps * step * 1000) / 1000;
}
