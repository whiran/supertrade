import React, { useState, useMemo } from 'react';
import { useMarketStore } from '../store/marketStore.js';

interface CoinFAData {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  fdv: number;
  circulatingSupply: number;
  maxSupply: number | null;
  githubCommits4w: number;
  redditSubscribers: number;
  volume24h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  distanceFromATH: number;
  tvl: number;
  liquidityScore: number;
  openInterest: number;
  oiChange24h: number;
  fundingRate: number;
  smartMoneyOIWall: number;
  retailLongShortRatio: number;
  takerBuySellRatio: number;
  orderbookImbalance: number;
}

const FA_METRICS: Record<string, CoinFAData> = {
  BTCUSDT: {
    symbol: 'BTCUSDT',
    name: 'Bitcoin',
    price: 94250,
    marketCap: 1860000000000,
    fdv: 1979000000000,
    circulatingSupply: 19780000,
    maxSupply: 21000000,
    githubCommits4w: 184,
    redditSubscribers: 6400000,
    volume24h: 42500000000,
    change24h: 2.45,
    change7d: 5.8,
    change30d: 38.2,
    distanceFromATH: -5.2,
    tvl: 2800000000,
    liquidityScore: 98,
    openInterest: 38500000000,
    oiChange24h: 4.8,
    fundingRate: 0.0125,
    smartMoneyOIWall: 91500,
    retailLongShortRatio: 2.15,
    takerBuySellRatio: 1.18,
    orderbookImbalance: 14.2,
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    name: 'Ethereum',
    price: 3450,
    marketCap: 415000000000,
    fdv: 415000000000,
    circulatingSupply: 120400000,
    maxSupply: null,
    githubCommits4w: 320,
    redditSubscribers: 3100000,
    volume24h: 24800000000,
    change24h: 3.12,
    change7d: 8.4,
    change30d: 29.5,
    distanceFromATH: -29.1,
    tvl: 64500000000,
    liquidityScore: 95,
    openInterest: 14200000000,
    oiChange24h: 7.2,
    fundingRate: 0.0105,
    smartMoneyOIWall: 3320,
    retailLongShortRatio: 2.65, // Trapped alert!
    takerBuySellRatio: 0.94,
    orderbookImbalance: -8.5,
  },
  SOLUSDT: {
    symbol: 'SOLUSDT',
    name: 'Solana',
    price: 182,
    marketCap: 86000000000,
    fdv: 108000000000,
    circulatingSupply: 472000000,
    maxSupply: null,
    githubCommits4w: 240,
    redditSubscribers: 510000,
    volume24h: 8900000000,
    change24h: 5.6,
    change7d: 14.2,
    change30d: 42.1,
    distanceFromATH: -29.8,
    tvl: 8900000000,
    liquidityScore: 91,
    openInterest: 4800000000,
    oiChange24h: 11.4,
    fundingRate: 0.0185,
    smartMoneyOIWall: 172,
    retailLongShortRatio: 2.82,
    takerBuySellRatio: 1.24,
    orderbookImbalance: 18.4,
  },
};

