import { useState } from "react";

export default function ItemTable({ items, onDelete, onToggle, onUpdate, onScrapeNow, onSelectItem, selectedId }) {
  const [scrapingId, setScrapingId] = useState(null);
  const [scrapeMsg, setScrapeMsg] = useState({});
  // editCell: { id, field, value } | null — only one cell editable at a time
  const [editCell, setEditCell] = useState(null);

  async function handleScrape(id) {
    setScrapingId(id);
    setScrapeMsg((m) => ({ ...m, [id]: "" }));
    try {
      const result = await onScrapeNow(id);
      setScrapeMsg((m) => ({
        ...m,
        [id]: result.success ? `✓ $${result.price?.toFixed(2)}` : `✗ ${result.message}`,
      }));
    } catch {
      setScrapeMsg((m) => ({ ...m, [id]: "✗ Request failed" }));
    } finally {
      setScrapingId(null);
    }
  }

  function startEdit(e, itemId, field, currentValue) {
    e.stopPropagation();
    setEditCell({ id: itemId, field, value: String(currentValue) });
  }

  async function commitEdit() {
    if (!editCell) return;
    const { id, field, value } = editCell;
    setEditCell(null);
    const numericFields = ["target_price", "check_interval_minutes"];
    const parsed = numericFields.includes(field) ? Number(value) : value.trim();
    if (numericFields.includes(field) && (isNaN(parsed) || parsed <= 0)) return;
    if (!numericFields.includes(field) && !parsed) return;
    await onUpdate(id, { [field]: parsed });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditCell(null);
  }

  // A cell that becomes an input when clicked
  function EditableCell({ item, field, displayText, renderDisplay }) {
    const isEditing = editCell?.id === item.id && editCell?.field === field;
    if (isEditing) {
      return (
        <td style={{ ...styles.td, padding: "6px 10px" }} onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={editCell.value}
            onChange={(e) => setEditCell((ec) => ({ ...ec, value: e.target.value }))}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            style={styles.inlineInput}
          />
        </td>
      );
    }
    return (
      <td
        style={{ ...styles.td, cursor: "text" }}
        onClick={(e) => startEdit(e, item.id, field, displayText)}
        title="Click to edit"
      >
        {renderDisplay ? renderDisplay() : displayText}
        <span style={styles.editHint}>✎</span>
      </td>
    );
  }

  if (items.length === 0) {
    return <p style={{ color: "#6c7086", textAlign: "center", marginTop: 40 }}>No items monitored yet. Add one above.</p>;
  }

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {["Name", "Current $", "Target $", "Last Scraped", "Interval (min)", "Status", "Actions"].map((h) => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              style={{
                ...styles.tr,
                background: item.id === selectedId ? "#2a2a3e" : "transparent",
              }}
            >
              {/* Name — editable */}
              <EditableCell
                item={item}
                field="name"
                displayText={item.name}
                renderDisplay={() => (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.link}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.name}
                  </a>
                )}
              />

              {/* Current price — read only */}
              <td style={styles.td}>
                {item.current_price != null ? (
                  <span style={{ color: item.current_price <= item.target_price ? "#a6e3a1" : "#cdd6f4", fontWeight: 600 }}>
                    ${item.current_price.toFixed(2)}
                  </span>
                ) : (
                  <span style={{ color: "#6c7086" }}>N/A</span>
                )}
              </td>

              {/* Target price — editable */}
              <EditableCell
                item={item}
                field="target_price"
                displayText={item.target_price}
                renderDisplay={() => `$${item.target_price.toFixed(2)}`}
              />

              {/* Last scraped — read only */}
              <td style={{ ...styles.td, color: "#6c7086", fontSize: 12 }}>
                {item.last_scraped_at
                  ? new Date(item.last_scraped_at + "Z").toLocaleString()
                  : <span style={{ color: "#45475a" }}>Never</span>}
              </td>

              {/* Interval — editable */}
              <EditableCell
                item={item}
                field="check_interval_minutes"
                displayText={item.check_interval_minutes}
                renderDisplay={() => `${item.check_interval_minutes}m`}
              />

              {/* Status — read only */}
              <td style={styles.td}>
                <span style={{ color: item.active ? "#a6e3a1" : "#6c7086" }}>
                  {item.active ? "Active" : "Paused"}
                </span>
              </td>

              {/* Actions */}
              <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                <button
                  style={styles.btnScrape}
                  disabled={scrapingId === item.id}
                  onClick={() => handleScrape(item.id)}
                >
                  {scrapingId === item.id ? "…" : "Scrape"}
                </button>
                <button
                  style={item.id === selectedId ? styles.btnHistoryActive : styles.btnHistory}
                  onClick={() => onSelectItem(item.id === selectedId ? null : item.id)}
                >
                  History
                </button>
                <button style={styles.btnToggle} onClick={() => onToggle(item.id, !item.active)}>
                  {item.active ? "Pause" : "Resume"}
                </button>
                <button style={styles.btnDelete} onClick={() => onDelete(item.id)}>
                  Delete
                </button>
                {scrapeMsg[item.id] && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: scrapeMsg[item.id].startsWith("✓") ? "#a6e3a1" : "#f38ba8" }}>
                    {scrapeMsg[item.id]}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const btn = {
  padding: "4px 10px",
  border: "none",
  borderRadius: 5,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  marginRight: 6,
};

const styles = {
  wrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    color: "#89b4fa",
    fontSize: 13,
    borderBottom: "1px solid #313244",
    fontWeight: 600,
  },
  tr: { borderBottom: "1px solid #1e1e2e", transition: "background 0.15s" },
  td: { padding: "10px 14px", color: "#cdd6f4", fontSize: 14 },
  link: { color: "#89dceb", textDecoration: "none" },
  editHint: { opacity: 0.25, marginLeft: 5, fontSize: 10 },
  inlineInput: {
    background: "#313244",
    border: "1px solid #89b4fa",
    borderRadius: 4,
    color: "#cdd6f4",
    fontSize: 13,
    padding: "3px 7px",
    outline: "none",
    width: "100%",
    minWidth: 60,
    boxSizing: "border-box",
  },
  btnScrape: { ...btn, background: "#89b4fa", color: "#1e1e2e" },
  btnHistory: { ...btn, background: "#313244", color: "#cdd6f4", border: "1px solid #45475a" },
  btnHistoryActive: { ...btn, background: "#cba6f7", color: "#1e1e2e" },
  btnToggle: { ...btn, background: "#45475a", color: "#cdd6f4" },
  btnDelete: { ...btn, background: "#f38ba8", color: "#1e1e2e" },
};
