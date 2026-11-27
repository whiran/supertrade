import React, { useState, useEffect } from 'react';
import { MultiChartGrid } from './chart/MultiChartGrid.js';
import { useMarketStore, type LayoutGridMode, THEME_PRESETS } from './store/marketStore.js';
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
import { TimeAndSalesPanel } from './panels/TimeAndSalesPanel.js';
import { CryptoSensePanel } from './panels/CryptoSensePanel.js';
import { IndicatorModal } from './panels/IndicatorModal.js';

const TIMEFRAMES: Timeframe[] = ['1s', '5s', '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

const QUICK_SYMBOLS = [
  // Indices
  { label: 'S&P 500', symbol: 'INDEX:SPX', category: 'index' },
  { label: 'DJIA', symbol: 'INDEX:DJI', category: 'index' },
  { label: 'NASDAQ', symbol: 'INDEX:IXIC', category: 'index' },
  // Commodities & Metals
  { label: 'OIL', symbol: 'COMMODITY:USOIL', category: 'commodity' },
  { label: 'GOLD', symbol: 'COMMODITY:XAUUSD', category: 'commodity' },
  { label: 'SILVER', symbol: 'COMMODITY:XAGUSD', category: 'commodity' },
  { label: 'PLAT', symbol: 'COMMODITY:XPTUSD', category: 'commodity' },
  { label: 'PALL', symbol: 'COMMODITY:XPDUSD', category: 'commodity' },
  // Crypto
  { label: 'BTC', symbol: 'BINANCE:BTCUSDT', category: 'crypto' },
  { label: 'ETH', symbol: 'BINANCE:ETHUSDT', category: 'crypto' },
  { label: 'SOL', symbol: 'BINANCE:SOLUSDT', category: 'crypto' },
  // US Equities
  { label: 'SPY', symbol: 'ALPACA:SPY', category: 'equity' },
  { label: 'AAPL', symbol: 'ALPACA:AAPL', category: 'equity' },
  { label: 'NVDA', symbol: 'ALPACA:NVDA', category: 'equity' },
  // Forex
  { label: 'EUR/USD', symbol: 'OANDA:EUR_USD', category: 'forex' },
  { label: 'USD/JPY', symbol: 'OANDA:USD_JPY', category: 'forex' },
];

const DRAWING_TOOLS = [
  { id: 'cursor', label: '✚', title: 'Crosshair / Pointer' },
  { id: 'TrendLine', label: '╱', title: 'Trend Line (Alt+T)' },
  { id: 'Ray', label: '↗', title: 'Ray Line' },
  { id: 'HorizontalLine', label: '—', title: 'Horizontal Line (Alt+H)' },
  { id: 'ParallelChannel', label: '⫽', title: 'Parallel Channel' },
  { id: 'FibRetracement', label: 'φ', title: 'Fib Retracement (Alt+F)' },
  { id: 'Box', label: '▭', title: 'Rectangle / Zone' },
  { id: 'LongPosition', label: '▲', title: 'Long Position Box' },
  { id: 'ShortPosition', label: '▼', title: 'Short Position Box' },
  { id: 'Brush', label: '✎', title: 'Brush Freehand' },
  { id: 'Text', label: 'T', title: 'Text Annotation' },
];

function normalizeInputSymbol(raw: string): string {
  if (!raw) return 'BINANCE:BTCUSDT';
  const s = raw.trim().toUpperCase();
  if (s.includes(':')) return s;

  // Commodities & Metals
  if (/^(XAU|XAG|XPT|XPD|OIL|USOIL|BCO|CRUDE)/.test(s)) {
    return `COMMODITY:${s.replace(/[/_]/g, '')}`;
  }
  // Major Indices
  if (/^(SPX|DJI|IXIC|NDX|RUT|SP500|US30|NAS100)/.test(s)) {
    return `INDEX:${s.replace(/[/_]/g, '')}`;
  }
  // Forex: contains / or _ or 6-letter currency codes
  const clean = s.replace(/[/_]/g, '');
  if (
    s.includes('/') ||
    s.includes('_') ||
    (clean.length === 6 &&
      /^(EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY|TRY|INR|ZAR|MXN|SEK|NOK|SGD|HKD|CNY|CNH|PLN)/.test(clean))
  ) {
    const base = clean.slice(0, 3);
    const quote = clean.slice(3, 6);
    return `OANDA:${base}_${quote}`;
  }
  // Crypto: ends with USDT, USDC, BUSD, BTC, ETH
  if (/(USDT|USDC|BUSD|BTC|ETH|SOL|BNB)$/.test(clean)) {
    return `BINANCE:${clean}`;
  }
  // US Equities: 1-5 letters ticker
  if (/^[A-Z]{1,5}$/.test(clean)) {
    return `ALPACA:${clean}`;
  }
  return `OANDA:${s.replace('/', '_')}`;
}

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
    currentTheme,
    themeOpacity,
    aiBotEnabled,
    aiZonesEnabled,
    autoSigEnabled,
    chartAggregation,
    tickSize,
    setSymbol,
    setTimeframe,
    setChartAggregation,
    setTickSize,
    setLayoutMode,
    setActivePanel,
    setReplayMode,
    setActiveDrawingTool,
    setMagnetMode,
    setTheme,
    setThemeOpacity,
    toggleAiBot,
    toggleAiZones,
    toggleAutoSig,
    setWsConnected,
  } = useMarketStore();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [indicatorModalOpen, setIndicatorModalOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [inlineSymbol, setInlineSymbol] = useState(activeSymbol);

  const handleAutoScale = () => {
    window.dispatchEvent(new CustomEvent('tv:auto-scale'));
  };

  // Sync inline symbol with activeSymbol
  useEffect(() => {
    setInlineSymbol(activeSymbol);
  }, [activeSymbol]);

  const handleInlineSymbolSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inlineSymbol.trim()) return;
    const normalized = normalizeInputSymbol(inlineSymbol);
    setSymbol(normalized);
  };

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

          {/* Orderflow & TradingView Terminal Controls: SYMBOL | TICK | A | AGGREGATION | PERIOD */}
          {/* SYMBOL */}
          <form
            onSubmit={handleInlineSymbolSubmit}
            className="flex items-center space-x-1.5 bg-[#131722] border border-[#2a2e39] rounded px-2 py-0.5"
          >
            <span className="text-[10px] font-extrabold text-[#d0d8e8] uppercase tracking-wider">
              SYMBOL:
            </span>
            <input
              type="text"
              value={inlineSymbol}
              onChange={(e) => setInlineSymbol(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInlineSymbolSubmit();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="e.g. ETHUSDT, EURUSD"
              className="bg-[#1e222d] border border-[#2a2e39] focus:border-[#2962ff] text-white text-xs font-extrabold px-2 py-0.5 rounded outline-none w-28 uppercase text-center"
              title="Type any currency pair or symbol and press Enter to switch"
            />
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="text-[#787b86] hover:text-white px-0.5 text-xs font-bold transition-colors"
              title="Search & Add Symbols"
            >
              🔍
            </button>
          </form>

          {/* TICK */}
          <div className="flex items-center space-x-1 bg-[#131722] border border-[#2a2e39] rounded px-1.5 py-0.5">
            <span className="text-[10px] font-extrabold text-[#d0d8e8] uppercase tracking-wider">
              TICK:
            </span>
            <input
              type="number"
              min="0.0001"
              step="any"
              value={tickSize}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val > 0) {
                  setTickSize(val);
                }
              }}
              className="bg-[#1e222d] border border-[#2a2e39] focus:border-[#2962ff] text-white text-xs font-extrabold px-1 py-0.5 rounded outline-none w-12 text-center"
              title="Tick size / aggregation increment (e.g. 1, 2, 5, 10, 0.1, 0.01)"
            />
          </div>

          {/* AUTO-SCALE (A) */}
          <button
            type="button"
            onClick={handleAutoScale}
            className="bg-[#1e222d] hover:bg-[#2a2e39] active:bg-[#2962ff] border border-[#2a2e39] text-white font-extrabold text-xs px-2 py-1 rounded transition-colors"
            title="Auto Scale Chart (A)"
          >
            A
          </button>

          {/* AGGREGATION */}
          <div className="flex items-center bg-[#131722] border border-[#2a2e39] rounded px-1 py-0.5">
            <select
              value={chartAggregation}
              onChange={(e) => setChartAggregation(e.target.value as any)}
              className="bg-[#1e222d] border border-[#2a2e39] text-[#00e5ff] text-xs font-extrabold px-1.5 py-0.5 rounded outline-none cursor-pointer"
            >
              <option value="candles">-- AGGREGATION: CANDLES --</option>
              <option value="heikin_ashi">Heikin-Ashi</option>
              <option value="hollow">Hollow Candles</option>
              <option value="bars">Bars (OHLC)</option>
              <option value="line">Line</option>
              <option value="area">Area</option>
              <option value="baseline">Baseline</option>
            </select>
          </div>

          {/* PERIOD */}
          <div className="flex items-center space-x-1 bg-[#131722] border border-[#2a2e39] rounded px-1.5 py-0.5">
            <span className="text-[10px] font-extrabold text-[#d0d8e8] uppercase tracking-wider">
              PERIOD:
            </span>
            <select
              value={activeTimeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="bg-[#1e222d] border border-[#2a2e39] text-[#00e5ff] text-xs font-extrabold px-1.5 py-0.5 rounded outline-none cursor-pointer uppercase"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Quick-Select Symbols with Categorized Asset Class Sections */}
          <div className="flex items-center space-x-1 bg-[#131722] px-1 py-0.5 rounded border border-[#2a2e39] text-xs overflow-x-auto max-w-[620px]">
            {/* Indices */}
            <span className="text-[9px] font-bold text-[#10b981] px-0.5 uppercase tracking-wide">Index</span>
            {QUICK_SYMBOLS.filter((qs) => qs.category === 'index').map((qs) => (
              <button
                key={qs.symbol}
                onClick={() => setSymbol(qs.symbol)}
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors whitespace-nowrap ${
                  activeSymbol === qs.symbol
                    ? 'bg-[#10b981] text-black font-extrabold'
                    : 'text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                {qs.label}
              </button>
            ))}

            <div className="w-[1px] h-3 bg-[#2a2e39] mx-0.5 shrink-0" />

            {/* Commodities */}
            <span className="text-[9px] font-bold text-[#eab308] px-0.5 uppercase tracking-wide">Commodities</span>
            {QUICK_SYMBOLS.filter((qs) => qs.category === 'commodity').map((qs) => (
              <button
                key={qs.symbol}
                onClick={() => setSymbol(qs.symbol)}
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors whitespace-nowrap ${
                  activeSymbol === qs.symbol
                    ? 'bg-[#eab308] text-black font-extrabold'
                    : 'text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                {qs.label}
              </button>
            ))}

            <div className="w-[1px] h-3 bg-[#2a2e39] mx-0.5 shrink-0" />

            {/* Crypto */}
            <span className="text-[9px] font-bold text-[#f59e0b] px-0.5 uppercase tracking-wide">Crypto</span>
            {QUICK_SYMBOLS.filter((qs) => qs.category === 'crypto').map((qs) => (
              <button
                key={qs.symbol}
                onClick={() => setSymbol(qs.symbol)}
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors whitespace-nowrap ${
                  activeSymbol === qs.symbol
                    ? 'bg-[#26a69a] text-white'
                    : 'text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                {qs.label}
              </button>
            ))}

            <div className="w-[1px] h-3 bg-[#2a2e39] mx-0.5 shrink-0" />

            {/* Stocks */}
            <span className="text-[9px] font-bold text-[#38bdf8] px-0.5 uppercase tracking-wide">Stocks</span>
            {QUICK_SYMBOLS.filter((qs) => qs.category === 'equity').map((qs) => (
              <button
                key={qs.symbol}
                onClick={() => setSymbol(qs.symbol)}
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors whitespace-nowrap ${
                  activeSymbol === qs.symbol
                    ? 'bg-[#2962ff] text-white'
                    : 'text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                {qs.label}
              </button>
            ))}

            <div className="w-[1px] h-3 bg-[#2a2e39] mx-0.5 shrink-0" />

            {/* Forex */}
            <span className="text-[9px] font-bold text-[#c084fc] px-0.5 uppercase tracking-wide">Forex</span>
            {QUICK_SYMBOLS.filter((qs) => qs.category === 'forex').map((qs) => (
              <button
                key={qs.symbol}
                onClick={() => setSymbol(qs.symbol)}
                className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors whitespace-nowrap ${
                  activeSymbol === qs.symbol
                    ? 'bg-[#9333ea] text-white'
                    : 'text-[#787b86] hover:text-[#d1d4dc]'
                }`}
              >
                {qs.label}
              </button>
            ))}
          </div>

          {/* Indicators Button */}
          <button
            onClick={() => setIndicatorModalOpen(true)}
            className="px-2.5 py-1 rounded text-xs font-semibold bg-[#131722] hover:bg-[#2a2e39] text-[#787b86] hover:text-white border border-[#2a2e39] transition-colors"
          >
            📊 Indicators
          </button>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-2">
          {/* AI Controls */}
          <div className="flex items-center space-x-1 bg-[#131722] p-0.5 rounded border border-[#2a2e39]">
            <button
              onClick={toggleAiBot}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                aiBotEnabled ? 'bg-[#26a69a] text-white' : 'text-[#787b86]'
              }`}
              title="AI Bot Auto-Analysis"
            >
              AI BOT
            </button>
            <button
              onClick={toggleAiZones}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                aiZonesEnabled ? 'bg-[#2962ff] text-white' : 'text-[#787b86]'
              }`}
              title="AI Supply/Demand Zones"
            >
              ZONES
            </button>
            <button
              onClick={toggleAutoSig}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                autoSigEnabled ? 'bg-[#f59e0b] text-black' : 'text-[#787b86]'
              }`}
              title="Automatic Buy/Sell Signals"
            >
              AUTO-SIG
            </button>
          </div>

          {/* Theme BG Picker */}
          <div className="relative">
            <button
              onClick={() => setThemePickerOpen(!themePickerOpen)}
              className="px-2 py-1 rounded text-[10px] font-bold bg-[#131722] hover:bg-[#2a2e39] text-[#787b86] border border-[#2a2e39] transition-colors"
              title="Chart Background"
            >
              BG
            </button>
            {themePickerOpen && (
              <div className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl p-2 z-50 w-48">
                <div className="text-[10px] text-[#787b86] font-bold uppercase mb-1.5">Theme</div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => { setTheme(key); setThemePickerOpen(false); }}
                      className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
                        currentTheme === key ? 'bg-[#2962ff] text-white' : 'bg-[#131722] text-[#787b86] hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-[#787b86] font-bold mb-1">Opacity: {themeOpacity}%</div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={themeOpacity}
                  onChange={(e) => setThemeOpacity(Number(e.target.value))}
                  className="w-full h-1 accent-[#2962ff]"
                />
              </div>
            )}
          </div>

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

          <div className="w-6 border-b border-[#2a2e39] my-1" />

          {/* Undo / Clear Drawing */}
          <button
            title="Undo Last Drawing"
            onClick={() => {
              // Dispatch undo event for DrawingController to handle
              window.dispatchEvent(new CustomEvent('drawing:undo'));
            }}
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition-colors"
          >
            ↩
          </button>
          <button
            title="Clear All Drawings"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('drawing:clear'));
            }}
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-[#787b86] hover:bg-[#ef535033] hover:text-[#ef5350] transition-colors"
          >
            🗑
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
              { id: 'trades', label: 'T&S' },
              { id: 'cryptosense', label: 'FUND' },
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
            {activePanel === 'trades' && <TimeAndSalesPanel />}
            {activePanel === 'cryptosense' && <CryptoSensePanel />}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchResults.length > 0) {
                      setSymbol(searchResults[0].symbol);
                    } else if (searchQuery.trim()) {
                      setSymbol(normalizeInputSymbol(searchQuery));
                    }
                    setSearchModalOpen(false);
                    setSearchQuery('');
                  }
                }}
                placeholder="Search symbol (e.g. BTC, ETH, EUR, AAPL, SPY, EUR/TRY)..."
                className="flex-1 bg-transparent text-white text-sm outline-none font-semibold"
              />
              <span className="text-[10px] text-[#787b86] font-mono bg-[#131722] px-1.5 py-0.5 rounded">
                ESC
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#2a2e39]">
              {searchQuery.trim() && (
                <div
                  onClick={() => {
                    const normalized = normalizeInputSymbol(searchQuery);
                    setSymbol(normalized);
                    setSearchModalOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-2.5 bg-[#2962ff18] hover:bg-[#2962ff33] border-b border-[#2962ff44] cursor-pointer flex justify-between items-center transition-colors text-xs text-white"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[#38bdf8] font-bold text-sm">⚡</span>
                    <div>
                      <div className="font-bold text-white">
                        Open Custom Symbol: <span className="text-[#38bdf8] font-extrabold">{searchQuery.toUpperCase()}</span>
                      </div>
                      <div className="text-[10px] text-[#787b86]">
                        Directly loads and streams any currency pair, stock, or crypto
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2962ff] text-white uppercase tracking-wider">
                    LOAD
                  </span>
                </div>
              )}

              {searchResults.length === 0 ? (
                <div className="text-center text-[#787b86] py-6 text-xs">
                  {searchQuery ? 'Press Enter to open custom symbol' : 'Type to search market instruments'}
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

      {/* Indicator Catalog Modal */}
      <IndicatorModal isOpen={indicatorModalOpen} onClose={() => setIndicatorModalOpen(false)} />
    </div>
  );
}
