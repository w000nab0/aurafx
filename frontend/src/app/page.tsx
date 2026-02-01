"use client";

import { motion } from "framer-motion";
import { Activity, LayoutDashboard, Settings, Power } from "lucide-react";
import { useState } from "react";
import StrategySettingsModal from "@/components/StrategySettingsModal";
import PerformanceView from "@/components/PerformanceView";
import SettingsView from "@/components/SettingsView";

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'performance' | 'settings'>('dashboard');
  const [selectedStrategy, setSelectedStrategy] = useState<{ pair: string, type: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const strategies = [
    { pair: "USD/JPY", type: "Buy Loop", profit: "+¥8,200", status: "Running" },
    { pair: "EUR/JPY", type: "Sell Loop", profit: "+¥4,250", status: "Running" }
  ];

  const handleStrategyClick = (strat: any) => {
    setSelectedStrategy(strat);
    setIsModalOpen(true);
  };

  const renderView = () => {
    switch (view) {
      case 'performance':
        return <PerformanceView onBack={() => setView('dashboard')} />;
      case 'settings':
        return <SettingsView onBack={() => setView('dashboard')} />;
      default:
        return (
          <main className="max-w-7xl mx-auto px-8 py-16 relative z-10 min-h-screen">
            <StrategySettingsModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              strategy={selectedStrategy}
            />
            {/* Header */}
            <header className="flex justify-between items-center mb-20 px-4">
              <div className="flex flex-col">
                <h1 className="text-6xl font-serif font-light text-primary tracking-tighter">aurafx</h1>
                <p className="text-sm text-foreground/40 mt-1 uppercase tracking-[0.3em]">Silent Automation</p>
              </div>
              <div className="flex items-center gap-10 text-base text-foreground/60 backdrop-blur-md bg-white/5 px-10 py-5 rounded-full border border-white/5 shadow-2xl shadow-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                  <span>GMO Coin Connected</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="flex items-center gap-3">
                  <span className="text-primary opacity-80 text-lg">Bal:</span>
                  <span className="text-foreground font-mono text-2xl">¥1,245,670</span>
                </div>
              </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-12 px-4">
              {/* Left Column - Performance */}
              <section className="col-span-8 space-y-12">
                <div className="glass-card p-12 h-[500px] flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center mb-12">
                    <h2 className="text-2xl font-serif opacity-90 italic flex items-center gap-3 cursor-pointer" onClick={() => setView('performance')}>
                      Performance Overview
                      <Activity size={20} className="text-primary/40" />
                    </h2>
                    <div className="flex gap-3">
                      {['1H', '1D', '1W', '1M'].map(t => (
                        <button key={t} className="text-xs px-5 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors uppercase tracking-widest font-medium">{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 rounded-2xl border border-white/5 bg-black/30 overflow-hidden relative cursor-pointer group" onClick={() => setView('performance')}>
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                    <div className="absolute inset-x-0 bottom-12 h-40 flex items-end px-16 gap-2" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
                      {[40, 45, 42, 48, 55, 52, 60, 65, 62, 70, 75, 72, 80, 85, 90].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-primary/40 to-primary/0 rounded-t-sm" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-10">
                  {[
                    { label: "Today's P/L", value: "+¥12,450", color: "text-emerald-400" },
                    { label: "Open P/L", value: "-¥3,200", color: "text-rose-400" },
                    { label: "Equity", value: "¥1,242,470", color: "text-primary" }
                  ].map((stat, i) => (
                    <div key={i} className="glass-card p-10 border-white/10 glow-gold hover:border-primary/30 transition-all shadow-xl">
                      <p className="text-xs uppercase tracking-[0.2em] text-foreground/40 mb-4 font-semibold">{stat.label}</p>
                      <p className={`text-3xl font-serif tracking-tight ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Right Column - Active Strategies */}
              <section className="col-span-4 space-y-12">
                <div className="flex justify-between items-center px-4">
                  <h2 className="text-2xl font-serif italic opacity-90">Strategies</h2>
                  <button className="text-sm text-primary hover:text-accent transition-colors cursor-pointer font-medium">+ Add New</button>
                </div>

                <div className="space-y-6">
                  {strategies.map((strat, i) => (
                    <motion.div
                      whileHover={{ y: -6, scale: 1.02 }}
                      key={i}
                      className="glass-card p-10 py-12 border-white/10 cursor-pointer group hover:border-primary/40 transition-all shadow-xl"
                      onClick={() => handleStrategyClick(strat)}
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-2xl font-serif group-hover:text-primary transition-colors">{strat.pair}</h3>
                          <p className="text-xs text-foreground/40 uppercase tracking-widest mt-1">{strat.type}</p>
                        </div>
                        <Power size={20} className="text-primary group-hover:scale-125 transition-transform" />
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-primary/70 font-medium">
                          Grid: 148.5 - 152.0
                        </div>
                        <div className="text-xl font-serif text-emerald-400">
                          {strat.profit}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Activity Log */}
                <div className="glass-card p-10 bg-black/40 h-[280px] border-white/10 shadow-lg">
                  <p className="text-xs uppercase tracking-[0.15em] text-foreground/40 mb-6 font-bold">Activity Log</p>
                  <div className="font-mono text-sm text-foreground/40 space-y-4 overflow-y-auto h-[160px] leading-relaxed scrollbar-hide">
                    <p className="hover:text-foreground/60 transition-colors">[15:02:12] USD/JPY: Buy order filled at 149.23</p>
                    <p className="hover:text-foreground/60 transition-colors">[15:02:14] System: Risk filter check passed</p>
                    <p className="hover:text-foreground/60 transition-colors">[14:58:05] EUR/JPY: Profit taken at 162.45</p>
                    <p className="hover:text-foreground/60 transition-colors">[14:45:00] Server: Connection refreshed</p>
                  </div>
                </div>
              </section>
            </div>
          </main>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 pointer-events-none opacity-20 transition-all duration-700">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-colors duration-1000 ${view === 'settings' ? 'bg-rose-500/20' : 'bg-primary/20'}`} />
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-accent/10 blur-[100px] rounded-full" />
      </div>

      {renderView()}

      {/* Sidebar Navigation */}
      <nav className="fixed left-12 top-1/2 -translate-y-1/2 flex flex-col gap-12 text-foreground/20 z-20">
        <div onClick={() => setView('dashboard')}>
          <LayoutDashboard className={`cursor-pointer hover:scale-125 transition-all duration-300 ${view === 'dashboard' ? 'text-primary' : 'hover:text-foreground/40'}`} size={28} />
        </div>
        <div onClick={() => setView('performance')}>
          <Activity className={`cursor-pointer hover:scale-125 transition-all duration-300 ${view === 'performance' ? 'text-primary' : 'hover:text-foreground/40'}`} size={28} />
        </div>
        <div onClick={() => setView('settings')}>
          <Settings className={`cursor-pointer hover:scale-125 transition-all duration-300 ${view === 'settings' ? 'text-primary' : 'hover:text-foreground/40'}`} size={28} />
        </div>
      </nav>
    </div>
  );
}
