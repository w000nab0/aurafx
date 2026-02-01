"use client";

import { motion } from "framer-motion";
import { Activity, LayoutDashboard, Settings, History, Power } from "lucide-react";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-8 py-12 relative z-10">
      {/* Header */}
      <header className="flex justify-between items-center mb-16">
        <div className="flex flex-col">
          <h1 className="text-4xl font-serif font-light text-primary tracking-wider">aurafx</h1>
          <p className="text-xs text-foreground/40 mt-1 uppercase tracking-[0.2em]">Silent Automation</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-foreground/60 backdrop-blur-md bg-white/5 px-6 py-3 rounded-full border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>GMO Coin Connected</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-primary opacity-80">Bal:</span>
            <span className="text-foreground">¥1,245,670</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column - Performance */}
        <section className="col-span-8 space-y-8">
          <div className="glass-card p-10 h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-serif opacity-80 italic">Performance Chart</h2>
              <div className="flex gap-2">
                {['1H', '1D', '1W', '1M'].map(t => (
                  <button key={t} className="text-[10px] px-3 py-1 rounded-full border border-white/5 hover:bg-white/5 transition-colors uppercase tracking-widest">{t}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 rounded-2xl border border-white/5 bg-black/20 overflow-hidden relative">
              {/* プレースホルダーのチャートイメージ */}
              <div className="absolute inset-x-0 bottom-10 h-32 flex items-end px-12 gap-1">
                {[40, 45, 42, 48, 55, 52, 60, 65, 62, 70, 75, 72, 80, 85, 90].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-primary/20 to-primary/0 rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {[
              { label: "Today's P/L", value: "+¥12,450", color: "text-emerald-400" },
              { label: "Open P/L", value: "-¥3,200", color: "text-rose-400" },
              { label: "Equity", value: "¥1,242,470", color: "text-primary" }
            ].map((stat, i) => (
              <div key={i} className="glass-card p-6 border-white/10 glow-gold">
                <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">{stat.label}</p>
                <p className={`text-2xl font-serif ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column - Active Strategies */}
        <section className="col-span-4 space-y-8">
          <div className="flex justify-between items-center px-4">
            <h2 className="text-xl font-serif italic">Strategies</h2>
            <button className="text-xs text-primary/80 hover:text-primary">+ Add New</button>
          </div>

          <div className="space-y-4">
            {[
              { pair: "USD/JPY", type: "Buy Loop", profit: "+¥8,200", status: "Running" },
              { pair: "EUR/JPY", type: "Sell Loop", profit: "+¥4,250", status: "Running" }
            ].map((strat, i) => (
              <motion.div
                whileHover={{ y: -4 }}
                key={i}
                className="glass-card p-6 py-8 border-white/10 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-serif">{strat.pair}</h3>
                    <p className="text-[10px] text-foreground/40 uppercase tracking-widest">{strat.type}</p>
                  </div>
                  <Power size={14} className="text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-[10px] text-primary/60">
                    Grid: 148.5 - 152.0
                  </div>
                  <div className="text-sm font-medium text-emerald-400">
                    {strat.profit}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Activity Log */}
          <div className="glass-card p-6 bg-black/40 h-[220px]">
            <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-4">Activity Log</p>
            <div className="font-mono text-[9px] text-foreground/30 space-y-2 overflow-y-auto h-[140px] leading-relaxed">
              <p>[15:02:12] USD/JPY: Buy order filled at 149.23</p>
              <p>[15:02:14] System: Risk filter check passed</p>
              <p>[14:58:05] EUR/JPY: Profit taken at 162.45</p>
              <p>[14:45:00] Server: Connection refreshed</p>
            </div>
          </div>
        </section>
      </div>

      {/* Sidebar Navigation (Mock) */}
      <nav className="fixed left-8 top-1/2 -translate-y-1/2 flex flex-col gap-8 text-foreground/20">
        <LayoutDashboard className="text-primary cursor-pointer" size={20} />
        <Activity size={20} className="hover:text-foreground/40 cursor-pointer transition-colors" />
        <History size={20} className="hover:text-foreground/40 cursor-pointer transition-colors" />
        <Settings size={20} className="hover:text-foreground/40 cursor-pointer transition-colors" />
      </nav>
    </main>
  );
}
