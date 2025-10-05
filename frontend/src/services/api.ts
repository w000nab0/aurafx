const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8001";

export type BlackoutWindow = {
  start: string;
  end: string;
};

export type TradingConfig = {
  pip_size: number;
  lot_size: number;
  stop_loss_pips: number;
  take_profit_pips: number;
  fee_rate: number;
  trading_active: boolean;
  trend_sma_period: number;
  trend_threshold_pips: number;
  atr_threshold_pips: number;
  blackout_windows: BlackoutWindow[];
  blackout_active: boolean;
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
  open_fee?: number;
  fee_rate?: number;
  strategy?: string;
};

export type SignalHistoryEvent = {
  strategy: string;
  strategy_name: string;
  symbol: string;
  timeframe: string;
  direction: string;
  trade_action?: string;
  price: number;
  occurred_at: string;
  indicator_timestamp: string;
  close: number;
  sma: Record<string, number | null>;
  rsi: Record<string, number | null>;
  rci: Record<string, number | null>;
  bb: Record<string, Record<string, number | null>>;
  trend: Record<string, unknown>;
  pnl?: number;
  pips?: number;
};

export type SignalHistoryGroup = {
  strategy: string;
  strategy_name: string;
  events: SignalHistoryEvent[];
};

export async function fetchTradingConfig(): Promise<TradingConfig> {
  const res = await fetch(`${API_BASE}/api/trading/config`);
  if (!res.ok) throw new Error("Failed to fetch trading config");
  return res.json();
}

export async function updateTradingConfig(
  config: Partial<TradingConfig>
): Promise<TradingConfig> {
  const res = await fetch(`${API_BASE}/api/trading/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to update trading config");
  return res.json();
}

export async function updateTradingState(active: boolean): Promise<TradingConfig> {
  return updateTradingConfig({ trading_active: active });
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

export async function fetchSignalHistory(): Promise<SignalHistoryGroup[]> {
  const res = await fetch(`${API_BASE}/api/trading/signals/history`);
  if (!res.ok) throw new Error("Failed to fetch signal history");
  return res.json();
}
