"use client";

import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, DollarSign, History, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { useState } from "react";

interface PerformanceViewProps {
  onBack: () => void;
}

export default function PerformanceView({ onBack }: PerformanceViewProps) {
  const [filter, setFilter] = useState('ALL');
  const [tab, setTab] = useState<'history' | 'calendar'>('history');

  const strategies = [
    { id: 'USDJPY', name: 'USD/JPY', p_factor: 1.84, win_rate: '68.4%', profit: '+¥42,500' },
    { id: 'EURJPY', name: 'EUR/JPY', p_factor: 1.52, win_rate: '62.1%', profit: '+¥18,200' },
  ];

  // Mock calendar data
  const calendarData: Record<string, number> = {
    '2026-02-01': 12450,
    '2026-01-31': -3200,
    '2026-01-30': 8500,
    '2026-01-29': 15600,
    '2026-01-28': -1200,
    '2026-01-27': 4300,
    '2026-01-26': 0,
  };

  const renderCalendar = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-serif text-primary/80 italic">February 2026</h3>
            <div className="flex gap-2">
              <button className="p-1 hover:bg-white/5 rounded-full transition-colors text-foreground/40"><ChevronLeft size={20} /></button>
              <button className="p-1 hover:bg-white/5 rounded-full transition-colors text-foreground/40"><ChevronRight size={20} /></button>
            </div>
          </div>
          <div className="text-xs text-foreground/30 uppercase tracking-[0.2em]">Daily P/L Distribution</div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] uppercase tracking-widest text-foreground/20 font-bold pb-2">{d}</div>
          ))}
          <div className="aspect-square" />
          {days.map(day => {
            const dateStr = `2026-02-${day.toString().padStart(2, '0')}`;
            const profit = calendarData[dateStr] || 0;
            return (
              <motion.div
                whileHover={{ scale: 1.05 }}
                key={day}
                className={`aspect-square glass-card p-3 flex flex-col justify-between border-white/5 relative overflow-hidden group ${profit > 0 ? 'hover:border-emerald-500/30' : profit < 0 ? 'hover:border-rose-500/30' : ''}`}
              >
                <span className="text-xs font-mono text-foreground/30">{day}</span>
                {profit !== 0 ? (
                  <div className={`text-[10px] font-mono font-bold text-right ${profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {profit > 0 ? '+' : ''}{profit.toLocaleString()}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-foreground/10 text-right">-</div>
                )}
                {profit > 0 && <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                {profit < 0 && <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-7xl mx-auto px-8 py-16 relative z-10"
    >
      <header className="flex items-center gap-10 mb-16">
        <button
          onClick={onBack}
          className="p-4 rounded-full border border-white/10 hover:bg-white/10 text-primary transition-colors shadow-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-5xl font-serif font-light text-primary tracking-tight">Performance Analysis</h1>
          <p className="text-sm text-foreground/40 mt-1 uppercase tracking-[0.3em]">Account Insights & History</p>
        </div>
      </header>

      {/* Prominent Strategy Selector Grid */}
      <section className="grid grid-cols-3 gap-10 mb-16">
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => setFilter('ALL')}
          className={`glass-card p-10 cursor-pointer transition-all shadow-xl flex flex-col justify-between border-2 ${filter === 'ALL' ? 'bg-primary/10 border-primary/40 glow-gold' : 'bg-white/5 border-transparent opacity-60 hover:opacity-100'}`}
        >
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <Globe size={24} className="text-primary" />
              <h3 className="text-2xl font-serif italic text-primary">All Account</h3>
            </div>
            <div className="text-emerald-400 font-mono text-xl">+¥64,950</div>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/30">Total Portfolio Metrics</p>
        </motion.div>

        {strategies.map((s) => (
          <motion.div
            whileHover={{ y: -4 }}
            key={s.id}
            onClick={() => setFilter(s.name)}
            className={`glass-card p-10 cursor-pointer transition-all shadow-xl flex flex-col justify-between border-2 ${filter === s.name ? 'bg-primary/10 border-primary/40 glow-gold' : 'bg-white/5 border-transparent opacity-80 hover:opacity-100'}`}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-serif italic text-primary">{s.name}</h3>
              <div className="text-emerald-400 font-mono text-xl">{s.profit}</div>
            </div>
            <div className="flex gap-10">
              <div>
                <p className="text-[10px] text-foreground/20 uppercase tracking-widest mb-1">PF</p>
                <p className="text-lg font-mono text-foreground/60">{s.p_factor}</p>
              </div>
              <div>
                <p className="text-[10px] text-foreground/20 uppercase tracking-widest mb-1">Win Rate</p>
                <p className="text-lg font-mono text-primary/80">{s.win_rate}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-12 gap-12">
        {/* Left Stats & View Control */}
        <div className="col-span-4 space-y-10">
          <section className="glass-card p-10 border-white/5 bg-black/40 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-[0.3em] text-foreground/40 mb-6 font-bold">Monthly Performance</p>
              <p className="text-4xl font-serif text-primary">+¥452,800</p>
              <div className="flex items-center gap-2 text-emerald-400/60 text-sm italic mt-4">
                <TrendingUp size={16} />
                <span>+12.4% vs prev month</span>
              </div>
            </div>
            <div className="absolute -right-8 -top-8 text-primary/5">
              <DollarSign size={200} />
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setTab('history')}
              className={`w-full py-6 px-10 rounded-2xl border flex items-center justify-between transition-all group ${tab === 'history' ? 'bg-primary text-background shadow-primary/20 shadow-lg border-primary' : 'bg-white/5 border-white/5 text-foreground/40 hover:border-white/20 hover:text-foreground'}`}
            >
              <div className="flex items-center gap-4">
                <History size={20} />
                <span className="font-serif text-xl">History List</span>
              </div>
              <ChevronRight size={18} className={`transition-transform ${tab === 'history' ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
            </button>
            <button
              onClick={() => setTab('calendar')}
              className={`w-full py-6 px-10 rounded-2xl border flex items-center justify-between transition-all group ${tab === 'calendar' ? 'bg-primary text-background shadow-primary/20 shadow-lg border-primary' : 'bg-white/5 border-white/5 text-foreground/40 hover:border-white/20 hover:text-foreground'}`}
            >
              <div className="flex items-center gap-4">
                <CalendarIcon size={20} />
                <span className="font-serif text-xl">Profit Calendar</span>
              </div>
              <ChevronRight size={18} className={`transition-transform ${tab === 'calendar' ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="col-span-8">
          {tab === 'history' ? (
            <div className="glass-card p-12 border-white/5 shadow-2xl h-full flex flex-col min-h-[600px] animate-in fade-in duration-500">
              <div className="flex items-center gap-4 mb-12">
                <History size={24} className="text-primary/60" />
                <h2 className="text-3xl font-serif italic text-foreground/80">Order History: <span className="text-primary">{filter}</span></h2>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto pr-4 scrollbar-hide">
                {[1, 2, 3, 4, 5, 6].map((_, i) => (
                  <div key={i} className="flex justify-between items-center p-8 rounded-3xl bg-white/5 border border-transparent hover:border-primary/20 transition-all group">
                    <div className="flex items-center gap-8">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-sm ${i % 2 === 0 ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-rose-400/10 text-rose-400 border border-rose-400/20'}`}>
                        {i % 2 === 0 ? 'BUY' : 'SELL'}
                      </div>
                      <div>
                        <p className="text-xl font-serif text-foreground/90">{filter === 'ALL' ? 'USD/JPY' : filter}</p>
                        <p className="text-xs text-foreground/20 uppercase tracking-widest mt-2">2026-02-01 15:02:12</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-mono text-primary">¥{((i + 1) * 1230).toLocaleString()}</p>
                      <p className="text-xs text-emerald-400 uppercase tracking-widest mt-2">+12.4 pips</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 border-white/5 shadow-2xl h-full min-h-[600px]">
              {renderCalendar()}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
