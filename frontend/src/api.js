const BASE = "http://localhost:8000";

export async function getItems() {
  const res = await fetch(`${BASE}/items/`);
  if (!res.ok) throw new Error("Failed to fetch items");
  return res.json();
}

export async function createItem(data) {
  const res = await fetch(`${BASE}/items/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create item");
  return res.json();
}

export async function updateItem(id, data) {
  const res = await fetch(`${BASE}/items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update item");
  return res.json();
}

export async function deleteItem(id) {
  const res = await fetch(`${BASE}/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete item");
}

export async function scrapeNow(id) {
  const res = await fetch(`${BASE}/items/${id}/scrape-now`, { method: "POST" });
  if (!res.ok) throw new Error("Scrape request failed");
  return res.json();
}

export async function getPriceHistory(id) {
  const res = await fetch(`${BASE}/prices/${id}`);
  if (!res.ok) throw new Error("Failed to fetch price history");
  return res.json();
}
