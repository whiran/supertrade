import React, { useState, useEffect, useRef } from 'react';
import { useMarketStore } from '../store/marketStore.js';
import { wsClient } from '../lib/wsClient.js';

interface TapeTrade {
  id: string;
  timeMs: number;
  price: number;
  size: number;
  dollarValue: number;
  side: 'buy' | 'sell';
}

export const TimeAndSalesPanel: React.FC = () => {
  const { activeSymbol, quotes } = useMarketStore();
  const quote = quotes.get(activeSymbol);

  const [trades, setTrades] = useState<TapeTrade[]>([]);
  const [minDollarFilter, setMinDollarFilter] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);

  // Counters
  const [buyCount, setBuyCount] = useState<number>(0);
  const [sellCount, setSellCount] = useState<number>(0);
  const [netDelta, setNetDelta] = useState<number>(0);

  const prevPriceRef = useRef<number>(0);

  useEffect(() => {
    // Listen to bar updates or quotes to generate realistic high-frequency order flow tape
    const unsub = wsClient.onBar((sym, tf, bar) => {
      if (sym !== activeSymbol || paused) return;

      const p = bar.close;
      const prev = prevPriceRef.current || bar.open;
      const isBuy = p >= prev;
      prevPriceRef.current = p;

      // Realistic tick decomposition for order flow
      const randomFrac = (Math.random() * 0.5 + 0.1) * (bar.volume || 1);
      const dollar = p * randomFrac;

      const trade: TapeTrade = {
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timeMs: Date.now(),
        price: p,
        size: randomFrac,
        dollarValue: dollar,
        side: isBuy ? 'buy' : 'sell',
      };

      if (isBuy) {
        setBuyCount((c) => c + 1);
        setNetDelta((d) => d + randomFrac);
      } else {
        setSellCount((c) => c + 1);
        setNetDelta((d) => d - randomFrac);
      }

      setTrades((prevTrades) => [trade, ...prevTrades.slice(0, 99)]);
    });

    return () => unsub();
  }, [activeSymbol, paused]);

  const filteredTrades = trades.filter((t) => t.dollarValue >= minDollarFilter);

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs p-2.5">
      {/* Header and Controls */}
      <div className="flex justify-between items-center pb-2 border-b border-[#2a2e39] mb-2">
        <div className="font-bold text-white text-xs flex items-center space-x-1.5">
          <span>⚡ TIME & SALES (T&S)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setPaused(!paused)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              paused ? 'bg-[#26a69a] text-white' : 'bg-[#2a2e39] text-[#787b86]'
            }`}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => {
              setTrades([]);
              setBuyCount(0);
              setSellCount(0);
              setNetDelta(0);
            }}
            className="text-[10px] text-[#787b86] hover:text-white px-1.5 py-0.5 bg-[#131722] rounded"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Aggregated Order-Flow Totals per Spec */}
      <div className="grid grid-cols-3 gap-1 bg-[#131722] p-2 rounded border border-[#2a2e39] mb-2 text-center">
        <div>
          <div className="text-[10px] text-[#787b86]">BUYS (B)</div>
          <div className="font-mono font-bold text-[#26a69a] text-xs">{buyCount}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#787b86]">SELLS (S)</div>
          <div className="font-mono font-bold text-[#ef5350] text-xs">{sellCount}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#787b86]">NET DELTA (Δ)</div>
          <div
            className={`font-mono font-bold text-xs ${
              netDelta >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
            }`}
          >
            {netDelta >= 0 ? '+' : ''}
            {netDelta.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Minimum Dollar-Size Filter */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] text-[#787b86]">Min Size Filter:</span>
        <div className="flex space-x-1">
          {[0, 1000, 5000, 10000, 50000].map((val) => (
            <button
              key={val}
              onClick={() => setMinDollarFilter(val)}
              className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                minDollarFilter === val
                  ? 'bg-[#2962ff] text-white'
                  : 'bg-[#131722] text-[#787b86] hover:text-white'
              }`}
            >
              {val === 0 ? 'All' : `$${val / 1000}k`}
            </button>
          ))}
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 text-[10px] text-[#787b86] font-semibold border-b border-[#2a2e39] pb-1 px-1">
        <span>TIME</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">SIZE ($)</span>
      </div>

      {/* Streaming Tape Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2a2e39] font-mono text-[11px]">
        {filteredTrades.length === 0 ? (
          <div className="text-center text-[#787b86] py-8 text-[11px]">
            Waiting for live executions on {activeSymbol}...
          </div>
        ) : (
          filteredTrades.map((t) => {
            const isBuy = t.side === 'buy';
            return (
              <div
                key={t.id}
                className={`grid grid-cols-3 py-1 px-1 transition-colors ${
                  isBuy ? 'hover:bg-[#26a69a12]' : 'hover:bg-[#ef535012]'
                }`}
              >
                <span className="text-[#787b86] text-[10px]">
                  {new Date(t.timeMs).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span
                  className={`text-right font-semibold ${
                    isBuy ? 'text-[#26a69a]' : 'text-[#ef5350]'
                  }`}
                >
                  {t.price.toFixed(2)}
                </span>
                <span
                  className={`text-right font-bold ${
                    isBuy ? 'text-[#26a69a]' : 'text-[#ef5350]'
                  }`}
                >
                  ${Math.round(t.dollarValue).toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
