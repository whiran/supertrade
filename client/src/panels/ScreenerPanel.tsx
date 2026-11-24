import React, { useState, useEffect } from 'react';
import { useMarketStore } from '../store/marketStore.js';

interface ScreenerRow {
  symbol: string;
  lastPrice: number;
  pctChange24h: number;
  rsi14: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  spreadBps: number;
}

const DEFAULT_SCREENER_SYMBOLS = [
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
];

export const ScreenerPanel: React.FC = () => {
  const { setSymbol } = useMarketStore();
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'heatmap'>('table');

  useEffect(() => {
    const fetchScreener = () => {
      fetch(`/api/screener?symbols=${DEFAULT_SCREENER_SYMBOLS.join(',')}`)
        .then((res) => res.json())
        .then(({ rows }: { rows: ScreenerRow[] }) => {
          if (rows) setRows(rows);
        })
        .catch((err) => console.warn('[ScreenerPanel] Fetch error:', err));
    };

    fetchScreener();
    const interval = setInterval(fetchScreener, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs p-3">
      {/* Header and Toggle */}
      <div className="flex justify-between items-center pb-2 border-b border-[#2a2e39] mb-3">
        <span className="font-bold text-white text-sm">MARKET SCREENER</span>
        <div className="flex space-x-1 bg-[#131722] p-0.5 rounded border border-[#2a2e39]">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              viewMode === 'table' ? 'bg-[#2962ff] text-white' : 'text-[#787b86]'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              viewMode === 'heatmap' ? 'bg-[#2962ff] text-white' : 'text-[#787b86]'
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Views */}
      {viewMode === 'table' ? (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2a2e39] text-[#787b86] text-[11px]">
                <th className="py-1">Symbol</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">24h %</th>
                <th className="py-1 text-right">RSI(14)</th>
                <th className="py-1 text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2e39]">
              {rows.map((r) => {
                const isPositive = r.pctChange24h >= 0;
                return (
                  <tr
                    key={r.symbol}
                    onClick={() => setSymbol(r.symbol)}
                    className="hover:bg-[#2a2e39] cursor-pointer transition-colors"
                  >
                    <td className="py-2 font-bold text-white">{r.symbol.split(':')[1]}</td>
                    <td className="py-2 text-right font-mono">{r.lastPrice.toFixed(2)}</td>
                    <td
                      className={`py-2 text-right font-mono font-semibold ${
                        isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {r.pctChange24h.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right font-mono">{r.rsi14.toFixed(1)}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          r.trend === 'bullish'
                            ? 'bg-[#26a69a22] text-[#26a69a]'
                            : r.trend === 'bearish'
                            ? 'bg-[#ef535022] text-[#ef5350]'
                            : 'bg-[#787b8622] text-[#787b86]'
                        }`}
                      >
                        {r.trend.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Heatmap Grid */
        <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto">
          {rows.map((r) => {
            const isPos = r.pctChange24h >= 0;
            return (
              <div
                key={r.symbol}
                onClick={() => setSymbol(r.symbol)}
                className={`p-3 rounded flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.02] ${
                  isPos ? 'bg-[#26a69a33] border border-[#26a69a]' : 'bg-[#ef535033] border border-[#ef5350]'
                }`}
              >
                <div className="font-bold text-white text-xs">{r.symbol.split(':')[1]}</div>
                <div
                  className={`font-mono text-base font-bold my-1 ${
                    isPos ? 'text-[#26a69a]' : 'text-[#ef5350]'
                  }`}
                >
                  {isPos ? '+' : ''}
                  {r.pctChange24h.toFixed(2)}%
                </div>
                <div className="text-[10px] text-[#d1d4dc] font-mono">${r.lastPrice.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
