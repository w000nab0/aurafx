"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Info, ShieldAlert, Trash2, Clock, Target, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";

interface StrategySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: {
    name?: string;
    pair: string;
    type: string;
  } | null;
}

export default function StrategySettingsModal({ isOpen, onClose, strategy }: StrategySettingsModalProps) {
  const [settings, setSettings] = useState({
    name: '',
    side: 'BUY',
    rangeHigh: 155.000,
    rangeLow: 145.000,
    step: 0.1,
    tp: 0.2,
    sl: 1.0,
    lotSize: 0.1,
    entryInterval: 15,
    exitInterval: 15,
    spreadLimit: 2.0,
    maxLots: 1.0,
    minMarginRatio: 300,
    autoExitEnabled: false,
    autoExitPrice: 0.0,
    autoExitTimeEnabled: false,
    autoExitTime: '',
  });

  useEffect(() => {
    if (strategy) {
      setSettings(prev => ({
        ...prev,
        name: strategy.name || (strategy.pair + ' Automation'),
        side: strategy.type.includes('Buy') ? 'BUY' : 'SELL'
      }));
    }
  }, [strategy]);

  const handleCloseAll = () => {
    if (confirm("即座にこのストラテジーの全ポジションを指定価格で成行決済します。よろしいですか？")) {
      alert("全ポジションの決済リクエストを送信しました。");
    }
  };

  if (!strategy) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl glass-card p-12 glow-gold border-primary/20 bg-[#1E2430] max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            <button
              onClick={onClose}
              className="absolute top-8 right-8 text-foreground/40 hover:text-foreground transition-colors"
            >
              <X size={24} />
            </button>

            <header className="mb-12">
              <h2 className="text-3xl font-serif text-primary mb-3">Strategy Configuration</h2>
              <p className="text-sm text-foreground/40 uppercase tracking-widest">
                Define logic for {strategy.pair}
              </p>
            </header>

            {/* Quick Actions Bar */}
            <div className="mb-12 p-6 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center group">
              <div className="flex flex-col">
                <span className="text-[10px] text-foreground/40 uppercase tracking-widest font-bold mb-1">Emergency Operations</span>
                <span className="text-sm text-foreground/60 italic">Force close all active positions</span>
              </div>
              <button
                onClick={handleCloseAll}
                className="px-6 py-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-sm font-serif hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 group-hover:glow-rose"
              >
                <CreditCard size={18} />
                Close All Positions
              </button>
            </div>

            <div className="grid grid-cols-2 gap-12">
              {/* Left Column: Name & Basic */}
              <div className="space-y-12">
                <section className="space-y-8">
                  <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-6 px-1 italic">Identity & Range</h3>

                  {/* Strategy Name */}
                  <div className="space-y-3">
                    <label className="text-[10px] text-foreground/30 uppercase tracking-widest">Strategy Name</label>
                    <input
                      type="text"
                      placeholder="e.g., USD/JPY Grid Master"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-primary outline-none focus:border-primary/40 font-serif italic"
                    />
                  </div>

                  {/* Side Selection */}
                  <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    {['BUY', 'SELL'].map(s => (
                      <button
                        key={s}
                        onClick={() => setSettings({ ...settings, side: s })}
                        className={`flex-1 py-3 rounded-lg text-sm font-serif transition-all ${settings.side === s ? 'bg-primary text-background' : 'text-foreground/40 hover:text-foreground'}`}
                      >
                        {s === 'BUY' ? 'Buy Loop' : 'Sell Loop'}
                      </button>
                    ))}
                  </div>

                  {/* Range Low/High */}
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-3">
                      <label className="text-[10px] text-foreground/30 uppercase">Range Low</label>
                      <input
                        type="number"
                        step="0.001"
                        value={settings.rangeLow}
                        onChange={(e) => setSettings({ ...settings, rangeLow: parseFloat(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base font-mono text-primary outline-none focus:border-primary/40"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <label className="text-[10px] text-foreground/30 uppercase">Range High</label>
                      <input
                        type="number"
                        step="0.001"
                        value={settings.rangeHigh}
                        onChange={(e) => setSettings({ ...settings, rangeHigh: parseFloat(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base font-mono text-primary outline-none focus:border-primary/40"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-8">
                  <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-6 px-1 italic">Grid Logic</h3>

                  {/* Lot Size */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-foreground/30 uppercase">
                      <span className="flex items-center gap-2">Order Lot Size <Info size={12} className="opacity-50" /></span>
                      <span className="text-primary text-sm">{settings.lotSize.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="10.0"
                      step="0.01"
                      value={settings.lotSize}
                      onChange={(e) => setSettings({ ...settings, lotSize: parseFloat(e.target.value) })}
                      className="w-full accent-primary bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Price Interval (Step) */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-foreground/30 uppercase">
                      <span className="flex items-center gap-2">Price Interval (Step) <Info size={12} className="opacity-50" /></span>
                      <span className="text-primary text-sm">{settings.step.toFixed(2)} pips</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="1.0"
                      step="0.01"
                      value={settings.step}
                      onChange={(e) => setSettings({ ...settings, step: parseFloat(e.target.value) })}
                      className="w-full accent-primary bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  {/* TP/SL Width */}
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-3">
                      <label className="text-[10px] text-foreground/30 uppercase">Take Profit (pips)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.tp}
                        onChange={(e) => setSettings({ ...settings, tp: parseFloat(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base font-mono text-emerald-400 outline-none focus:border-emerald-400/40"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <label className="text-[10px] text-foreground/30 uppercase">Stop Loss (pips)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.sl}
                        onChange={(e) => setSettings({ ...settings, sl: parseFloat(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base font-mono text-rose-400 outline-none focus:border-rose-400/40"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Advanced Terminations */}
              <div className="space-y-12">
                <section className="space-y-8">
                  <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-6 px-1 italic">Automated Termination</h3>

                  {/* Price Based Exit */}
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-[10px] text-foreground/40 uppercase tracking-widest font-bold">
                        <Target size={14} className="text-primary/60" />
                        Target Rate Stop
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoExitEnabled}
                        onChange={(e) => setSettings({ ...settings, autoExitEnabled: e.target.checked })}
                        className="w-4 h-4 accent-primary"
                      />
                    </div>
                    <div className={`transition-opacity duration-300 ${settings.autoExitEnabled ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="145.000"
                        value={settings.autoExitPrice}
                        onChange={(e) => setSettings({ ...settings, autoExitPrice: parseFloat(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-base font-mono text-primary outline-none focus:border-primary/40"
                      />
                      <p className="text-[9px] text-foreground/30 mt-2 italic text-right">指定レート到達時、全決済して停止</p>
                    </div>
                  </div>

                  {/* Time Based Exit */}
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-[10px] text-foreground/40 uppercase tracking-widest font-bold">
                        <Clock size={14} className="text-primary/60" />
                        Target Time Stop
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoExitTimeEnabled}
                        onChange={(e) => setSettings({ ...settings, autoExitTimeEnabled: e.target.checked })}
                        className="w-4 h-4 accent-primary"
                      />
                    </div>
                    <div className={`transition-opacity duration-300 ${settings.autoExitTimeEnabled ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                      <input
                        type="datetime-local"
                        value={settings.autoExitTime}
                        onChange={(e) => setSettings({ ...settings, autoExitTime: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-primary outline-none focus:border-primary/40"
                      />
                      <p className="text-[9px] text-foreground/30 mt-2 italic text-right">指定日時到達時、全決済して停止</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-8">
                  <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-6 px-1 italic">Account Protection</h3>

                  {/* Max Lots & Min Margin */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] text-foreground/30 uppercase">
                        <span>Max Holding Lots</span>
                        <span className="text-rose-400 font-mono text-sm">{settings.maxLots.toFixed(1)}</span>
                      </div>
                      <input
                        type="number" step="0.1"
                        value={settings.maxLots}
                        onChange={(e) => setSettings({ ...settings, maxLots: parseFloat(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base font-mono text-foreground/80 outline-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] text-foreground/30 uppercase">
                        <span className="flex items-center gap-1"><ShieldAlert size={12} /> Min Margin Ratio</span>
                        <span className="text-rose-400 font-mono text-sm">{settings.minMarginRatio}%</span>
                      </div>
                      <input
                        type="number" step="10"
                        value={settings.minMarginRatio}
                        onChange={(e) => setSettings({ ...settings, minMarginRatio: parseInt(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base font-mono text-foreground/80 outline-none"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <footer className="mt-16 pt-8 border-t border-white/5 flex flex-col gap-4">
              <button
                onClick={onClose}
                className="w-full py-5 bg-primary text-background font-serif text-xl rounded-2xl hover:bg-accent transition-colors shadow-lg shadow-primary/10"
              >
                Apply & Save Configuration
              </button>

              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 text-foreground/40 font-serif text-base hover:text-foreground transition-colors border border-white/5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirm("このストラテジーを削除しますか？持っているポジションは自動では決済されません（上の一括決済ボタンを使用してください）。")) {
                      onClose();
                    }
                  }}
                  className="px-6 py-4 text-rose-400/40 hover:text-rose-400 transition-colors border border-rose-400/10 hover:bg-rose-400/5 rounded-xl flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
