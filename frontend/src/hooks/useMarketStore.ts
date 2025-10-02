import { create } from "zustand";

export type TickerPayload = Record<string, unknown>;
export type SignalPayload = Record<string, unknown>;
export type CandlePayload = Record<string, unknown> & { timeframe?: string };
export type IndicatorPayload = Record<string, unknown> & { timeframe?: string };
export type PositionEventPayload = Record<string, unknown> & { type?: string; symbol?: string };
export type PositionSnapshotPayload = Record<string, unknown> & { symbol?: string };

type StrategyHistoryMap = Record<string, { label: string; events: SignalPayload[] }>;

type Payload =
  | { type: "ticker"; data: TickerPayload }
  | { type: "signal"; data: SignalPayload }
  | { type: "candle"; data: CandlePayload }
  | { type: "indicator"; data: IndicatorPayload }
  | { type: "position"; data: PositionEventPayload };

type MarketState = {
  connected: boolean;
  latestTicker?: TickerPayload;
  candles: Record<string, CandlePayload>;
  indicators: Record<string, IndicatorPayload>;
  signals: SignalPayload[];
  strategyHistory: StrategyHistoryMap;
  positionEvents: PositionEventPayload[];
  openPositions: Record<string, PositionSnapshotPayload>;
  connect: () => void;
  disconnect: () => void;
  setOpenPositions: (positions: PositionSnapshotPayload[]) => void;
  setStrategyHistory: (history: StrategyHistoryMap) => void;
};

const WS_ENDPOINT = `${
  import.meta.env.VITE_API_BASE ?? "http://localhost:8001"
}/ws/prices`;

export const useMarketStore = create<MarketState>((set, get) => ({
  connected: false,
  candles: {},
  indicators: {},
  signals: [],
  strategyHistory: {},
  positionEvents: [],
  openPositions: {},
  setOpenPositions: (positions) =>
    set(() => ({
      openPositions: positions.reduce<Record<string, PositionSnapshotPayload>>((acc, item) => {
        if (typeof item.symbol === "string") {
          acc[item.symbol] = item;
        }
        return acc;
      }, {}),
    })),
  setStrategyHistory: (history) => set(() => ({ strategyHistory: history })),
  connect: () => {
    const socket = currentSocket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      return;
    }
    shouldReconnect = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      try {
        socket.close(1000, "Reconnecting");
      } catch (error) {
        console.error("Failed to close websocket before reconnect", error);
      }
    }

    const ws = new WebSocket(WS_ENDPOINT.replace(/^http/, "ws"));
    currentSocket = ws;
    set({ connected: false });

    ws.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      set({ connected: true });
    };
    ws.onclose = () => {
      if (currentSocket === ws) {
        currentSocket = null;
      }
      set({ connected: false });
      if (shouldReconnect) {
        scheduleReconnect();
      }
    };
    ws.onerror = () => {
      set({ connected: false });
      if (shouldReconnect) {
        scheduleReconnect();
      }
      try {
        ws.close();
      } catch (error) {
        console.error("Failed to close websocket after error", error);
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Payload;
        set((state) => {
          if (payload.type === "ticker") {
            return { ...state, latestTicker: payload.data };
          }
          if (payload.type === "candle") {
            const timeframe = String(payload.data.timeframe ?? "unknown");
            return {
              ...state,
              candles: { ...state.candles, [timeframe]: payload.data },
            };
          }
          if (payload.type === "indicator") {
            const timeframe = String(payload.data.timeframe ?? "unknown");
            return {
              ...state,
              indicators: { ...state.indicators, [timeframe]: payload.data },
            };
          }
          if (payload.type === "signal") {
            const strategyKey = String(payload.data.strategy ?? "unknown");
            const label = String(payload.data.strategy_name ?? payload.data.strategy ?? strategyKey);
            const current = state.strategyHistory[strategyKey]?.events ?? [];
            return {
              ...state,
              signals: [payload.data, ...state.signals].slice(0, 100),
              strategyHistory: {
                ...state.strategyHistory,
                [strategyKey]: {
                  label,
                  events: [payload.data, ...current].slice(0, 100),
                },
              },
            };
          }
          if (payload.type === "position") {
            const symbol = String(payload.data.symbol ?? "");
            const events = [payload.data, ...state.positionEvents].slice(0, 100);
            const openPositions = { ...state.openPositions };
            const eventType = String(payload.data.type ?? "").toUpperCase();
            if (symbol) {
              if (eventType === "OPEN") {
                openPositions[symbol] = payload.data;
              } else if (
                ["TAKE_PROFIT", "STOP_LOSS", "MANUAL_CLOSE", "REVERSE"].includes(eventType)
              ) {
                delete openPositions[symbol];
              }
            }
            return { ...state, positionEvents: events, openPositions };
          }
          return state;
        });
      } catch (error) {
        console.error("Failed to parse WS payload", error);
      }
    };
  },
  disconnect: () => {
    shouldReconnect = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    const ws = currentSocket;
    currentSocket = null;
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try {
        ws.close(1000, "Manual disconnect");
      } catch (error) {
        console.error("Failed to close websocket during manual disconnect", error);
      }
    }
    set({ connected: false });
  }
}));

let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let shouldReconnect = true;
let currentSocket: WebSocket | null = null;

function scheduleReconnect() {
  if (reconnectTimer || !shouldReconnect) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    useMarketStore.getState().connect();
  }, 3000);
}
