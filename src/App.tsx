import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Sun, Shield, Globe, Cpu, Box } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import ImageGenerator from './components/ImageGenerator';

export default function App() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen transition-colors duration-700 bg-bento-bg text-bento-text">
      {/* Navigation / Header */}
      <header className="relative z-10 border-b border-bento-border backdrop-blur-md bg-bento-bg/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="text-xl font-black tracking-tighter flex items-center gap-1">
                PROMPT<span className="bg-bento-accent text-white px-1.5 py-0.5 rounded-md text-sm">BATCH</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-bento-card border border-bento-border text-[13px] text-bento-dim">
              CSV: <b className="text-bento-text">batch_strategy_v1.csv</b>
              <span className="text-bento-success flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-bento-success" />
                Active Session
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDark(!isDark)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-bento-card border border-transparent hover:border-bento-border transition-all"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <ImageGenerator />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-bento-border py-8 bg-bento-card/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 opacity-50">
            <Box className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-widest">
              PromptBatch Architecture v2.4
            </span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] font-mono opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest">System Status: Healthy</a>
            <a href="#" className="text-[10px] font-mono opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest">© 2026</a>
          </div>
        </div>
      </footer>

      <Toaster position="bottom-right" theme={isDark ? 'dark' : 'light'} />
    </div>
  );
}


