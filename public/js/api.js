async function apiFetch(path, options = {}) {
  const res = await fetch(CONFIG.API_BASE_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": CONFIG.API_KEY,
      ...(options.headers ?? {}),
    },
  });
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