export const CryptoSensePanel: React.FC = () => {
  const { activeSymbol, quotes } = useMarketStore();
  const [lang, setLang] = useState<'EN' | 'SI'>('EN');

  const cleanSym = useMarketStore((s) => s.activeSymbol.replace('BINANCE:', ''));
  const data = FA_METRICS[cleanSym] || FA_METRICS['BTCUSDT'];
  const livePrice = quotes.get(activeSymbol)?.last || data.price;

  // Compute Confluence Score (out of 100)
  const confluenceScore = useMemo(() => {
    let score = 50;
    if (data.change24h > 0) score += 8;
    if (data.change7d > 0) score += 6;
    if (data.oiChange24h > 0) score += 7;
    if (data.takerBuySellRatio > 1.0) score += 9;
    if (data.retailLongShortRatio > 2.5) score -= 12; // Retail trapped penalty
    if (data.orderbookImbalance > 0) score += 8;
    return Math.min(100, Math.max(10, score));
  }, [data]);

  const mcFdvRatio = data.fdv > 0 ? (data.marketCap / data.fdv).toFixed(2) : '1.00';
  const isRetailTrapped = data.retailLongShortRatio >= 2.5;

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs p-3 overflow-y-auto space-y-3">
      {/* Header and Language Selector */}
      <div className="flex justify-between items-center pb-2 border-b border-[#2a2e39]">
        <div>
          <div className="font-extrabold text-white text-sm tracking-wide flex items-center gap-1.5">
            <span>🧠 CRYPTOSENSE FA ENGINE</span>
          </div>
          <div className="text-[10px] text-[#787b86]">Fundamental & Order-Flow Confluence</div>
        </div>
        <div className="flex space-x-1 bg-[#131722] p-0.5 rounded border border-[#2a2e39]">
          <button
            onClick={() => setLang('EN')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              lang === 'EN' ? 'bg-[#2962ff] text-white' : 'text-[#787b86]'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('SI')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              lang === 'SI' ? 'bg-[#2962ff] text-white' : 'text-[#787b86]'
            }`}
          >
            සිංහල
          </button>
        </div>
      </div>

      {/* Confluence Score Gauge */}
      <div className="bg-[#131722] p-3 rounded-lg border border-[#2a2e39] text-center">
        <div className="text-[10px] font-bold text-[#787b86] uppercase tracking-wider mb-1">
          CONFLUENCE SCORE
        </div>
        <div className="text-3xl font-extrabold font-mono text-white flex items-center justify-center gap-1">
          <span
            className={
              confluenceScore >= 70
                ? 'text-[#26a69a]'
                : confluenceScore >= 45
                ? 'text-[#f59e0b]'
                : 'text-[#ef5350]'
            }
          >
            {confluenceScore}
          </span>
          <span className="text-sm text-[#787b86]">/ 100</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-[#2a2e39] h-2 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              confluenceScore >= 70
                ? 'bg-[#26a69a]'
                : confluenceScore >= 45
                ? 'bg-[#f59e0b]'
                : 'bg-[#ef5350]'
            }`}
            style={{ width: `${confluenceScore}%` }}
          />
        </div>
        <div className="text-[10px] text-[#787b86] mt-1.5 font-medium">
          {confluenceScore >= 70
            ? 'Strong Institutional Aggression & Favorable Tokenomics'
            : confluenceScore >= 45
            ? 'Neutral Confluence — Monitor Retest of Key S/D Zones'
            : 'Bearish Exhaustion / High Retail Long Concentration'}
        </div>
      </div>

      {/* Trapped Retail Alert Warning per Spec */}
      {isRetailTrapped && (
        <div className="bg-[#ef53501a] border border-[#ef5350] p-2 rounded text-[11px] text-[#ef5350] font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>
            {lang === 'EN'
              ? `Retail Long/Short Ratio is ${data.retailLongShortRatio} (>2.5). Retail is heavily long and susceptible to liquidity sweeps!`
              : `සිල්ලර Long/Short අනුපාතය ${data.retailLongShortRatio} වේ (>2.5). සිල්ලර වෙළඳුන් අධික ලෙස Long ස්ථානවල කොටු වී ඇත!`}
          </span>
        </div>
      )}

      {/* Metrics Section: Price, Valuation, Tokenomics */}
      <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] space-y-1.5 font-mono">
        <div className="text-[10px] font-bold text-white uppercase font-sans mb-1 border-b border-[#2a2e39] pb-1">
          Price & Valuation
        </div>
        <div className="flex justify-between">
          <span className="text-[#787b86]">Live Price:</span>
          <span className="text-white font-bold">${livePrice.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787b86]">Market Cap:</span>
          <span className="text-white">${(data.marketCap / 1e9).toFixed(2)}B</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787b86]">FDV (Fully Diluted):</span>
          <span className="text-white">${(data.fdv / 1e9).toFixed(2)}B</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787b86]">MC / FDV Ratio:</span>
          <span className="text-[#26a69a] font-bold">{mcFdvRatio}</span>
        </div>
      </div>

      {/* Order-Flow & Derivatives */}
      <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] space-y-1.5 font-mono">
        <div className="text-[10px] font-bold text-white uppercase font-sans mb-1 border-b border-[#2a2e39] pb-1">
          Order Flow & Derivatives
        </div>
        <div className="flex justify-between">
          <span className="text-[#787b86]">Open Interest:</span>
          <span className="text-white font-bold">${(data.openInterest / 1e9).toFixed(2)}B</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787b86]">24h OI Change:</span>
          <span className="text-[#26a69a]">+{data.oiChange24h}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787b86]">Funding Rate:</span>
          <span className="text-white">{(data.fundingRate * 100).toFixed(4)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787b86]">Smart Money OI Wall:</span>
          <span className="text-[#2962ff] font-bold">${data.smartMoneyOIWall.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#787b86]">Taker Buy/Sell (CVD):</span>
          <span className={data.takerBuySellRatio >= 1 ? 'text-[#26a69a]' : 'text-[#ef5350]'}>
            {data.takerBuySellRatio}
          </span>
        </div>
      </div>

      {/* AI Analysis Summary Box (English & Sinhala as specified) */}
      <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] space-y-1">
        <div className="font-bold text-white text-[11px] flex items-center justify-between">
          <span>🤖 AI ANALYSIS SUMMARY</span>
          <span className="text-[9px] text-[#2962ff] font-mono">AUTO-GENERATED</span>
        </div>
        <div className="text-[11px] text-[#d1d4dc] leading-relaxed pt-1">
          {lang === 'EN' ? (
            <p>
              <strong>{data.name} ({cleanSym})</strong> shows sustained order-flow absorption with a
              confluence rating of <strong>{confluenceScore}/100</strong>. Volume delta remains positive
              over the 4h timeframe with institutional limit bids defending the ${data.smartMoneyOIWall}{' '}
              wall. Keep tight risk if trading breakouts due to retail long leverage.
            </p>
          ) : (
            <p className="font-sans">
              <strong>{data.name} ({cleanSym})</strong> සඳහා ආයතනික මිලදී ගැනීම් (absorption) සහ ඇණවුම් ප්‍රවාහ (order-flow)
              ශක්තිමත්ව පවතී. සම්මුති ලකුණු සංඛ්‍යාව <strong>100 න් {confluenceScore}</strong> ක් වේ.
              ස්මාර්ට් මුදල් (Smart Money) ආධාරක බිත්තිය ${data.smartMoneyOIWall} හි පවතින අතර, සිල්ලර Long ස්ථාන
              අවදානම සැලකිල්ලට ගෙන වෙළඳාම් සැලසුම් කරන්න.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
