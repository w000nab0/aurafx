"use client";

import { motion } from "framer-motion";
import { Save, Key, Bell, RefreshCw } from "lucide-react";
import { useState } from "react";

interface SettingsViewProps {
  onBack: () => void;
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState("****************************");
  const [secretKey, setSecretKey] = useState("****************************************");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto px-8 py-16 relative z-10"
    >
      <header className="mb-16">
        <h1 className="text-5xl font-serif font-light text-primary tracking-tight mb-4">Global Settings</h1>
        <p className="text-sm text-foreground/40 uppercase tracking-[0.3em]">Configure Application & Security</p>
      </header>

      <div className="space-y-12">
        {/* API Section */}
        <section className="glass-card p-12 space-y-10 border-primary/10 shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <Key size={24} className="text-primary" />
            <h2 className="text-2xl font-serif italic text-primary/90">API & Security</h2>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-foreground/40 font-bold">GMO Coin API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-base font-mono text-primary outline-none focus:border-primary/40 transition-all"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-foreground/40 font-bold">GMO Coin Secret Key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-base font-mono text-primary outline-none focus:border-primary/40 transition-all"
              />
            </div>
            <p className="text-xs text-foreground/30 italic">Keys are encrypted and stored locally on your device.</p>
          </div>
        </section>

        {/* Global Configuration */}
        <div className="grid grid-cols-2 gap-10">
          <section className="glass-card p-8 border-white/5 opacity-80">
            <div className="flex items-center gap-3 mb-6">
              <Bell size={18} className="text-primary/60" />
              <h3 className="text-lg font-serif">Notifications</h3>
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm">
                <div className="flex flex-col">
                  <span className="text-foreground/80">Performance Alerts</span>
                  <span className="text-[10px] text-foreground/30">Notify on profit targets</span>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex flex-col">
                  <span className="text-foreground/80">Connection Lost</span>
                  <span className="text-[10px] text-foreground/30">Alert if API disconnects</span>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </div>
            </div>
          </section>

          <section className="glass-card p-8 border-white/5 opacity-80">
            <div className="flex items-center gap-3 mb-6">
              <RefreshCw size={18} className="text-primary/60" />
              <h3 className="text-lg font-serif">System Sync</h3>
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm">
                <div className="flex flex-col">
                  <span className="text-foreground/80">Auto-Reconnect</span>
                  <span className="text-[10px] text-foreground/30">Try recovery on failure</span>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex flex-col">
                  <span className="text-foreground/80">Log Persistence</span>
                  <span className="text-[10px] text-foreground/30">Save history to local DB</span>
                </div>
                <input type="checkbox" className="w-5 h-5 accent-primary" />
              </div>
            </div>
          </section>
        </div>

        {/* Action Buttons */}
        <footer className="pt-8 flex flex-col gap-6">
          <button
            onClick={onBack}
            className="w-full py-5 bg-primary text-background font-serif text-xl rounded-2xl hover:bg-accent transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-3 group"
          >
            <Save size={20} className="group-hover:scale-110 transition-transform" />
            Apply & Save Configuration
          </button>
          <button
            onClick={onBack}
            className="w-full py-5 text-foreground/40 font-serif text-lg hover:text-foreground transition-colors"
          >
            Discard Changes
          </button>
        </footer>
      </div>
    </motion.div>
  );
}
