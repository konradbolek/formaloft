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

export function sendContact(form) {
  return fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  }).then(readJson);
}

function adminFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  return fetch(url, { ...options, credentials: "include", headers }).then(readJson);
}

const panel = "/desk/api/panel";

export function adminSession() {
  return fetch(`${panel}/session`, { credentials: "include" }).then(async (response) => {
    if (response.status === 401) return { ok: false };
    return readJson(response);
  });
}

export function adminLogin(password) {
  return adminFetch(`${panel}/login`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function adminLogout() {
  return adminFetch(`${panel}/logout`, { method: "POST" });
}

export function adminDesk() {
  return adminFetch(`${panel}/desk`);
}

export function adminPatchQuote(id, patch) {
  return adminFetch(`${panel}/quotes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function adminPatchMessage(id, patch) {
  return adminFetch(`${panel}/messages/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function panelRates() {
  return adminFetch(`${panel}/rates`);
}

export function savePanelRates(rates) {
  return adminFetch(`${panel}/rates`, {
    method: "PUT",
    body: JSON.stringify(rates),
  });
}

export function publishedRealizations() {
  return fetch("/desk/api/realizations").then(readJson);
}

export function panelRealizations() {
  return adminFetch(`${panel}/realizations`);
}

export function createRealization(title) {
  return adminFetch(`${panel}/realizations`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function saveRealization(id, patch) {
  return adminFetch(`${panel}/realizations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function removeRealization(id) {
  return adminFetch(`${panel}/realizations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function uploadRealizationPhoto(id, file) {
  const body = new FormData();
  body.append("photo", file);
  return fetch(`${panel}/realizations/${encodeURIComponent(id)}/photo`, {
    method: "POST",
    body,
    credentials: "include",
  }).then(readJson);
}

export function askWorkshop(question) {
  return adminFetch(`${panel}/assistant`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function downloadOffer(id) {
  const response = await fetch(`${panel}/quotes/${encodeURIComponent(id)}/offer`, {
    credentials: "include",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Nie udało się przygotować oferty.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Stilowo-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function saveQuote(config, previewUrl, wallFile) {
  const preview = await fetch(previewUrl).then((response) => response.blob());
  const body = new FormData();
  body.append("preview", preview, "podglad.jpg");
  if (wallFile) body.append("photo", wallFile);
  for (const [key, value] of Object.entries(config)) {
    body.append(key, String(value));
  }
  return fetch("/api/quotes", { method: "POST", body }).then(readJson);
}
