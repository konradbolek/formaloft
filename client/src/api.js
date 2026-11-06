async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || "Nie udało się pobrać wyceny.";
    const error = new Error(message);
    error.fields = data.fields || [message];
    throw error;
  }
  return data;
}

export function getCatalog(product) {
  const query = product ? `?product=${encodeURIComponent(product)}` : "";
  return fetch(`/api/catalog${query}`).then(readJson);
}

export function getPrice(config, signal) {
  return fetch("/api/price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
    signal,
  }).then(readJson);
}

export function getQuotes(product) {
  const query = product ? `?product=${encodeURIComponent(product)}` : "";
  return fetch(`/api/quotes${query}`).then(readJson);
}

export function sendContact(form) {
  return fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  }).then(readJson);
}

export function saveQuote(config, file) {
  const body = new FormData();
  body.append("photo", file);
  for (const [key, value] of Object.entries(config)) {
    body.append(key, String(value));
  }
  return fetch("/api/quotes", { method: "POST", body }).then(readJson);
}
