import { useEffect, useState } from "react";
import { getPriceHistory } from "../api";

export default function PriceHistoryPanel({ itemId, items }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const item = items.find((i) => i.id === itemId);

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    getPriceHistory(itemId)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [itemId]);

  if (!itemId) return null;

  const latest = history[0];
  const lowest = history.length ? Math.min(...history.map((h) => h.price)) : null;

  return (
    <div style={styles.panel}>
      <h3 style={styles.heading}>
        Price History — <span style={{ color: "#89dceb" }}>{item?.name}</span>
      </h3>

      {loading && <p style={styles.muted}>Loading…</p>}

      {!loading && history.length === 0 && (
        <p style={styles.muted}>No price data yet. Click "Scrape" to fetch the current price.</p>
      )}

      {!loading && history.length > 0 && (
        <>
          <div style={styles.stats}>
            <Stat label="Latest" value={`$${latest.price.toFixed(2)}`} />
            <Stat label="Lowest" value={`$${lowest.toFixed(2)}`} />
            <Stat label="Target" value={`$${item?.target_price.toFixed(2)}`} highlight={latest.price <= item?.target_price} />
            <Stat label="Records" value={history.length} />
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Scraped At</th>
                <th style={styles.th}>vs Target</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const below = item && h.price <= item.target_price;
                return (
                  <tr key={h.id} style={styles.tr}>
                    <td style={{ ...styles.td, color: below ? "#a6e3a1" : "#cdd6f4", fontWeight: below ? 700 : 400 }}>
                      ${h.price.toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, color: "#6c7086" }}>
                      {new Date(h.scraped_at + "Z").toLocaleString()}
                    </td>
                    <td style={{ ...styles.td, color: below ? "#a6e3a1" : "#f38ba8" }}>
                      {below ? "✓ At target" : `$${(h.price - item?.target_price).toFixed(2)} above`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: highlight ? "#a6e3a1" : "#cdd6f4" }}>{value}</div>
    </div>
  );
}

const styles = {
  panel: {
    marginTop: 24,
    background: "#1e1e2e",
    border: "1px solid #313244",
    borderRadius: 10,
    padding: "20px 24px",
  },
  heading: { margin: "0 0 16px", fontSize: 15, color: "#cdd6f4" },
  muted: { color: "#6c7086", fontSize: 13 },
  stats: { display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" },
  stat: { minWidth: 90 },
  statLabel: { fontSize: 11, color: "#6c7086", textTransform: "uppercase", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 700 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    color: "#89b4fa",
    fontSize: 12,
    borderBottom: "1px solid #313244",
  },
  tr: { borderBottom: "1px solid #1e1e2e" },
  td: { padding: "8px 12px", fontSize: 13 },
};
