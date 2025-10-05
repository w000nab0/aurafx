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
          <th style={header}>SMA5</th>
          <th style={header}>SMA21</th>
          <th style={header}>SMA21傾き</th>
          <th style={header}>RSI14</th>
          <th style={header}>ATR14</th>
          <th style={header}>RCI6/9/27</th>
          <th style={header}>BB21(±2)</th>
          <th style={header}>BB21(±3)</th>
          <th style={header}>時刻</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([timeframe, raw]) => {
          const tfLabel = formatTimeframe(timeframe);
          const data = raw as Record<string, any>;
          const sma = (data.sma ?? {}) as Record<string, number>;
          const rsi = (data.rsi ?? {}) as Record<string, number>;
          const atr = (data.atr ?? {}) as Record<string, number>;
          const rci = (data.rci ?? {}) as Record<string, number>;
          const bb = (data.bb ?? {}) as Record<string, Record<string, number>>;
          const trend = (data.trend ?? {}) as Record<string, any>;
          const bbSigma2 = bb["21_2"] ?? bb["21_2.0"] ?? {};
          const bbSigma3 = bb["21_3"] ?? bb["21_3.0"] ?? {};
          const slopePips = trend.slope_pips ?? trend.slopePips;
          const trendDirRaw = trend.direction ?? "-";
          const trendDir = typeof trendDirRaw === "string" ? trendDirRaw.toUpperCase() : "-";
          return (
            <tr key={timeframe}>
              <td style={cell}>{tfLabel}</td>
              <td style={cell}>{formatNumber(data.close)}</td>
              <td style={cell}>{formatNumber(sma["5"])} </td>
              <td style={cell}>{formatNumber(sma["21"])} </td>
              <td style={cell}>{`${trendDir} ${formatNumber(slopePips, 2)}`}</td>
              <td style={cell}>{formatNumber(rsi["14"])}</td>
              <td style={cell}>{formatNumber(atr["14"])}</td>
              <td style={cell}>{`6:${formatNumber(rci["6"])} / 9:${formatNumber(rci["9"])} / 27:${formatNumber(rci["27"])}`}</td>
              <td style={cell}>{`U:${formatNumber(bbSigma2.upper)} L:${formatNumber(bbSigma2.lower)}`}</td>
              <td style={cell}>{`U:${formatNumber(bbSigma3.upper)} L:${formatNumber(bbSigma3.lower)}`}</td>
              <td style={cell}>{String(data.timestamp ?? "-")}</td>
            </tr>
          );
        })}
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

function formatTimeframe(value: string): string {
  if (value.endsWith("m")) {
    return value;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  if (numeric % 60 === 0) {
    return `${numeric / 60}m`;
  }
  return `${numeric}s`;
}
