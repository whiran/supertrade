import React, { useState } from 'react';
import { useMarketStore } from '../store/marketStore.js';
import { getPositionSize } from 'trading-signals';

export const EntryRiskPanel: React.FC = () => {
  const { activeSymbol, quotes } = useMarketStore();
  const quote = quotes.get(activeSymbol);

  const [accountBalance, setAccountBalance] = useState<number>(100000);
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');

  const entry = parseFloat(entryPrice) || quote?.last || 0;
  const sl = parseFloat(stopLoss) || 0;
  const tp = parseFloat(takeProfit) || 0;

  // Use trading-signals getPositionSize calculation
  let calculatedSize = 0;
  let dollarRisk = 0;
  let rewardRiskRatio = 0;

  if (entry > 0 && sl > 0) {
    dollarRisk = (accountBalance * riskPct) / 100;
    try {
      calculatedSize = getPositionSize(accountBalance, riskPct, entry, sl);
    } catch {
      const priceRisk = Math.abs(entry - sl);
      calculatedSize = priceRisk > 0 ? dollarRisk / priceRisk : 0;
    }

    if (tp > 0 && Math.abs(entry - sl) > 0) {
      rewardRiskRatio = Math.abs(tp - entry) / Math.abs(entry - sl);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs p-3 overflow-y-auto space-y-3">
      <div className="font-bold text-sm tracking-wide text-white border-b border-[#2a2e39] pb-2">
        ENTRY & RISK CALCULATOR
      </div>

      {/* Live Quote Stream */}
      <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] space-y-1.5">
        <div className="flex justify-between items-center text-[#787b86]">
          <span>Bid / Ask</span>
          <span className="font-mono text-white">
            <span className="text-[#ef5350] font-bold">{quote?.bid.toFixed(4) || '—'}</span> /{' '}
            <span className="text-[#26a69a] font-bold">{quote?.ask.toFixed(4) || '—'}</span>
          </span>
        </div>
        <div className="flex justify-between items-center text-[#787b86]">
          <span>Spread</span>
          <span className="font-mono text-white">{quote?.spreadBps.toFixed(2) || '0.00'} bps</span>
        </div>
      </div>

      {/* Position Sizer Inputs */}
      <div className="space-y-2">
        <div>
          <label className="text-[11px] text-[#787b86] block mb-1">Account Balance ($)</label>
          <input
            type="number"
            value={accountBalance}
            onChange={(e) => setAccountBalance(Number(e.target.value))}
            className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none focus:border-[#2962ff]"
          />
        </div>

        <div>
          <label className="text-[11px] text-[#787b86] block mb-1">Risk Percentage (%)</label>
          <input
            type="number"
            step="0.1"
            value={riskPct}
            onChange={(e) => setRiskPct(Number(e.target.value))}
            className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none focus:border-[#2962ff]"
          />
        </div>

        <div>
          <label className="text-[11px] text-[#787b86] block mb-1">Entry Price</label>
          <input
            type="number"
            placeholder={quote?.last ? String(quote.last) : '0.00'}
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none focus:border-[#2962ff]"
          />
        </div>

        <div>
          <label className="text-[11px] text-[#787b86] block mb-1">Stop Loss Price</label>
          <input
            type="number"
            placeholder="0.00"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none focus:border-[#2962ff]"
          />
        </div>

        <div>
          <label className="text-[11px] text-[#787b86] block mb-1">Take Profit Price</label>
          <input
            type="number"
            placeholder="0.00"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none focus:border-[#2962ff]"
          />
        </div>
      </div>

      {/* Calculated Risk & Sizing Output */}
      <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] space-y-2 mt-2">
        <div className="flex justify-between text-xs">
          <span className="text-[#787b86]">Position Size</span>
          <span className="font-bold text-[#2962ff] font-mono">{calculatedSize.toFixed(4)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#787b86]">Dollar Risk</span>
          <span className="font-bold text-[#ef5350] font-mono">${dollarRisk.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#787b86]">Risk / Reward</span>
          <span className="font-bold text-[#26a69a] font-mono">
            {rewardRiskRatio > 0 ? `1 : ${rewardRiskRatio.toFixed(2)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
