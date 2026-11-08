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

export function adminSession() {
  return fetch("/api/admin/session", { credentials: "include" }).then(async (response) => {
    if (response.status === 401) return { ok: false };
    return readJson(response);
  });
}

export function adminLogin(password) {
  return adminFetch("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function adminLogout() {
  return adminFetch("/api/admin/logout", { method: "POST" });
}

export function adminDesk() {
  return adminFetch("/api/admin/desk");
}

export function adminPatchQuote(id, patch) {
  return adminFetch(`/api/admin/quotes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function adminPatchMessage(id, patch) {
  return adminFetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
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
