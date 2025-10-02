import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchTradingConfig, updateTradingState } from "../services/api";
import { useMarketStore } from "../hooks/useMarketStore";

export const TradingControlPanel = () => {
  const queryClient = useQueryClient();
  const { data, isError } = useQuery({ queryKey: ["trading-config"], queryFn: fetchTradingConfig });
  const tradingActive = Boolean(data?.trading_active);
  const blackoutActive = Boolean(data?.blackout_active);
  const { connected, signals } = useMarketStore((state) => ({
    connected: state.connected,
    signals: state.signals,
  }));
  const latestSignal = signals[0];
  const latestSignalLabel = latestSignal
    ? `${String(latestSignal.strategy_name ?? latestSignal.strategy ?? "シグナル")}`
    : "シグナル待機中";
  const latestSignalDirection = latestSignal
    ? String(latestSignal.direction ?? "")
    : "";
  const latestSignalPrice = latestSignal
    ? String(latestSignal.price ?? "")
    : "";
  const latestSignalTime = latestSignal && typeof latestSignal.occurred_at === "string"
    ? new Date(latestSignal.occurred_at).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;
  const mutation = useMutation({
    mutationFn: (active: boolean) => updateTradingState(active),
    onSuccess: (config) => {
      queryClient.setQueryData(["trading-config"], config);
    },
  });

  const handleToggle = () => {
    mutation.mutate(!tradingActive);
  };

  if (isError) {
    return (
      <div style={cardStyle}>
        <h2 style={sectionTitle}>実取引コントロール</h2>
        <p style={{ color: "#f87171" }}>設定の取得に失敗しました。</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={cardStyle}>
        <h2 style={sectionTitle}>実取引コントロール</h2>
        <p style={{ opacity: 0.7 }}>状態を取得中...</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>実取引コントロール</h2>
      <p style={{ opacity: 0.7, marginBottom: "12px" }}>
        実際のポジション発注はこのスイッチで制御します。無効の間も価格・インジケータは継続更新されます。
      </p>
      <button
        type="button"
        onClick={handleToggle}
        disabled={mutation.isPending}
        style={{
          backgroundColor: tradingActive ? "#dc2626" : "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px 16px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {tradingActive ? "停止する" : "開始する"}
      </button>
      <span style={{ marginLeft: "12px", fontSize: "14px", opacity: 0.8 }}>
        現在: {tradingActive ? "稼働中" : "停止中"}
      </span>
      <div style={statusRow}>
        <StatusPill
          label="WebSocket"
          value={connected ? "接続中" : "未接続"}
          tone={connected ? "good" : "warn"}
        />
        <StatusPill
          label="ブラックアウト"
          value={blackoutActive ? "停止中" : "稼働中"}
          tone={blackoutActive ? "warn" : "good"}
        />
        <div style={latestSignalBox}>
          <strong style={{ fontSize: "12px", opacity: 0.75 }}>直近シグナル</strong>
          <span style={{ fontSize: "14px" }}>
            {latestSignal
              ? `${latestSignalLabel} ${latestSignalDirection} ${latestSignalPrice}`
              : "受信待ち"}
          </span>
          {latestSignalTime && (
            <span style={{ fontSize: "12px", opacity: 0.6 }}>受信: {latestSignalTime}</span>
          )}
        </div>
      </div>
      {mutation.isError && (
        <p style={{ color: "#f87171", marginTop: "12px" }}>更新に失敗しました。もう一度お試しください。</p>
      )}
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

const statusRow: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  marginTop: "16px",
  flexWrap: "wrap",
};

type Tone = "good" | "warn" | "neutral";

const toneColors: Record<Tone, { bg: string; fg: string; border: string }> = {
  good: { bg: "rgba(34,197,94,0.15)", fg: "#4ade80", border: "rgba(34,197,94,0.4)" },
  warn: { bg: "rgba(248,113,113,0.15)", fg: "#f87171", border: "rgba(248,113,113,0.4)" },
  neutral: { bg: "rgba(148,163,184,0.15)", fg: "#cbd5f5", border: "rgba(148,163,184,0.4)" },
};

const StatusPill = ({ label, value, tone }: { label: string; value: string; tone: Tone }) => {
  const palette = toneColors[tone];
  return (
    <span
      style={{
        backgroundColor: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: "999px",
        padding: "6px 12px",
        fontSize: "12px",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <strong style={{ fontWeight: 600 }}>{label}</strong>
      <span>{value}</span>
    </span>
  );
};

const latestSignalBox: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  backgroundColor: "rgba(15,23,42,0.4)",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(148,163,184,0.2)",
  minWidth: "160px",
};
