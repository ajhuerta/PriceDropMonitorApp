import { useEffect, useState, useCallback } from "react";
import AddItemForm from "./components/AddItemForm";
import ItemTable from "./components/ItemTable";
import PriceHistoryPanel from "./components/PriceHistoryPanel";
import { getItems, createItem, deleteItem, updateItem, scrapeNow } from "./api";

const POLL_INTERVAL_MS = 30_000;

export default function App() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      const data = await getItems();
      setItems(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const id = setInterval(fetchItems, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchItems]);

  async function handleAdd(data) {
    await createItem(data);
    await fetchItems();
  }

  async function handleDelete(id) {
    if (!confirm("Remove this item?")) return;
    await deleteItem(id);
    if (selectedId === id) setSelectedId(null);
    await fetchItems();
  }

  async function handleToggle(id, active) {
    await updateItem(id, { active });
    await fetchItems();
  }

  async function handleUpdate(id, patch) {
    await updateItem(id, patch);
    await fetchItems();
  }

  async function handleScrapeNow(id) {
    const result = await scrapeNow(id);
    await fetchItems();
    return result;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Price Drop Monitor</h1>
        <span style={styles.subtitle}>Polls every 30s · Click a row to see history</span>
      </header>

      {error && <p style={styles.error}>⚠ {error}</p>}

      <AddItemForm onAdd={handleAdd} />

      <div style={styles.card}>
        <ItemTable
          items={items}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onScrapeNow={handleScrapeNow}
          onSelectItem={setSelectedId}
          selectedId={selectedId}
        />
      </div>

      <PriceHistoryPanel itemId={selectedId} items={items} />
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 20px",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#cdd6f4",
  },
  header: { marginBottom: 28 },
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: "#89b4fa" },
  subtitle: { fontSize: 13, color: "#6c7086" },
  card: {
    background: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: 10,
    padding: "4px 0",
  },
  error: { color: "#f38ba8", marginBottom: 12, fontSize: 14 },
};
