import { useEffect, useState, type CSSProperties } from "react";

import { useMarketStore } from "./hooks/useMarketStore";
import { PriceTicker } from "./components/PriceTicker";
import { IndicatorPanel } from "./components/IndicatorPanel";
import { CandleTable } from "./components/CandleTable";
import { PositionPanel } from "./components/PositionPanel";
import { TradingConfigForm } from "./components/TradingConfigForm";
import { StrategyAnalysisPanel } from "./components/StrategyHistoryPanel";
import { TradingControlPanel } from "./components/TradingControlPanel";
import { WebSocketControlPanel } from "./components/WebSocketControlPanel";

const containerStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#0f172a",
  color: "#e2e8f0",
  padding: "32px",
  fontFamily: "Inter, system-ui, sans-serif",
};

const cardStyle: CSSProperties = {
  backgroundColor: "#1e293b",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.35)",
};

const sectionTitle: CSSProperties = {
  fontSize: "18px",
  marginBottom: "12px",
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  marginTop: "16px",
};

const tabButtonStyle: CSSProperties = {
  backgroundColor: "rgba(30, 41, 59, 0.8)",
  border: "1px solid rgba(148, 163, 184, 0.3)",
  color: "#e2e8f0",
  padding: "8px 16px",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 600,
};

function App(): JSX.Element {
  const { connect } = useMarketStore();
  const [activeView, setActiveView] = useState<"monitor" | "analysis">("monitor");

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div style={containerStyle}>
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <header style={cardStyle}>
          <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>AuraFX Dashboard</h1>
          <p style={{ opacity: 0.7, fontSize: "15px" }}>
            運用状況のモニタリングとロジック別の分析を切り替えて確認できます。
          </p>
          <div style={tabBarStyle}>
            <button
              type="button"
              style={{
                ...tabButtonStyle,
                backgroundColor:
                  activeView === "monitor" ? "#2563eb" : tabButtonStyle.backgroundColor,
              }}
              onClick={() => setActiveView("monitor")}
            >
              モニタリング
            </button>
            <button
              type="button"
              style={{
                ...tabButtonStyle,
                backgroundColor:
                  activeView === "analysis" ? "#2563eb" : tabButtonStyle.backgroundColor,
              }}
              onClick={() => setActiveView("analysis")}
            >
              ロジック分析
            </button>
          </div>
        </header>

        {activeView === "monitor" ? (
          <div style={{ display: "grid", gap: "24px" }}>
            <div style={cardStyle}>
              <PriceTicker />
            </div>
            <div style={cardStyle}>
              <h2 style={sectionTitle}>ポジション設定</h2>
              <TradingConfigForm />
            </div>
            <TradingControlPanel />
            <WebSocketControlPanel />
            <div style={cardStyle}>
              <h2 style={sectionTitle}>保有ポジション</h2>
              <PositionPanel />
            </div>
            <div style={cardStyle}>
              <h2 style={sectionTitle}>最新インジケータ</h2>
              <IndicatorPanel />
            </div>
            <div style={cardStyle}>
              <h2 style={sectionTitle}>最新足データ</h2>
              <CandleTable />
            </div>
          </div>
        ) : (
          <StrategyAnalysisPanel />
        )}
      </div>
    </div>
  );
}

export default App;
