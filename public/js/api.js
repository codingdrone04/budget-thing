function getApiKey() {
  return localStorage.getItem("bt_api_key") || CONFIG.API_KEY;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(CONFIG.API_BASE_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": getApiKey(),
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("bt_api_key");
    showLogin("Clé incorrecte, réessaie.");
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

const api = {
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
