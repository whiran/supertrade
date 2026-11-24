import React, { useState, useEffect } from 'react';
import { MultiChartGrid } from './chart/MultiChartGrid.js';
import { useMarketStore, type LayoutGridMode } from './store/marketStore.js';
import { wsClient } from './lib/wsClient.js';
import type { Timeframe } from '@tv/shared';

// Panels
import { WatchlistPanel } from './panels/WatchlistPanel.js';
import { EntryRiskPanel } from './panels/EntryRiskPanel.js';
import { ScreenerPanel } from './panels/ScreenerPanel.js';
import { PaperTradingPanel } from './panels/PaperTradingPanel.js';
import { StrategyTesterPanel } from './panels/StrategyTesterPanel.js';
import { CalendarNewsPanel } from './panels/CalendarNewsPanel.js';
import { AlertsPanel } from './panels/AlertsPanel.js';
import { ReplayToolbar } from './panels/ReplayToolbar.js';

const TIMEFRAMES: Timeframe[] = ['1s', '5s', '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

const DRAWING_TOOLS = [
  { id: 'cursor', label: '✚', title: 'Crosshair / Pointer' },
  { id: 'TrendLine', label: '╱', title: 'Trend Line (Alt+T)' },
  { id: 'Ray', label: '↗', title: 'Ray Line' },
  { id: 'HorizontalLine', label: '—', title: 'Horizontal Line (Alt+H)' },
  { id: 'ParallelChannel', label: '⫽', title: 'Parallel Channel' },
  { id: 'FibRetracement', label: 'φ', title: 'Fib Retracement (Alt+F)' },
  { id: 'LongPosition', label: '▲', title: 'Long Position Box' },
  { id: 'ShortPosition', label: '▼', title: 'Short Position Box' },
  { id: 'Brush', label: '✎', title: 'Brush Freehand' },
  { id: 'Text', label: 'T', title: 'Text Annotation' },
];

export default function App() {
  const {
    activeSymbol,
    activeTimeframe,
    layoutMode,
    activePanel,
    wsConnected,
    replayMode,
    activeDrawingTool,
    magnetMode,
    setSymbol,
    setTimeframe,
    setLayoutMode,
    setActivePanel,
    setReplayMode,
    setActiveDrawingTool,
    setMagnetMode,
    setWsConnected,
  } = useMarketStore();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Wire up connection status
  useEffect(() => {
    return wsClient.onStatus(setWsConnected);
  }, [setWsConnected]);

  // Global hotkeys: type alphanumeric to open symbol search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setActiveDrawingTool(null);
      } else if (e.altKey && e.key.toLowerCase() === 't') {
        setActiveDrawingTool('TrendLine');
      } else if (e.altKey && e.key.toLowerCase() === 'h') {
        setActiveDrawingTool('HorizontalLine');
      } else if (e.altKey && e.key.toLowerCase() === 'f') {
        setActiveDrawingTool('FibRetracement');
      } else if (/^[a-zA-Z0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setSearchQuery(e.key);
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveDrawingTool]);

  // Symbol search debounced API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then(({ results }) => setSearchResults(results || []))
        .catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#131722] text-[#d1d4dc] font-sans overflow-hidden select-none">
      {/* 1. Master Top Header Toolbar */}
      <header className="h-10 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between px-3 z-30 shrink-0">
        <div className="flex items-center space-x-2">
          {/* Logo */}
          <div className="font-extrabold text-[#26a69a] text-sm tracking-wider flex items-center space-x-1 mr-2">
            <span>📈</span>
            <span>PRECISION TV</span>
          </div>

          {/* Quick Symbol Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center space-x-1.5 bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] px-2.5 py-1 rounded text-xs font-bold text-white transition-colors"
          >
            <span>🔍</span>
            <span>{activeSymbol}</span>
          </button>

          {/* Timeframe Bar */}
          <div className="flex items-center space-x-0.5 bg-[#131722] p-0.5 rounded border border-[#2a2e39]">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                  activeTimeframe === tf
                    ? 'bg-[#2962ff] text-white'
                    : 'text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-2">
          {/* Bar Replay Toggle */}
          <button
            onClick={() => setReplayMode(!replayMode)}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-colors ${
              replayMode
                ? 'bg-[#f59e0b] text-black font-bold'
                : 'bg-[#131722] hover:bg-[#2a2e39] text-[#787b86]'
            }`}
          >
            <span>⏪</span>
            <span>Replay</span>
          </button>

          {/* Multi-Chart Grid Switcher */}
          <div className="flex items-center bg-[#131722] rounded border border-[#2a2e39] p-0.5">
            {(['1x1', '1x2', '2x1', '2x2', '3x2', '3x3', '4x4'] as LayoutGridMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setLayoutMode(mode)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  layoutMode === mode ? 'bg-[#2962ff] text-white' : 'text-[#787b86]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* WS Status Badge */}
          <div
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
              wsConnected ? 'bg-[#26a69a22] text-[#26a69a]' : 'bg-[#ef535022] text-[#ef5350]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-[#26a69a] animate-pulse' : 'bg-[#ef5350]'
              }`}
            />
            <span>{wsConnected ? 'GATEWAY LIVE' : 'CONNECTING...'}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Work Area: Left Toolbar + Chart Grid + Right Dock Panels */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Drawing Toolbar */}
        <aside className="w-11 bg-[#1e222d] border-r border-[#2a2e39] flex flex-col items-center py-2 space-y-1.5 shrink-0 z-20">
          {DRAWING_TOOLS.map((t) => (
            <button
              key={t.id}
              title={t.title}
              onClick={() => setActiveDrawingTool(activeDrawingTool === t.id ? null : t.id)}
              className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-colors ${
                activeDrawingTool === t.id
                  ? 'bg-[#2962ff] text-white'
                  : 'text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]'
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="w-6 border-b border-[#2a2e39] my-1" />

          {/* Magnet Tool Button */}
          <button
            title={`OHLC Magnet (${magnetMode})`}
            onClick={() =>
              setMagnetMode(magnetMode === 'weak' ? 'strong' : magnetMode === 'strong' ? 'off' : 'weak')
            }
            className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-colors ${
              magnetMode !== 'off'
                ? 'bg-[#26a69a33] text-[#26a69a]'
                : 'text-[#787b86] hover:bg-[#2a2e39]'
            }`}
          >
            🧲
          </button>
        </aside>

        {/* Center Canvas / Multi-Chart Grid */}
        <main className="flex-1 h-full overflow-hidden relative bg-[#131722]">
          <MultiChartGrid />
          <ReplayToolbar />
        </main>

        {/* Right Dock Panel (Watchlist, Risk, Screener, Paper, Strategy, News, Alerts) */}
        <aside className="w-80 bg-[#1e222d] border-l border-[#2a2e39] flex flex-col shrink-0 z-20">
          {/* Panel Selector Bar */}
          <div className="h-9 border-b border-[#2a2e39] flex items-center px-2 space-x-1 bg-[#131722] overflow-x-auto text-[11px]">
            {[
              { id: 'watchlist', label: 'Watchlist' },
              { id: 'risk', label: 'Risk' },
              { id: 'paper', label: 'Paper' },
              { id: 'screener', label: 'Screener' },
              { id: 'strategy', label: 'Strategy' },
              { id: 'calendar', label: 'News' },
              { id: 'alerts', label: 'Alerts' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePanel(p.id as any)}
                className={`px-2 py-1 rounded font-semibold whitespace-nowrap transition-colors ${
                  activePanel === p.id
                    ? 'bg-[#2962ff] text-white'
                    : 'text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Panel Content Area */}
          <div className="flex-1 overflow-hidden">
            {activePanel === 'watchlist' && <WatchlistPanel />}
            {activePanel === 'risk' && <EntryRiskPanel />}
            {activePanel === 'paper' && <PaperTradingPanel />}
            {activePanel === 'screener' && <ScreenerPanel />}
            {activePanel === 'strategy' && <StrategyTesterPanel />}
            {activePanel === 'calendar' && <CalendarNewsPanel />}
            {activePanel === 'alerts' && <AlertsPanel />}
          </div>
        </aside>
      </div>

      {/* Global Symbol Search Modal */}
      {searchModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#00000088] flex items-start justify-center pt-20"
          onClick={() => setSearchModalOpen(false)}
        >
          <div
            className="w-[460px] bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-[#2a2e39] flex items-center space-x-2">
              <span className="text-[#787b86]">🔍</span>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol (e.g. BTC, ETH, EUR, AAPL, SPY)..."
                className="flex-1 bg-transparent text-white text-sm outline-none font-semibold"
              />
              <span className="text-[10px] text-[#787b86] font-mono bg-[#131722] px-1.5 py-0.5 rounded">
                ESC
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#2a2e39]">
              {searchResults.length === 0 ? (
                <div className="text-center text-[#787b86] py-6 text-xs">
                  {searchQuery ? 'No matching symbols found' : 'Type to search market instruments'}
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSymbol(item.symbol);
                      setSearchModalOpen(false);
                    }}
                    className="p-2.5 hover:bg-[#2a2e39] cursor-pointer flex justify-between items-center transition-colors text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{item.symbol}</div>
                      <div className="text-[10px] text-[#787b86]">{item.description}</div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#131722] text-[#787b86] uppercase">
                      {item.type || 'INSTRUMENT'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
