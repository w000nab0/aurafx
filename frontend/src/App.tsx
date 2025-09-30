import { useEffect, type CSSProperties } from "react";

import { useMarketStore } from "./hooks/useMarketStore";
import { PriceTicker } from "./components/PriceTicker";
import { SignalList } from "./components/SignalList";
import { IndicatorPanel } from "./components/IndicatorPanel";
import { CandleTable } from "./components/CandleTable";
import { PositionPanel } from "./components/PositionPanel";
import { TradingConfigForm } from "./components/TradingConfigForm";

const containerStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#0f172a",
  color: "#e2e8f0",
  padding: "32px",
  fontFamily: "Inter, system-ui, sans-serif"
};

const cardStyle: CSSProperties = {
  backgroundColor: "#1e293b",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.35)"
};

const sectionTitle: CSSProperties = {
  fontSize: "18px",
  marginBottom: "12px",
};

function App(): JSX.Element {
  const { connect } = useMarketStore();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: "960px", margin: "0 auto", display: "grid", gap: "24px" }}>
        <header style={cardStyle}>
          <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>AuraFX Monitor</h1>
          <p style={{ opacity: 0.7, fontSize: "15px" }}>
            リアルタイムティックとシグナルを表示するダッシュボード（プロトタイプ）
          </p>
        </header>
        <div style={cardStyle}>
          <PriceTicker />
        </div>
        <div style={cardStyle}>
          <h2 style={sectionTitle}>ポジション設定</h2>
          <TradingConfigForm />
        </div>
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
        <div style={cardStyle}>
          <h2 style={sectionTitle}>シグナル履歴</h2>
          <SignalList />
        </div>
      </div>
    </div>
  );
}

export default App;
