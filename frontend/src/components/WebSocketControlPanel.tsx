import React from "react";

import { useMarketStore } from "../hooks/useMarketStore";

export const WebSocketControlPanel = () => {
  const connected = useMarketStore((state) => state.connected);
  const connect = useMarketStore((state) => state.connect);
  const disconnect = useMarketStore((state) => state.disconnect);

  const handleClick = () => {
    if (connected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div style={cardStyle}>
      <h2 style={sectionTitle}>WebSocket 接続</h2>
      <p style={{ opacity: 0.7, marginBottom: "12px" }}>
        データストリームの手動接続／切断を制御します。切断中でも過去データは保持されますが、リアルタイム更新は停止します。
      </p>
      <button
        type="button"
        onClick={handleClick}
        style={{
          backgroundColor: connected ? "#dc2626" : "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px 16px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {connected ? "切断" : "接続"}
      </button>
      <span style={{ marginLeft: "12px", fontSize: "14px", opacity: 0.8 }}>
        状態: {connected ? "接続中" : "未接続"}
      </span>
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
