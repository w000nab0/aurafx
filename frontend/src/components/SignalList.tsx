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
                <th style={headerStyle}>ロジック</th>
                <th style={headerStyle}>足</th>
                <th style={headerStyle}>方向</th>
                <th style={headerStyle}>価格</th>
                <th style={headerStyle}>SMA5/21</th>
                <th style={headerStyle}>RSI14</th>
                <th style={headerStyle}>トレンド</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal, idx) => {
                const rsi = (signal?.rsi ?? {}) as Record<string, unknown>;
                return (
                  <tr key={idx}>
                    <td style={cellStyle}>{formatJst(signal?.occurred_at ?? signal?.timestamp)}</td>
                    <td style={cellStyle}>{String(signal?.symbol ?? "-")}</td>
                    <td style={cellStyle}>{String(signal?.strategy_name ?? signal?.strategy ?? "-")}</td>
                    <td style={cellStyle}>{String(signal?.timeframe ?? "-")}</td>
                    <td
                      style={{
                        ...cellStyle,
                        fontWeight: 600,
                        writingMode: "horizontal-tb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDirection(signal?.direction, signal?.trade_action)}
                    </td>
                    <td style={cellStyle}>{formatNumber(signal?.price)}</td>
                    <td style={cellStyle}>{renderSignalSMA(signal)}</td>
                    <td style={cellStyle}>{formatNumber(rsi["14"], 2)}</td>
                    <td style={cellStyle}>{renderTrend(signal?.trend as Record<string, any> | undefined)}</td>
                  </tr>
                );
              })}
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

function formatNumber(value: unknown, digits = 3): string {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? "-");
  return num.toFixed(digits);
}

function renderSignalSMA(signal: Record<string, any> | undefined): string {
  if (!signal) return "-";
  const sma = (signal.sma ?? {}) as Record<string, unknown>;
  const sma5 = formatNumber(sma["5"]);
  const sma21 = formatNumber(sma["21"]);
  return `5:${sma5} / 21:${sma21}`;
}

function renderTrend(trend: Record<string, any> | undefined): string {
  if (!trend) return "-";
  const direction = String(trend.direction ?? "-").toUpperCase();
  const slope = trend.slope_pips ?? trend.slopePips;
  const slopeText = slope === undefined || slope === null ? "-" : Number(slope).toFixed(2);
  return `${direction} (${slopeText} pips)`;
}

function formatDirection(direction: unknown, action: unknown): string {
  const dir = typeof direction === "string" ? direction.toUpperCase() : "";
  const act = typeof action === "string" ? action.toUpperCase() : "NONE";
  if (act === "OPEN") {
    return dir === "SELL" ? "売り" : "買い";
  }
  if (act === "CLOSE") {
    return "決済";
  }
  if (act === "REVERSE") {
    return dir === "SELL" ? "売り" : "買い";
  }
  if (dir === "SELL") {
    return "売り";
  }
  if (dir === "BUY") {
    return "買い";
  }
  return "-";
}

function formatJst(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "-");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(date);
}
