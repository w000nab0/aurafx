import { create } from "zustand";

export type TickerPayload = {
  type: "ticker";
  data: Record<string, unknown>;
};

export type SignalPayload = {
  type: "signal";
  data: Record<string, unknown>;
};

type Payload = TickerPayload | SignalPayload;

type MarketState = {
  connected: boolean;
  latestTicker?: Record<string, unknown>;
  signals: SignalPayload["data"][];
  connect: () => void;
};

const WS_ENDPOINT = `${
  import.meta.env.VITE_API_BASE ?? "http://localhost:8000"
}/ws/prices`;

export const useMarketStore = create<MarketState>((set, get) => ({
  connected: false,
  signals: [],
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
        if (payload.type === "ticker") {
          set({ latestTicker: payload.data });
        }
        if (payload.type === "signal") {
          set((state) => ({ signals: [payload.data, ...state.signals].slice(0, 100) }));
        }
      } catch (error) {
        console.error("Failed to parse WS payload", error);
      }
    };
  }
}));
