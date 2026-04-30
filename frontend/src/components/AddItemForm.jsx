import { useState } from "react";

export default function AddItemForm({ onAdd, onRefresh }) {
  const [form, setForm] = useState({
    name: "",
    url: "",
    target_price: "",
    check_interval_minutes: 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.url || !form.target_price) {
      setError("Name, URL, and target price are required.");
      return;
    }
    setLoading(true);
    try {
      await onAdd({
        ...form,
        target_price: parseFloat(form.target_price),
        check_interval_minutes: parseInt(form.check_interval_minutes),
      });
      setForm({ name: "", url: "", target_price: "", check_interval_minutes: 60 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.headingRow}>
        <h2 style={styles.heading}>Add Item to Monitor</h2>
        <button type="button" onClick={onRefresh} style={styles.refreshBtn}>
          ↻ Refresh
        </button>
      </div>
      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.row}>
        <input
          name="name"
          placeholder="Product name"
          value={form.name}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="url"
          placeholder="Amazon URL"
          value={form.url}
          onChange={handleChange}
          style={{ ...styles.input, flex: 2 }}
        />
        <input
          name="target_price"
          type="number"
          step="0.01"
          min="0"
          placeholder="Target $"
          value={form.target_price}
          onChange={handleChange}
          style={{ ...styles.input, width: 110 }}
        />
        <input
          name="check_interval_minutes"
          type="number"
          min="1"
          placeholder="Interval (min)"
          value={form.check_interval_minutes}
          onChange={handleChange}
          style={{ ...styles.input, width: 120 }}
        />
        <button type="submit" disabled={loading} style={styles.addBtn}>
          {loading ? "Adding…" : "+ Add"}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    background: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: 10,
    padding: "20px 24px",
    marginBottom: 24,
  },
  headingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  heading: { margin: 0, fontSize: 16, color: "#cdd6f4" },
  refreshBtn: {
    padding: "5px 14px",
    background: "transparent",
    border: "1px solid #45475a",
    borderRadius: 6,
    color: "#89b4fa",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  input: {
    flex: 1,
    minWidth: 120,
    padding: "8px 12px",
    background: "#313244",
    border: "1px solid #45475a",
    borderRadius: 6,
    color: "#cdd6f4",
    fontSize: 14,
    outline: "none",
  },
  addBtn: {
    padding: "8px 18px",
    background: "#89b4fa",
    color: "#1e1e2e",
    border: "none",
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  error: { color: "#f38ba8", fontSize: 13, marginBottom: 8 },
};
