import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type StrategySummary = {
  strategy: string;
  strategy_name: string;
  total_signals: number;
  total_trades: number;
  total_closes: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  total_pnl: number;
  total_pips: number;
  avg_pnl: number;
  max_profit: number;
  max_loss: number;
};

type SummaryResponse = {
  strategies: StrategySummary[];
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8001";

async function fetchSummary(fromDate?: string, toDate?: string): Promise<SummaryResponse> {
  const params = new URLSearchParams();
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const url = `${API_BASE}/api/trading/signals/summary?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

// JST基準でデフォルト期間を計算 (当日07:00〜翌朝05:00)
function getDefaultPeriod(): { from: string; to: string; fromISO: string; toISO: string } {
  const now = new Date();

  // 現在の日本時間を取得 (UTC+9)
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

  // 東京市場オープン: 当日 07:00 JST
  const tokyoOpen = new Date(jstNow);
  tokyoOpen.setHours(7, 0, 0, 0);

  // NY市場クローズ: 翌朝 05:00 JST
  const nyClose = new Date(jstNow);
  nyClose.setDate(nyClose.getDate() + 1);
  nyClose.setHours(5, 0, 0, 0);

  // datetime-local用のフォーマット (ローカルタイムゾーン)
  const formatForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return {
    from: formatForInput(tokyoOpen),
    to: formatForInput(nyClose),
    fromISO: tokyoOpen.toISOString(),
    toISO: nyClose.toISOString(),
  };
}

export const PerformancePanel = () => {
  const defaultPeriod = getDefaultPeriod();
  const [fromDate, setFromDate] = useState(defaultPeriod.from);
  const [toDate, setToDate] = useState(defaultPeriod.to);
  const [appliedFrom, setAppliedFrom] = useState(defaultPeriod.fromISO);
  const [appliedTo, setAppliedTo] = useState(defaultPeriod.toISO);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["signal-summary", appliedFrom, appliedTo],
    queryFn: () => fetchSummary(appliedFrom, appliedTo),
  });

  const handleApply = () => {
    // datetime-local の値をISO形式に変換してAPI送信
    if (fromDate) {
      const fromISO = new Date(fromDate).toISOString();
      setAppliedFrom(fromISO);
    } else {
      setAppliedFrom("");
    }
    if (toDate) {
      const toISO = new Date(toDate).toISOString();
      setAppliedTo(toISO);
    } else {
      setAppliedTo("");
    }
  };

  const handleReset = () => {
    const resetPeriod = getDefaultPeriod();
    setFromDate(resetPeriod.from);
    setToDate(resetPeriod.to);
    setAppliedFrom(resetPeriod.fromISO);
    setAppliedTo(resetPeriod.toISO);
  };

  const strategies = data?.strategies ?? [];

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div style={filterBar}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "14px" }}>開始日時</label>
          <input
            type="datetime-local"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={input}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "14px" }}>終了日時</label>
          <input
            type="datetime-local"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={input}
          />
        </div>
        <button onClick={handleApply} style={primaryButton}>
          適用
        </button>
        <button onClick={handleReset} style={secondaryButton}>
          リセット
        </button>
        <button onClick={() => refetch()} style={secondaryButton}>
          更新
        </button>
      </div>

      {isLoading && <p style={{ opacity: 0.7 }}>データ取得中...</p>}

      {!isLoading && strategies.length === 0 && (
        <p style={{ opacity: 0.7 }}>該当するデータがありません</p>
      )}

      {!isLoading && strategies.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr>
              <th style={header}>戦略</th>
              <th style={header}>総シグナル</th>
              <th style={header}>総トレード</th>
              <th style={header}>決済回数</th>
              <th style={header}>勝率 (%)</th>
              <th style={header}>勝ち</th>
              <th style={header}>負け</th>
              <th style={header}>総損益</th>
              <th style={header}>総Pips</th>
              <th style={header}>平均損益</th>
              <th style={header}>最大利益</th>
              <th style={header}>最大損失</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((s) => (
              <tr key={s.strategy}>
                <td style={cell}>{s.strategy_name}</td>
                <td style={cell}>{s.total_signals}</td>
                <td style={cell}>{s.total_trades}</td>
                <td style={cell}>{s.total_closes}</td>
                <td style={{ ...cell, fontWeight: 600, color: getWinRateColor(s.win_rate) }}>
                  {s.win_rate.toFixed(1)}
                </td>
                <td style={cell}>{s.win_count}</td>
                <td style={cell}>{s.loss_count}</td>
                <td style={{ ...cell, fontWeight: 600, color: getPnlColor(s.total_pnl) }}>
                  {s.total_pnl.toFixed(2)}
                </td>
                <td style={{ ...cell, color: getPnlColor(s.total_pips) }}>
                  {s.total_pips.toFixed(2)}
                </td>
                <td style={cell}>{s.avg_pnl.toFixed(2)}</td>
                <td style={{ ...cell, color: "#4ade80" }}>{s.max_profit.toFixed(2)}</td>
                <td style={{ ...cell, color: "#f87171" }}>{s.max_loss.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const filterBar: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  padding: "12px",
  borderRadius: "10px",
  backgroundColor: "rgba(15,23,42,0.5)",
  border: "1px solid rgba(148,163,184,0.25)",
  flexWrap: "wrap",
};

const input: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.2)",
  backgroundColor: "rgba(15,23,42,0.6)",
  color: "white",
  fontSize: "13px",
};

const primaryButton: React.CSSProperties = {
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
};

const secondaryButton: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "1px solid rgba(255,255,255,0.4)",
  color: "white",
  borderRadius: "6px",
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "13px",
};

const header: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: "12px",
  opacity: 0.65,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  whiteSpace: "nowrap",
};

const cell: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontVariantNumeric: "tabular-nums",
};

function getPnlColor(value: number): string {
  if (value > 0) return "#4ade80";
  if (value < 0) return "#f87171";
  return "inherit";
}

function getWinRateColor(rate: number): string {
  if (rate >= 60) return "#4ade80";
  if (rate >= 50) return "#fbbf24";
  return "#f87171";
}
