import { create } from 'zustand';
import type { LiveQuote, Timeframe } from '@tv/shared';

export type LayoutGridMode = '1x1' | '1x2' | '2x1' | '2x2' | '3x2' | '3x3' | '4x4';

export const THEME_PRESETS: Record<string, { label: string; bg: string; card: string; border: string }> = {
  Slate: { label: 'Slate', bg: '#131722', card: '#1e222d', border: '#2a2e39' },
  OLED: { label: 'OLED Black', bg: '#000000', card: '#111111', border: '#222222' },
  Cyber: { label: 'Cyber Dark', bg: '#0b0f19', card: '#111827', border: '#1f2937' },
  Purple: { label: 'Purple Nebula', bg: '#160f29', card: '#241740', border: '#3b2569' },
  Pine: { label: 'Pine Green', bg: '#0c1b17', card: '#132822', border: '#1e3d34' },
  Charcoal: { label: 'Charcoal', bg: '#181a1f', card: '#21252b', border: '#2c313a' },
  Mocha: { label: 'Mocha', bg: '#241b18', card: '#332722', border: '#4d3933' },
  Light: { label: 'Light Clean', bg: '#f0f3fa', card: '#ffffff', border: '#d1d4dc' },
};

interface MarketState {
  activeSymbol: string;
  activeTimeframe: Timeframe;
  layoutMode: LayoutGridMode;
  syncCrosshairs: boolean;
  syncSymbol: boolean;
  syncTimeframe: boolean;
  replayMode: boolean;
  activePanel:
    | 'watchlist'
    | 'risk'
    | 'screener'
    | 'paper'
    | 'strategy'
    | 'calendar'
    | 'alerts'
    | 'trades'
    | 'cryptosense';

  // Live quotes map: symbol -> LiveQuote
  quotes: Map<string, LiveQuote>;
  wsConnected: boolean;

  // Selected drawing tool & magnet
  activeDrawingTool: string | null;
  magnetMode: 'off' | 'weak' | 'strong';

  // Theme & Background Controls (from Features & Indicators spec)
  currentTheme: string;
  themeOpacity: number;

  // AI Controls
  aiBotEnabled: boolean;
  aiZonesEnabled: boolean;
  autoSigEnabled: boolean;

  // Active indicator IDs
  activeIndicators: string[];

  // Actions
  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setLayoutMode: (mode: LayoutGridMode) => void;
  setSyncCrosshairs: (val: boolean) => void;
  setSyncSymbol: (val: boolean) => void;
  setSyncTimeframe: (val: boolean) => void;
  setReplayMode: (val: boolean) => void;
  setActivePanel: (panel: MarketState['activePanel']) => void;
  setActiveDrawingTool: (tool: string | null) => void;
  setMagnetMode: (mode: 'off' | 'weak' | 'strong') => void;
  setTheme: (theme: string) => void;
  setThemeOpacity: (opacity: number) => void;
  toggleAiBot: () => void;
  toggleAiZones: () => void;
  toggleAutoSig: () => void;
  toggleIndicator: (indicatorId: string) => void;
  updateQuote: (quote: LiveQuote) => void;
  setWsConnected: (connected: boolean) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  activeSymbol: 'BINANCE:BTCUSDT',
  activeTimeframe: '1m',
  layoutMode: '1x1',
  syncCrosshairs: true,
  syncSymbol: false,
  syncTimeframe: false,
  replayMode: false,
  activePanel: 'watchlist',

  quotes: new Map<string, LiveQuote>(),
  wsConnected: false,

  activeDrawingTool: null,
  magnetMode: 'weak',

  currentTheme: 'Slate',
  themeOpacity: 100,

  aiBotEnabled: true,
  aiZonesEnabled: true,
  autoSigEnabled: false,

  activeIndicators: ['VOL', 'CVD', 'S.TREND'],

  setSymbol: (symbol) => set({ activeSymbol: symbol }),
  setTimeframe: (tf) => set({ activeTimeframe: tf }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setSyncCrosshairs: (syncCrosshairs) => set({ syncCrosshairs }),
  setSyncSymbol: (syncSymbol) => set({ syncSymbol }),
  setSyncTimeframe: (syncTimeframe) => set({ syncTimeframe }),
  setReplayMode: (replayMode) => set({ replayMode }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setActiveDrawingTool: (activeDrawingTool) => set({ activeDrawingTool }),
  setMagnetMode: (magnetMode) => set({ magnetMode }),

  setTheme: (currentTheme) => set({ currentTheme }),
  setThemeOpacity: (themeOpacity) => set({ themeOpacity }),

  toggleAiBot: () => set((s) => ({ aiBotEnabled: !s.aiBotEnabled })),
  toggleAiZones: () => set((s) => ({ aiZonesEnabled: !s.aiZonesEnabled })),
  toggleAutoSig: () => set((s) => ({ autoSigEnabled: !s.autoSigEnabled })),

  toggleIndicator: (indicatorId) =>
    set((state) => {
      const exists = state.activeIndicators.includes(indicatorId);
      return {
        activeIndicators: exists
          ? state.activeIndicators.filter((i) => i !== indicatorId)
          : [...state.activeIndicators, indicatorId],
      };
    }),

  updateQuote: (quote) =>
    set((state) => {
      const next = new Map(state.quotes);
      next.set(quote.symbol, quote);
      return { quotes: next };
    }),

  setWsConnected: (wsConnected) => set({ wsConnected }),
}));
