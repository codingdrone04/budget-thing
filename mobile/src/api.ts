import { CONFIG } from "./config";
import type { Budget, Section } from "./types";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(CONFIG.API_BASE_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": CONFIG.API_KEY,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  getBudget: (): Promise<Budget> => apiFetch("/api/budget"),

  patchItem: (section: Section, id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/budget/${section}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  addItem: (section: Section, data: Record<string, unknown>) =>
    apiFetch(`/api/budget/${section}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteItem: (section: Section, id: string) =>
    apiFetch(`/api/budget/${section}/${id}`, { method: "DELETE" }),
};
