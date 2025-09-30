import { useMarketStore } from "../hooks/useMarketStore";

export const IndicatorPanel = () => {
  const indicators = useMarketStore((state) => state.indicators);

  const entries = Object.entries(indicators);

  if (entries.length === 0) {
    return <p style={{ opacity: 0.7 }}>インジケータの計算待ちです...</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
      <thead>
        <tr>
          <th style={header}>足</th>
          <th style={header}>終値</th>
          <th style={header}>SMA</th>
          <th style={header}>RSI</th>
          <th style={header}>BB Upper</th>
          <th style={header}>BB Lower</th>
          <th style={header}>時刻</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([timeframe, data]) => (
          <tr key={timeframe}>
            <td style={cell}>{timeframe}</td>
            <td style={cell}>{formatNumber(data.close)}</td>
            <td style={cell}>{formatNumber(data.sma)}</td>
            <td style={cell}>{formatNumber(data.rsi)}</td>
            <td style={cell}>{formatNumber(data.bb_upper)}</td>
            <td style={cell}>{formatNumber(data.bb_lower)}</td>
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

function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? "-");
  return num.toFixed(3);
}
