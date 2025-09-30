import { useMarketStore } from "../hooks/useMarketStore";

export const CandleTable = () => {
  const candles = useMarketStore((state) => state.candles);
  const entries = Object.entries(candles);

  if (entries.length === 0) {
    return <p style={{ opacity: 0.7 }}>足データ待機中...</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
      <thead>
        <tr>
          <th style={header}>足</th>
          <th style={header}>Open</th>
          <th style={header}>High</th>
          <th style={header}>Low</th>
          <th style={header}>Close</th>
          <th style={header}>Volume</th>
          <th style={header}>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([timeframe, data]) => (
          <tr key={timeframe}>
            <td style={cell}>{timeframe}</td>
            <td style={cell}>{formatNumber(data.open)}</td>
            <td style={cell}>{formatNumber(data.high)}</td>
            <td style={cell}>{formatNumber(data.low)}</td>
            <td style={cell}>{formatNumber(data.close)}</td>
            <td style={cell}>{formatNumber(data.volume, 0)}</td>
            <td style={cell}>{String(data.timestamp ?? "-")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const header: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  fontSize: "12px",
  opacity: 0.65,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const cell: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontVariantNumeric: "tabular-nums",
};

function formatNumber(value: unknown, digits = 3): string {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? "-");
  return num.toFixed(digits);
}
