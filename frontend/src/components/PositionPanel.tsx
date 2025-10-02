import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useEffect } from "react";
import { closePosition, fetchPositions, type PositionSnapshot } from "../services/api";
import { useMarketStore } from "../hooks/useMarketStore";

const EMPTY_POSITIONS: PositionSnapshot[] = [];

export const PositionPanel = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<PositionSnapshot[], Error, PositionSnapshot[], ["positions"]>({
    queryKey: ["positions"],
    queryFn: fetchPositions,
    refetchInterval: 5_000,
  });

  const mutation = useMutation({
    mutationFn: (symbol: string) => closePosition(symbol),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
  const openPositions = useMarketStore((state) => state.openPositions);

  const setOpenPositions = useMarketStore((state) => state.setOpenPositions);

  const positionsData = data ?? EMPTY_POSITIONS;

  useEffect(() => {
    setOpenPositions(positionsData);
  }, [positionsData, setOpenPositions]);

  const positions = (positionsData.length > 0
    ? positionsData
    : Object.values(openPositions)) as Array<Record<string, any>>;

  if (isLoading) {
    return <p style={{ opacity: 0.7 }}>ポジション読込み中...</p>;
  }

  if (positions.length === 0) {
    return <p style={{ opacity: 0.7 }}>現在保有中のポジションはありません。</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
      <thead>
        <tr>
          <th style={header}>シンボル</th>
          <th style={header}>方向</th>
          <th style={header}>数量</th>
          <th style={header}>建値</th>
          <th style={header}>損切り</th>
          <th style={header}>利確</th>
          <th style={header}>現在値</th>
          <th style={header}>評価損益</th>
          <th style={header}>建玉時刻</th>
          <th style={header}>手数料(発生済)</th>
          <th style={header}></th>
        </tr>
      </thead>
      <tbody>
        {positions.map((position) => {
          const symbol = String(position.symbol);
          const handleClose = () => mutation.mutate(symbol);
          return (
            <tr key={symbol}>
              <td style={cell}>{symbol}</td>
              <td style={cell}>{position.direction}</td>
              <td style={cell}>{formatNumber(position.lot_size, 0)}</td>
              <td style={cell}>{formatNumber(position.entry_price)}</td>
              <td style={cell}>{formatNumber(position.stop_loss)}</td>
              <td style={cell}>{formatNumber(position.take_profit)}</td>
              <td style={cell}>{formatNumber(position.last_price)}</td>
              <td style={{ ...cell, color: (position.unrealized_pnl ?? 0) >= 0 ? "#4ade80" : "#f87171" }}>
                {formatNumber(position.unrealized_pnl, 2)}
              </td>
              <td style={cell}>{new Date(position.opened_at).toLocaleTimeString()}</td>
              <td style={cell}>{formatNumber(position.open_fee ?? 0)}</td>
              <td style={cell}>
                <button
                  onClick={handleClose}
                  disabled={mutation.isPending}
                  style={{
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                >
                  クローズ
                </button>
              </td>
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
