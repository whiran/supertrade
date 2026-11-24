import React, { useState } from 'react';
import { useMarketStore } from '../store/marketStore.js';
import type { BacktestResult } from '@tv/shared';

export const StrategyTesterPanel: React.FC = () => {
  const { activeSymbol, activeTimeframe } = useMarketStore();
  const [strategyName, setStrategyName] = useState<string>('EMA_CROSSOVER');
  const [fastPeriod, setFastPeriod] = useState<number>(9);
  const [slowPeriod, setSlowPeriod] = useState<number>(21);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleRunBacktest = async () => {
    setIsRunning(true);
    const now = Math.floor(Date.now() / 1000);
    const config = {
      symbol: activeSymbol,
      tf: activeTimeframe,
      strategyName,
      params: { fast: fastPeriod, slow: slowPeriod },
      startSec: now - 30 * 86400,
      endSec: now,
      initialCapital: 100000,
      feeBps: 10,
      slippageBps: 5,
    };

    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setResult(await res.json());
      }
    } catch (err) {
      console.warn('[StrategyTesterPanel] Backtest error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs p-3 overflow-y-auto space-y-3">
      <div className="font-bold text-sm text-white border-b border-[#2a2e39] pb-2">
        STRATEGY TESTER & 5 QUANT CHECKS
      </div>

      {/* Strategy Selector */}
      <div className="space-y-2 bg-[#131722] p-2.5 rounded border border-[#2a2e39]">
        <div>
          <label className="text-[10px] text-[#787b86] block mb-1">STRATEGY</label>
          <select
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none"
          >
            <option value="EMA_CROSSOVER">EMA Crossover</option>
            <option value="RSI_REVERSION">RSI Mean Reversion</option>
          </select>
        </div>

        {strategyName === 'EMA_CROSSOVER' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#787b86] block mb-1">FAST PERIOD</label>
              <input
                type="number"
                value={fastPeriod}
                onChange={(e) => setFastPeriod(Number(e.target.value))}
                className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#787b86] block mb-1">SLOW PERIOD</label>
              <input
                type="number"
                value={slowPeriod}
                onChange={(e) => setSlowPeriod(Number(e.target.value))}
                className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none font-mono"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleRunBacktest}
          disabled={isRunning}
          className="w-full py-1.5 bg-[#2962ff] hover:bg-[#1e54e4] rounded font-bold text-white transition-colors"
        >
          {isRunning ? 'Running Simulation...' : 'Execute Backtest'}
        </button>
      </div>

      {/* Results Overview */}
      {result && (
        <div className="space-y-3">
          <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] space-y-1.5">
            <div className="font-bold text-white text-xs border-b border-[#2a2e39] pb-1">
              PERFORMANCE OVERVIEW
            </div>
            <div className="flex justify-between">
              <span className="text-[#787b86]">Net Profit</span>
              <span
                className={`font-mono font-bold ${
                  result.netProfit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
                }`}
              >
                ${result.netProfit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787b86]">Win Rate</span>
              <span className="font-mono text-white">{(result.winRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787b86]">Max Drawdown</span>
              <span className="font-mono text-[#ef5350]">{result.maxDrawdownPct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787b86]">Annualized Sharpe</span>
              <span className="font-mono text-white">{result.sharpe.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#787b86]">Executed Trades</span>
              <span className="font-mono text-white">{result.trades.length}</span>
            </div>
          </div>

          {/* 5 Quant Checks Grid */}
          <div className="space-y-2">
            <div className="font-bold text-white text-xs">5 QUANT ROBUSTNESS CHECKS</div>

            {/* 1. Walk-Forward */}
            <div className="bg-[#131722] p-2 rounded border border-[#2a2e39] flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">1. Walk-Forward Stability</div>
                <div className="text-[10px] text-[#787b86]">In-sample vs Out-of-sample</div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  result.quantChecks.walkForward.stable
                    ? 'bg-[#26a69a22] text-[#26a69a]'
                    : 'bg-[#ef535022] text-[#ef5350]'
                }`}
              >
                {result.quantChecks.walkForward.stable ? 'PASS' : 'WARN'}
              </span>
            </div>

            {/* 2. Overfitting Check */}
            <div className="bg-[#131722] p-2 rounded border border-[#2a2e39] flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">2. Parameter Perturbation</div>
                <div className="text-[10px] text-[#787b86]">+/-15% Sensitivity Delta</div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  result.quantChecks.overfitting.robust
                    ? 'bg-[#26a69a22] text-[#26a69a]'
                    : 'bg-[#ef535022] text-[#ef5350]'
                }`}
              >
                {result.quantChecks.overfitting.robust ? 'PASS' : 'WARN'}
              </span>
            </div>

            {/* 3. Deflated Sharpe */}
            <div className="bg-[#131722] p-2 rounded border border-[#2a2e39] flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">3. Deflated Sharpe Ratio</div>
                <div className="text-[10px] text-[#787b86]">
                  Adj: {result.quantChecks.deflatedSharpe.deflatedSharpe.toFixed(2)}
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  result.quantChecks.deflatedSharpe.significant
                    ? 'bg-[#26a69a22] text-[#26a69a]'
                    : 'bg-[#ef535022] text-[#ef5350]'
                }`}
              >
                {result.quantChecks.deflatedSharpe.significant ? 'PASS' : 'FAIL'}
              </span>
            </div>

            {/* 4. Cost Stress */}
            <div className="bg-[#131722] p-2 rounded border border-[#2a2e39] flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">4. Cost Stress (3x Fees)</div>
                <div className="text-[10px] text-[#787b86]">
                  Net: ${result.quantChecks.costStress.at3xCostNetProfit.toFixed(0)}
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  result.quantChecks.costStress.stillProfitableAt3x
                    ? 'bg-[#26a69a22] text-[#26a69a]'
                    : 'bg-[#ef535022] text-[#ef5350]'
                }`}
              >
                {result.quantChecks.costStress.stillProfitableAt3x ? 'PASS' : 'FAIL'}
              </span>
            </div>

            {/* 5. Monte Carlo */}
            <div className="bg-[#131722] p-2 rounded border border-[#2a2e39] flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">5. Monte Carlo (1000 Runs)</div>
                <div className="text-[10px] text-[#787b86]">
                  p5 DD: {result.quantChecks.monteCarlo.p5MaxDrawdown.toFixed(1)}%
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#26a69a22] text-[#26a69a]">
                {(result.quantChecks.monteCarlo.probabilityOfProfit * 100).toFixed(0)}% PROFIT
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
