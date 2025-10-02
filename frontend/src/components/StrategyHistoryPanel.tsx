import React, { useEffect, useRef, useState } from "react";

import { fetchSignalHistory, type SignalHistoryEvent, type SignalHistoryGroup } from "../services/api";
import { useMarketStore } from "../hooks/useMarketStore";

export const StrategyAnalysisPanel = () => {
  const strategyHistory = useMarketStore((state) => state.strategyHistory);
  const setStrategyHistory = useMarketStore((state) => state.setStrategyHistory);
  const loadedRef = useRef(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (strategy: string) => {
    setExpanded((prev) => ({ ...prev, [strategy]: !prev[strategy] }));
  };

  useEffect(() => {
    if (loadedRef.current) {
      return;
    }
    loadedRef.current = true;

    const load = async () => {
      try {
        const groups: SignalHistoryGroup[] = await fetchSignalHistory();
        const mapped = groups.reduce<Record<string, { label: string; events: SignalHistoryEvent[] }>>(
          (acc, group) => {
            acc[group.strategy] = {
              label: group.strategy_name,
              events: group.events,
            };
          return acc;
        }, {});
        setStrategyHistory(mapped);
      } catch (error) {
        console.error("Failed to load signal history", error);
      }
    };

    void load();
  }, [setStrategyHistory]);

  const entries = Object.entries(strategyHistory);
  if (entries.length === 0) {
    return (
      <div style={cardStyle}>
        <h2 style={sectionTitle}>ロジック別履歴</h2>
        <p style={{ opacity: 0.7 }}>履歴を読込中または未発生です。</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>ロジック別履歴</h2>
      <div style={{ display: "grid", gap: "16px" }}>
        {entries.map(([strategy, info]) => {
          const label = info.label || strategy;
          const latest = info.events.slice(0, 5) as SignalHistoryEvent[];
          const details = STRATEGY_DETAILS[strategy] ?? STRATEGY_DETAILS[label] ?? null;
          const isExpanded = expanded[strategy] ?? false;
          return (
            <div key={strategy} style={strategyCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0 }}>{label}</h3>
                {details ? (
                  <button
                    type="button"
                    onClick={() => toggle(strategy)}
                    style={detailButton}
                  >
                    {isExpanded ? "詳細を閉じる" : "詳細"}
                  </button>
                ) : null}
              </div>
              {details && isExpanded ? (
                <div style={detailBox}>
                  {details.map((line, idx) => (
                    <p key={idx} style={detailLine}>
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
              {latest.length === 0 ? (
                <p style={{ opacity: 0.6, fontSize: "13px" }}>まだシグナルはありません。</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th style={miniHeader}>時刻</th>
                      <th style={miniHeader}>方向</th>
                      <th style={miniHeader}>価格</th>
                      <th style={miniHeader}>決済</th>
                      <th style={miniHeader}>損益 (pips)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((item, idx) => (
                      <tr key={idx}>
                        <td style={miniCell}>{formatJst(item.occurred_at)}</td>
                        <td style={miniCell}>{formatDirection(item.direction)}</td>
                        <td style={miniCell}>{formatNumber(item.price)}</td>
                        <td style={miniCell}>{item.trade_action === "CLOSE" ? "決済" : ""}</td>
                        <td style={miniCell}>{renderPnL(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#1e293b",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.35)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "18px",
  marginBottom: "12px",
};

const strategyCard: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  padding: "12px",
};

const miniHeader: React.CSSProperties = {
  textAlign: "left",
  padding: "4px 6px",
  opacity: 0.65,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const miniCell: React.CSSProperties = {
  padding: "4px 6px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontVariantNumeric: "tabular-nums",
};

function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(3);
}

function formatDirection(direction: unknown): string {
  const dir = typeof direction === "string" ? direction.toUpperCase() : "";
  if (dir === "SELL") {
    return "売り";
  }
  if (dir === "BUY") {
    return "買い";
  }
  return "-";
}

function renderPnL(item: SignalHistoryEvent): string {
  if (item.trade_action !== "CLOSE") {
    return "";
  }
  if (item.pips !== undefined && item.pips !== null) {
    return `${Number(item.pips).toFixed(1)} pips`;
  }
  if (item.pnl !== undefined && item.pnl !== null) {
    return `${Number(item.pnl).toFixed(2)}`;
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

const STRATEGY_DETAILS: Record<string, string[]> = {
  bb_mean_reversion_1m: [
    "対象: 1分足",
    "トレンドが横ばいまたは逆行方向の場合にのみエントリー",
    "価格がボリンジャーバンド ±2σ にタッチ",
    "RSI14 ≥ 70 でSELL、RSI14 ≤ 30 でBUY",
  ],
  "BB逆張り (1分)": [
    "対象: 1分足",
    "トレンドが横ばいまたは逆行方向の場合にのみエントリー",
    "価格がボリンジャーバンド ±2σ にタッチ",
    "RSI14 ≥ 70 でSELL、RSI14 ≤ 30 でBUY",
  ],
  ma_touch_bounce_1m: [
    "対象: 1分足",
    "トレンド方向と同じ向きのときのみ発動",
    "価格がSMA21へタッチしたタイミングで反発方向へエントリー",
    "トレンド上昇中はBUY、下降中はSELL",
  ],
  "SMA21タッチ反発 (1分)": [
    "対象: 1分足",
    "トレンド方向と同じ向きのときのみ発動",
    "価格がSMA21へタッチしたタイミングで反発方向へエントリー",
    "トレンド上昇中はBUY、下降中はSELL",
  ],
  ma_touch_bounce_5m: [
    "対象: 5分足",
    "トレンド方向と同じ向きのときのみ発動",
    "価格がSMA21へタッチしたタイミングで反発方向へエントリー",
    "トレンド上昇中はBUY、下降中はSELL",
  ],
  "SMA21タッチ反発 (5分)": [
    "対象: 5分足",
    "トレンド方向と同じ向きのときのみ発動",
    "価格がSMA21へタッチしたタイミングで反発方向へエントリー",
    "トレンド上昇中はBUY、下降中はSELL",
  ],
  fake_breakout_1m: [
    "対象: 1分足（5分足のトレンドも横ばいであること）",
    "直近5本の高値/安値をブレイク後すぐに戻った場合",
    "フェイク上抜けでSELL、フェイク下抜けでBUY",
  ],
  "高値・安値フェイクブレイク (1分)": [
    "対象: 1分足（5分足のトレンドも横ばいであること）",
    "直近5本の高値/安値をブレイク後すぐに戻った場合",
    "フェイク上抜けでSELL、フェイク下抜けでBUY",
  ],
  ma_cross_trend_1m: [
    "対象: 1分足",
    "トレンドが上昇/下降のときのみ評価",
    "SMA5とSMA21のクロスを検出",
    "上昇トレンド中のゴールデンクロスでBUY、下降トレンド中のデッドクロスでSELL",
  ],
  "移動平均クロス順張り (1分)": [
    "対象: 1分足",
    "トレンドが上昇/下降のときのみ評価",
    "SMA5とSMA21のクロスを検出",
    "上昇トレンド中のゴールデンクロスでBUY、下降トレンド中のデッドクロスでSELL",
  ],
  trend_pullback_1m: [
    "対象: 1分足",
    "SMA21の傾き（pips換算）がしきい値以上の強いトレンド時",
    "価格がSMA5など短期MAにタッチした押し目/戻り目を狙う",
    "上昇トレンド中はBUY、下降トレンド中はSELL",
  ],
  "強トレンド押し目・戻り目 (1分)": [
    "対象: 1分足",
    "SMA21の傾き（pips換算）がしきい値以上の強いトレンド時",
    "価格がSMA5など短期MAにタッチした押し目/戻り目を狙う",
    "上昇トレンド中はBUY、下降トレンド中はSELL",
  ],
};

const detailButton: React.CSSProperties = {
  backgroundColor: "#0f172a",
  color: "#60a5fa",
  border: "1px solid rgba(96,165,250,0.4)",
  borderRadius: "6px",
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: "12px",
};

const detailBox: React.CSSProperties = {
  marginTop: "8px",
  marginBottom: "12px",
  backgroundColor: "rgba(15,23,42,0.6)",
  borderRadius: "8px",
  padding: "8px 12px",
  border: "1px solid rgba(148,163,184,0.2)",
};

const detailLine: React.CSSProperties = {
  margin: "4px 0",
  fontSize: "12px",
  opacity: 0.85,
};
