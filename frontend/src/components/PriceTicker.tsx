import { useMemo, type CSSProperties } from "react";

import { useMarketStore } from "../hooks/useMarketStore";

export const PriceTicker = () => {
  const latest = useMarketStore((state) => state.latestTicker);
  const connected = useMarketStore((state) => state.connected);

  const display = useMemo(() => {
    if (!latest) return null;
    const { ask, bid, timestamp, symbol, status } = latest;
    const mid = !ask || !bid ? null : (Number(ask) + Number(bid)) / 2;
    return {
      ask,
      bid,
      mid,
      timestamp,
      symbol,
      status
    };
  }, [latest]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2 style={{ margin: 0 }}>最新レート</h2>
        <span
          style={{
            fontSize: "12px",
            padding: "4px 8px",
            borderRadius: "999px",
            backgroundColor: connected ? "#16a34a" : "#dc2626"
          }}
        >
          {connected ? "LIVE" : "DISCONNECTED"}
        </span>
      </div>
      {display ? (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "16px"
          }}
        >
          <tbody>
            <tr>
              <th style={cellHeading}>Symbol</th>
              <td style={cellValue}>{String(display.symbol ?? "-")}</td>
            </tr>
            <tr>
              <th style={cellHeading}>Bid</th>
              <td style={cellValue}>{formatNumber(display.bid)}</td>
            </tr>
            <tr>
              <th style={cellHeading}>Ask</th>
              <td style={cellValue}>{formatNumber(display.ask)}</td>
            </tr>
            <tr>
              <th style={cellHeading}>Mid</th>
              <td style={cellValue}>{formatNumber(display.mid)}</td>
            </tr>
            <tr>
              <th style={cellHeading}>Timestamp</th>
              <td style={cellValue}>{display.timestamp ? String(display.timestamp) : "-"}</td>
            </tr>
            <tr>
              <th style={cellHeading}>Status</th>
              <td style={cellValue}>{String(display.status ?? "-")}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p style={{ opacity: 0.7 }}>ティックを待機しています...</p>
      )}
    </div>
  );
};

const cellHeading: CSSProperties = {
  textAlign: "left",
  padding: "8px 0",
  opacity: 0.7,
  fontWeight: 500,
  width: "140px"
};

const cellValue: CSSProperties = {
  textAlign: "right",
  padding: "8px 0",
  fontVariantNumeric: "tabular-nums"
};

function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(3);
}
