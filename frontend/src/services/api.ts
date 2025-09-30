const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8001";

export type TradingConfig = {
  pip_size: number;
  lot_size: number;
  stop_loss_pips: number;
  take_profit_pips: number;
};

export type PositionSnapshot = {
  symbol: string;
  direction: string;
  entry_price: number;
  lot_size: number;
  stop_loss: number;
  take_profit: number;
  opened_at: string;
  last_price: number;
  unrealized_pnl: number;
};

export async function fetchTradingConfig(): Promise<TradingConfig> {
  const res = await fetch(`${API_BASE}/api/trading/config`);
  if (!res.ok) throw new Error("Failed to fetch trading config");
  return res.json();
}

export async function updateTradingConfig(config: Partial<TradingConfig>): Promise<TradingConfig> {
  const res = await fetch(`${API_BASE}/api/trading/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to update trading config");
  return res.json();
}

export async function fetchPositions(): Promise<PositionSnapshot[]> {
  const res = await fetch(`${API_BASE}/api/trading/positions`);
  if (!res.ok) throw new Error("Failed to fetch positions");
  return res.json();
}

export async function closePosition(symbol: string) {
  const res = await fetch(`${API_BASE}/api/trading/positions/${symbol}/close`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to close position");
  return res.json();
}
