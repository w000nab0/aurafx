"use client";

import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, DollarSign, BarChart3, Filter, Globe } from "lucide-react";
import { useState } from "react";

interface PerformanceViewProps {
  onBack: () => void;
}

export default function PerformanceView({ onBack }: PerformanceViewProps) {
  const [filter, setFilter] = useState('ALL');

  const strategies = [
    { id: 'USDJPY_BUY', name: 'USD/JPY Buy Loop', p_factor: 1.84, win_rate: '68.4%', profit: '+¥42,500' },
    { id: 'EURJPY_SELL', name: 'EUR/JPY Sell Loop', p_factor: 1.52, win_rate: '62.1%', profit: '+¥18,200' },
  ];

  const history = [
    { id: 1, strategy: 'USD/JPY Buy Loop', pair: "USD/JPY", type: "Buy", price: "149.23", pl: "+¥1,200", status: "Closed", time: "2026-02-01 15:02" },
    { id: 2, strategy: 'EUR/JPY Sell Loop', pair: "EUR/JPY", type: "Sell", price: "162.45", pl: "+¥2,450", status: "Closed", time: "2026-02-01 14:58" },
    { id: 3, strategy: 'USD/JPY Buy Loop', pair: "USD/JPY", type: "Buy", price: "148.95", pl: "-¥800", status: "Closed", time: "2026-02-01 14:30" },
    { id: 4, strategy: 'USD/JPY Buy Loop', pair: "USD/JPY", type: "Buy", price: "149.10", pl: "+¥1,500", status: "Closed", time: "2026-02-01 14:15" },
    { id: 5, strategy: 'GBP/JPY Meta', pair: "GBP/JPY", type: "Sell", price: "189.40", pl: "+¥4,200", status: "Closed", time: "2026-02-01 13:45" },
  ];

  const filteredHistory = filter === 'ALL' ? history : history.filter(h => h.strategy.includes(filter));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-7xl mx-auto px-8 py-16 relative z-10"
    >
      <header className="flex items-center gap-10 mb-20">
        <button
          onClick={onBack}
          className="p-4 rounded-full border border-white/10 hover:bg-white/10 text-primary transition-colors shadow-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-5xl font-serif font-light text-primary tracking-tight">Performance Analysis</h1>
          <p className="text-sm text-foreground/40 mt-1 uppercase tracking-[0.3em]">Historical Data & Account Insights</p>
        </div>
      </header>

      {/* Selector Grid */}
      <section className="grid grid-cols-3 gap-10 mb-16">
        {/* ALL ACCOUNT CARD */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => setFilter('ALL')}
          className={`glass-card p-8 cursor-pointer border-primary/20 transition-all shadow-xl flex flex-col justify-between ${filter === 'ALL' ? 'bg-primary/10 border-primary/60 glow-gold' : 'hover:bg-white/5 opacity-60'}`}
        >
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-primary" />
              <h3 className="text-xl font-serif italic text-primary">All Account</h3>
            </div>
            <div className="text-emerald-400 font-mono text-lg">+¥64,950</div>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-xs uppercase tracking-widest text-foreground/40">Consolidated View</span>
            <span className="text-[10px] px-3 py-1 rounded-full bg-primary/20 text-primary font-bold uppercase tracking-tighter">Active</span>
          </div>
        </motion.div>

        {strategies.map((s) => (
          <motion.div
            whileHover={{ y: -4 }}
            key={s.id}
            onClick={() => setFilter(s.name.includes('USD') ? 'USD' : 'EUR')}
            className={`glass-card p-8 cursor-pointer border-primary/10 transition-all shadow-xl ${filter !== 'ALL' && s.name.includes(filter) ? 'bg-primary/5 border-primary/40 glow-gold' : 'hover:bg-white/5 opacity-80'}`}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-serif italic text-primary">{s.name}</h3>
              <div className="text-emerald-400 font-mono text-lg">{s.profit}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">PF</p>
                <p className="text-base font-mono">{s.p_factor}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-foreground/30 uppercase tracking-widest mb-1">Win Rate</p>
                <p className="text-base font-mono text-primary">{s.win_rate}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-12 gap-10">
        {/* Statistics Grid */}
        <section className="col-span-4 space-y-10">
          <div className="glass-card p-10 space-y-10 shadow-2xl">
            <h2 className="text-2xl font-serif italic text-primary/90">Selected Metrics</h2>

            <div className="space-y-8">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-4 text-foreground/40">
                  <TrendingUp size={20} />
                  <span className="text-base">Profit Factor</span>
                </div>
                <span className="font-mono text-emerald-400 text-xl font-bold">{filter === 'ALL' ? '1.72' : (filter === 'USD' ? '1.84' : '1.52')}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-4 text-foreground/40">
                  <BarChart3 size={20} />
                  <span className="text-base">Win Rate</span>
                </div>
                <span className="font-mono text-primary text-xl font-bold">{filter === 'ALL' ? '64.1%' : (filter === 'USD' ? '68.4%' : '62.1%')}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-4 text-foreground/40">
                  <DollarSign size={20} />
                  <span className="text-base">Net Profit</span>
                </div>
                <span className="font-mono text-emerald-400 text-xl font-bold">{filter === 'ALL' ? '¥64,950' : (filter === 'USD' ? '¥42,500' : '¥18,200')}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-10 bg-primary/5 border-primary/20 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Filter size={18} className="text-primary" />
              <p className="text-lg font-serif italic">View Context: {filter === 'ALL' ? 'Total Account' : filter}</p>
            </div>
            <p className="text-sm leading-relaxed text-foreground/60 italic">
              {filter === 'ALL'
                ? "This view aggregates all trade data from across your account, providing a holistic 'Order History' and performance report."
                : `Filtering detailed insights for ${filter} strategies. Analyzing risk-adjusted returns and efficiency.`
              }
            </p>
          </div>
        </section>

        {/* History Table */}
        <section className="col-span-8">
          <div className="glass-card p-12 min-h-[600px] shadow-2xl">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-serif italic text-primary/90">
                {filter === 'ALL' ? 'Global Order History' : 'Strategy Trade History'}
              </h2>
              <button className="text-[12px] px-6 py-2.5 rounded-full border border-white/10 hover:bg-white/10 uppercase tracking-widest text-foreground/40 font-bold transition-all">Download CSV</button>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-5 text-xs uppercase tracking-widest text-foreground/40 pb-6 border-b border-white/10 mb-8 px-6 font-bold">
                <span>Time / Strategy</span>
                <span className="text-center">Type</span>
                <span className="text-center">Entry Price</span>
                <span className="text-center">Status</span>
                <span className="text-right">Profit/Loss</span>
              </div>

              <div className="space-y-2">
                {filteredHistory.map((trade) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={trade.id}
                    className="grid grid-cols-5 items-center p-6 rounded-3xl hover:bg-white/5 transition-all text-base border border-transparent hover:border-white/5"
                  >
                    <div className="flex flex-col">
                      <span className="text-base font-serif text-primary truncate">{trade.strategy}</span>
                      <span className="text-[10px] text-foreground/30 font-mono tracking-wider mt-1">{trade.time}</span>
                    </div>
                    <div className="text-center">
                      <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase ${trade.type === 'Buy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {trade.type}
                      </span>
                    </div>
                    <div className="text-center font-mono text-sm opacity-70">
                      {trade.price}
                    </div>
                    <div className="text-center text-[10px] uppercase tracking-widest opacity-40 font-bold">
                      {trade.status}
                    </div>
                    <div className={`text-right font-serif text-xl ${trade.pl.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.pl}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
