"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Info, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface StrategySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: {
    pair: string;
    type: string;
  } | null;
}

export default function StrategySettingsModal({ isOpen, onClose, strategy }: StrategySettingsModalProps) {
  const [settings, setSettings] = useState({
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
  });

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
              <h2 className="text-3xl font-serif text-primary mb-3">Detailed Strategy Settings</h2>
              <p className="text-sm text-foreground/40 uppercase tracking-widest">
                Configure parameters for {strategy.pair} automation
              </p>
            </header>

            <div className="grid grid-cols-2 gap-12">
              {/* Left Column: Basic & Logic */}
              <div className="space-y-12">
                <section className="space-y-8">
                  <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-6 px-1">Basic & Range</h3>

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
                    <div className="flex justify-between text-[10px] text-foreground/20 italic">
                      <span>0.01 = 100 units</span>
                      <span>1.00 = 10,000 units</span>
                    </div>
                  </div>
                </section>

                <section className="space-y-8">
                  <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-6 px-1">Grid Logic</h3>

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

              {/* Right Column: Time Filters & Account Protection */}
              <div className="space-y-12">
                <section className="space-y-8">
                  <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-6 px-1">Time & Risk Filters</h3>

                  {/* Entry/Exit Interval */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-foreground/30 uppercase">
                        <span>Entry Time Interval</span>
                        <span className="text-primary text-sm">{settings.entryInterval}s</span>
                      </div>
                      <input
                        type="range" min="0" max="300" step="5"
                        value={settings.entryInterval}
                        onChange={(e) => setSettings({ ...settings, entryInterval: parseInt(e.target.value) })}
                        className="w-full accent-primary bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-foreground/30 uppercase">
                        <span>Exit Time Interval</span>
                        <span className="text-primary text-sm">{settings.exitInterval}s</span>
                      </div>
                      <input
                        type="range" min="0" max="300" step="5"
                        value={settings.exitInterval}
                        onChange={(e) => setSettings({ ...settings, exitInterval: parseInt(e.target.value) })}
                        className="w-full accent-primary bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Spread Limit */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-foreground/30 uppercase">
                      <span className="flex items-center gap-2">Max Allowed Spread <Info size={12} className="opacity-50" /></span>
                      <span className="text-primary text-sm">{settings.spreadLimit.toFixed(1)} pips</span>
                    </div>
                    <input
                      type="range" min="0.1" max="10.0" step="0.1"
                      value={settings.spreadLimit}
                      onChange={(e) => setSettings({ ...settings, spreadLimit: parseFloat(e.target.value) })}
                      className="w-full accent-primary bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </section>

                <section className="space-y-8">
                  <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-6 px-1">Account Protection</h3>

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

            <footer className="mt-16 flex flex-col gap-5">
              <button
                onClick={onClose}
                className="w-full py-5 bg-primary text-background font-serif text-xl rounded-2xl hover:bg-accent transition-colors shadow-lg shadow-primary/10"
              >
                Save & Restart Strategy
              </button>
              <button
                onClick={onClose}
                className="w-full py-5 text-foreground/60 font-serif text-lg hover:text-foreground transition-colors"
              >
                Discard Changes
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
