import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchTradingConfig, updateTradingConfig } from "../services/api";

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
  });

  useEffect(() => {
    if (data) {
      setForm({
        lot_size: data.lot_size,
        stop_loss_pips: data.stop_loss_pips,
        take_profit_pips: data.take_profit_pips,
      });
    }
  }, [data]);

  const handleChange = (key: "lot_size" | "stop_loss_pips" | "take_profit_pips") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: Number(event.target.value) }));
    };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading || !data) {
    return <p style={{ opacity: 0.7 }}>設定取得中...</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
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
