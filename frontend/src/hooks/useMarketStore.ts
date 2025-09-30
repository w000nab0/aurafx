import { create } from "zustand";

export type TickerPayload = Record<string, unknown>;
export type SignalPayload = Record<string, unknown>;
export type CandlePayload = Record<string, unknown> & { timeframe?: string };
export type IndicatorPayload = Record<string, unknown> & { timeframe?: string };
export type PositionEventPayload = Record<string, unknown> & { type?: string; symbol?: string };
export type PositionSnapshotPayload = Record<string, unknown> & { symbol?: string };

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
  positionEvents: PositionEventPayload[];
  openPositions: Record<string, PositionSnapshotPayload>;
  connect: () => void;
  setOpenPositions: (positions: PositionSnapshotPayload[]) => void;
};

const WS_ENDPOINT = `${
  import.meta.env.VITE_API_BASE ?? "http://localhost:8001"
}/ws/prices`;

export const useMarketStore = create<MarketState>((set, get) => ({
  connected: false,
  candles: {},
  indicators: {},
  signals: [],
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
  connect: () => {
    if (get().connected) {
      return;
    }

    const ws = new WebSocket(WS_ENDPOINT.replace(/^http/, "ws"));

    ws.onopen = () => set({ connected: true });
    ws.onclose = () => set({ connected: false });
    ws.onerror = () => set({ connected: false });

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
            return {
              ...state,
              signals: [payload.data, ...state.signals].slice(0, 100),
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
  }
}));
