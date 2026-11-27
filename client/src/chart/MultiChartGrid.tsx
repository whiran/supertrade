import React from 'react';
import { ChartCanvas } from './ChartCanvas.js';
import { useMarketStore, type LayoutGridMode } from '../store/marketStore.js';

export const GRID_CONFIGS: Record<
  LayoutGridMode,
  { cols: number; rows: number; count: number; css: string }
> = {
  '1x1': { cols: 1, rows: 1, count: 1, css: 'grid-cols-1 grid-rows-1' },
  '1x2': { cols: 2, rows: 1, count: 2, css: 'grid-cols-2 grid-rows-1' },
  '2x1': { cols: 1, rows: 2, count: 2, css: 'grid-cols-1 grid-rows-2' },
  '2x2': { cols: 2, rows: 2, count: 4, css: 'grid-cols-2 grid-rows-2' },
  '3x2': { cols: 3, rows: 2, count: 6, css: 'grid-cols-3 grid-rows-2' },
  '3x3': { cols: 3, rows: 3, count: 9, css: 'grid-cols-3 grid-rows-3' },
  '4x4': { cols: 4, rows: 4, count: 16, css: 'grid-cols-4 grid-rows-4' },
};

const DEFAULT_SYMBOLS = [
  'BINANCE:BTCUSDT',
  'BINANCE:ETHUSDT',
  'BINANCE:SOLUSDT',
  'BINANCE:BNBUSDT',
  'ALPACA:SPY',
  'ALPACA:AAPL',
  'ALPACA:TSLA',
  'ALPACA:NVDA',
  'OANDA:EUR_USD',
  'OANDA:GBP_USD',
  'OANDA:USD_JPY',
  'OANDA:AUD_USD',
  'BINANCE:ADAUSDT',
  'BINANCE:DOGEUSDT',
  'BINANCE:XRPUSDT',
  'BINANCE:AVAXUSDT',
];

export const MultiChartGrid: React.FC = () => {
  const {
    activeSymbol,
    activeTimeframe,
    layoutMode,
    syncCrosshairs,
    syncSymbol,
    syncTimeframe,
  } = useMarketStore();

  const cfg = GRID_CONFIGS[layoutMode] || GRID_CONFIGS['1x1'];

  return (
    <div className={`w-full h-full grid ${cfg.css} gap-[1px] bg-[#2a2e39]`}>
      {Array.from({ length: cfg.count }).map((_, i) => {
        const symbol = syncSymbol || i === 0 ? activeSymbol : DEFAULT_SYMBOLS[i] || activeSymbol;
        const timeframe = syncTimeframe || i === 0 ? activeTimeframe : '1m';

        return (
          <div key={`chart-slot-${i}`} className="w-full h-full bg-[#131722] relative">
            <ChartCanvas
              symbol={symbol}
              timeframe={timeframe}
              syncCrosshairs={syncCrosshairs}
            />
          </div>
        );
      })}
    </div>
  );
};
