import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchTradingConfig,
  updateTradingConfig,
  type BlackoutWindow,
} from "../services/api";
import { useMarketStore } from "../hooks/useMarketStore";

const formatJst = (date: Date) =>
  date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const TradingConfigForm = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["trading-config"], queryFn: fetchTradingConfig });
  const mutation = useMutation({
    mutationFn: updateTradingConfig,
    onSuccess: (config) => {
      queryClient.setQueryData(["trading-config"], config);
    },
  });

  const [form, setForm] = useState({
    lot_size: data?.lot_size ?? 100,
    stop_loss_pips: data?.stop_loss_pips ?? 20,
    take_profit_pips: data?.take_profit_pips ?? 40,
    trend_sma_period: data?.trend_sma_period ?? 21,
    trend_threshold_pips: data?.trend_threshold_pips ?? 1.5,
  });
  const [blackoutWindows, setBlackoutWindows] = useState<BlackoutWindow[]>(
    data?.blackout_windows ?? []
  );
  const { connected, signals } = useMarketStore((state) => ({
    connected: state.connected,
    signals: state.signals,
  }));
  const [jstNow, setJstNow] = useState(() => formatJst(new Date()));

  useEffect(() => {
    if (data) {
      setForm({
        lot_size: data.lot_size,
        stop_loss_pips: data.stop_loss_pips,
        take_profit_pips: data.take_profit_pips,
        trend_sma_period: data.trend_sma_period,
        trend_threshold_pips: data.trend_threshold_pips,
      });
      setBlackoutWindows(data.blackout_windows);
    }
  }, [data]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setJstNow(formatJst(new Date()));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleChange = (
    key:
      | "lot_size"
      | "stop_loss_pips"
      | "take_profit_pips"
      | "trend_sma_period"
      | "trend_threshold_pips"
  ) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: Number(event.target.value) }));
    };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate({ ...form, blackout_windows: blackoutWindows });
  };

  const handleBlackoutChange = (index: number, key: "start" | "end") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setBlackoutWindows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [key]: value };
        return next;
      });
    };

  const handleAddWindow = () => {
    setBlackoutWindows((prev) => [...prev, { start: "", end: "" }]);
  };

  const handleRemoveWindow = (index: number) => () => {
    setBlackoutWindows((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading || !data) {
    return <p style={{ opacity: 0.7 }}>設定取得中...</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
      <div style={statusBanner}>
        <div style={statusColumn}>
          <span style={statusLabel}>JST 現在時刻</span>
          <span style={statusValue}>{jstNow}</span>
        </div>
        <div style={statusColumn}>
          <span style={statusLabel}>ブラックアウト状態</span>
          <span
            style={{
              ...statusValue,
              color: data.blackout_active ? "#f87171" : "#4ade80",
            }}
          >
            {data.blackout_active ? "停止中" : "稼働中"}
          </span>
        </div>
        <div style={statusColumn}>
          <span style={statusLabel}>WebSocket</span>
          <span style={statusValue}>{connected ? "接続中" : "未接続"}</span>
        </div>
        <div style={{ ...statusColumn, minWidth: "180px" }}>
          <span style={statusLabel}>直近シグナル</span>
          <span style={statusValue}>
            {signals[0]
              ? `${String(signals[0].strategy_name ?? signals[0].strategy ?? "シグナル")} ${String(
                  signals[0].direction ?? ""
                )} ${String(signals[0].price ?? "")}`
              : "受信待ち"}
          </span>
        </div>
      </div>
      <div style={row}>
        <label style={label}>Lot数 (最小100)</label>
        <input
          type="number"
          min={100}
          step={100}
          value={form.lot_size}
          onChange={handleChange("lot_size")}
          style={input}
        />
      </div>
      <div style={row}>
        <label style={label}>損切り (pips)</label>
        <input
          type="number"
          min={1}
          value={form.stop_loss_pips}
          onChange={handleChange("stop_loss_pips")}
          style={input}
        />
      </div>
      <div style={row}>
        <label style={label}>利確 (pips)</label>
        <input
          type="number"
          min={1}
          value={form.take_profit_pips}
          onChange={handleChange("take_profit_pips")}
          style={input}
        />
      </div>
      <div style={row}>
        <label style={label}>トレンドSMA期間</label>
        <input
          type="number"
          min={1}
          value={form.trend_sma_period}
          onChange={handleChange("trend_sma_period")}
          style={input}
        />
      </div>
      <div style={row}>
        <label style={label}>トレンドしきい値 (pips)</label>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={form.trend_threshold_pips}
          onChange={handleChange("trend_threshold_pips")}
          style={input}
        />
      </div>
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px" }}>ブラックアウト時間帯 (新規シグナル停止)</span>
          <button type="button" onClick={handleAddWindow} style={secondaryButton}>
            時間帯を追加
          </button>
        </div>
        {blackoutWindows.length === 0 && (
          <p style={{ opacity: 0.7, fontSize: "13px" }}>時間帯を追加すると自動売買を一時停止できます。</p>
        )}
        {blackoutWindows.map((window, index) => (
          <div key={index} style={blackoutRow}>
            <input
              type="time"
              value={window.start}
              onChange={handleBlackoutChange(index, "start")}
              style={input}
              required
            />
            <span style={{ color: "rgba(255,255,255,0.7)" }}>〜</span>
            <input
              type="time"
              value={window.end}
              onChange={handleBlackoutChange(index, "end")}
              style={input}
              required
            />
            <button type="button" onClick={handleRemoveWindow(index)} style={dangerButton}>
              削除
            </button>
          </div>
        ))}
      </div>
      <div style={row}>
        <label style={label}>Pipサイズ</label>
        <input type="number" value={data.pip_size} disabled style={input} />
      </div>
      <div style={row}>
        <label style={label}>手数料率 (%)</label>
        <input type="number" value={data.fee_rate * 100} disabled style={input} />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "8px 12px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        保存
      </button>
      {mutation.isSuccess && <p style={{ color: "#4ade80" }}>更新しました</p>}
      {mutation.isError && <p style={{ color: "#f87171" }}>更新に失敗しました</p>}
    </form>
  );
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const statusBanner: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  padding: "12px",
  borderRadius: "10px",
  backgroundColor: "rgba(15,23,42,0.5)",
  border: "1px solid rgba(148,163,184,0.25)",
};

const statusColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const statusLabel: React.CSSProperties = {
  fontSize: "12px",
  opacity: 0.65,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const statusValue: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
};

const blackoutRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const label: React.CSSProperties = {
  flex: "0 0 140px",
  fontSize: "14px",
};

const input: React.CSSProperties = {
  flex: 1,
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.2)",
  backgroundColor: "rgba(15,23,42,0.6)",
  color: "white",
};

const secondaryButton: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "1px solid rgba(255,255,255,0.4)",
  color: "white",
  borderRadius: "6px",
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: "12px",
};

const dangerButton: React.CSSProperties = {
  backgroundColor: "rgba(248,113,113,0.2)",
  border: "1px solid rgba(248,113,113,0.8)",
  color: "#f87171",
  borderRadius: "6px",
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: "12px",
};
