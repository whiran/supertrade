import { create } from 'zustand';
import type { LiveQuote, Timeframe } from '@tv/shared';

export type LayoutGridMode = '1x1' | '1x2' | '2x1' | '2x2' | '3x2' | '3x3' | '4x4';

interface MarketState {
  activeSymbol: string;
  activeTimeframe: Timeframe;
  layoutMode: LayoutGridMode;
  syncCrosshairs: boolean;
  syncSymbol: boolean;
  syncTimeframe: boolean;
  replayMode: boolean;
  activePanel: 'watchlist' | 'risk' | 'screener' | 'paper' | 'strategy' | 'calendar' | 'alerts';

  // Live quotes map: symbol -> LiveQuote
  quotes: Map<string, LiveQuote>;
  wsConnected: boolean;

  // Selected drawing tool & magnet
  activeDrawingTool: string | null;
  magnetMode: 'off' | 'weak' | 'strong';

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

  updateQuote: (quote) =>
    set((state) => {
      const next = new Map(state.quotes);
      next.set(quote.symbol, quote);
      return { quotes: next };
    }),

  setWsConnected: (wsConnected) => set({ wsConnected }),
}));
