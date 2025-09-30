import { type CSSProperties } from "react";

import { useMarketStore } from "../hooks/useMarketStore";

export const SignalList = () => {
  const signals = useMarketStore((state) => state.signals);

  return (
    <div>
      <h2 style={{ margin: "0 0 16px" }}>シグナル履歴（最新100件）</h2>
      {signals.length === 0 ? (
        <p style={{ opacity: 0.7 }}>まだシグナルは発生していません。</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                <th style={headerStyle}>時刻</th>
                <th style={headerStyle}>シンボル</th>
                <th style={headerStyle}>足</th>
                <th style={headerStyle}>方向</th>
                <th style={headerStyle}>価格</th>
                <th style={headerStyle}>SMA</th>
                <th style={headerStyle}>RSI</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal, idx) => (
                <tr key={idx}>
                  <td style={cellStyle}>{String(signal?.occurred_at ?? signal?.timestamp ?? "-")}</td>
                  <td style={cellStyle}>{String(signal?.symbol ?? "-")}</td>
                  <td style={cellStyle}>{String(signal?.timeframe ?? "-")}</td>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>{String(signal?.direction ?? "-")}</td>
                  <td style={cellStyle}>{formatNumber(signal?.price)}</td>
                  <td style={cellStyle}>{formatNumber(signal?.sma)}</td>
                  <td style={cellStyle}>{formatNumber(signal?.rsi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const headerStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px",
  fontSize: "12px",
  letterSpacing: "0.05em",
  opacity: 0.7,
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
};

const cellStyle: CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  fontVariantNumeric: "tabular-nums"
};

function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? "-");
  return num.toFixed(3);
}
