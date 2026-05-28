async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) {
    showLogin("Session expirée, reconnecte-toi.");
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

const api = {
  login: (username, password) =>
    fetch("/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }),
  logout: () => fetch("/auth/logout", { method: "POST", credentials: "same-origin" }),
  me: () => fetch("/auth/me", { credentials: "same-origin" }),
  getBudget: () => apiFetch("/api/budget"),
  patchItem: (section, id, data) =>
    apiFetch(`/api/budget/${section}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  addItem: (section, data) =>
    apiFetch(`/api/budget/${section}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteItem: (section, id) =>
    apiFetch(`/api/budget/${section}/${id}`, { method: "DELETE" }),
};
