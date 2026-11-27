import React, { useState } from 'react';
import { useMarketStore } from '../store/marketStore.js';

interface IndicatorItem {
  id: string;
  name: string;
  desc: string;
  category: string;
  badge?: string;
}

export const ALL_INDICATORS: IndicatorItem[] = [
  // 1. Order Flow
  { id: 'CVD', name: 'CVD (Cumulative Volume Delta)', desc: 'Running sum of buyer minus seller market aggression', category: 'Order Flow', badge: 'Standard' },
  { id: 'DELTA', name: 'DELTA (Per-Bar Delta)', desc: 'Buy volume minus sell volume per candle', category: 'Order Flow', badge: 'Standard' },
  { id: 'IMB', name: 'IMB (Footprint Imbalance)', desc: 'Identifies aggressive buying/selling diagonal volume dominance', category: 'Order Flow', badge: 'Standard' },
  { id: 'STK', name: 'STK (Stacked Imbalance)', desc: 'Three or more consecutive imbalance levels in a single bar', category: 'Order Flow', badge: 'Standard' },
  { id: 'CG-ABS', name: 'CG-ABS (Absorption Detector)', desc: 'High volume trading without price progress due to resting limits', category: 'Order Flow', badge: 'Likely' },
  { id: 'WHALE', name: 'WHALE (Institutional Trade Prints)', desc: 'Highlights trades exceeding institutional size thresholds', category: 'Order Flow', badge: 'Standard' },
  { id: 'SIZE-Δ', name: 'SIZE-Δ (Delta by Participant Size)', desc: 'Splits aggression between retail vs institutional sizing', category: 'Order Flow', badge: 'Likely' },
  { id: 'ICEBERG', name: 'ICEBERG (Hidden Order Detector)', desc: 'Detects recurring passive limit refreshes absorbing aggressive flow', category: 'Order Flow', badge: 'Standard' },
  { id: 'PACE', name: 'PACE (Tape Speed)', desc: 'Trades per second metric measuring market urgency', category: 'Order Flow', badge: 'Standard' },
  { id: 'DOM-LIQ', name: 'DOM-LIQ (Depth Liquidity Walls)', desc: 'Renders resting bids and asks from market depth orderbook', category: 'Order Flow', badge: 'Book' },
  { id: 'OF-MACD', name: 'OF-MACD (Order Flow MACD)', desc: 'MACD calculated on CVD to identify momentum of aggression', category: 'Order Flow', badge: 'Momentum' },
  { id: 'ORSI', name: 'ORSI (Order Flow RSI)', desc: 'RSI applied directly to volume delta', category: 'Order Flow', badge: 'Oscillator' },

  // 2. Volume / Delta
  { id: 'VOL', name: 'VOL (Volume Histogram)', desc: 'Candle volume with moving average threshold', category: 'Volume / Delta', badge: 'Core' },
  { id: 'VPVR', name: 'VPVR (Volume Profile Visible Range)', desc: 'Horizontal volume distribution across visible price bars', category: 'Volume / Delta', badge: 'Profile' },
  { id: 'HVN', name: 'HVN (High Volume Node)', desc: 'Prices of maximum volume acceptance and fair value', category: 'Volume / Delta', badge: 'Profile' },
  { id: 'LVN', name: 'LVN (Low Volume Node)', desc: 'Price rejection areas with rapid price transit', category: 'Volume / Delta', badge: 'Profile' },
  { id: 'C_DELTA', name: 'C-DELTA (Candle Delta Overlay)', desc: 'Numeric net delta text printed directly on each candle', category: 'Volume / Delta', badge: 'Delta' },
  { id: 'ABS', name: 'ABS (Absorption Markers)', desc: 'Visual circles marking absorbed aggressive flow', category: 'Volume / Delta', badge: 'OrderFlow' },

  // 3. Structure
  { id: 'GUARDIAN', name: 'GUARDIAN (Guardeer SMC + Impulse)', desc: 'Full Smart Money Structure (BOS/CHoCH/CHoCH+), Volumetric Order Blocks, FVGs, Strong/Weak H/L, EQH/EQL & Impulse Trend', category: 'Structure', badge: 'Special' },
  { id: 'FVG', name: 'FVG (Fair Value Gaps)', desc: '3-candle imbalance gaps where price was delivered inefficiently', category: 'Structure', badge: 'SMC' },
  { id: 'SNR', name: 'SNR (Support & Resistance Auto)', desc: 'Automated horizontal key structure levels', category: 'Structure', badge: 'Standard' },
  { id: 'SMC', name: 'SMC (Smart Money Structure)', desc: 'Break of Structure (BOS) and Change of Character (CHoCH)', category: 'Structure', badge: 'SMC' },
  { id: 'PIVOT', name: 'PIVOT (Floor Pivot Points)', desc: 'Standard intraday floor pivots (PP, R1, R2, S1, S2)', category: 'Structure', badge: 'Standard' },
  { id: 'SESS', name: 'SESS (Trading Sessions)', desc: 'Asian, London and New York session shaded time ranges', category: 'Structure', badge: 'Session' },
  { id: 'WYC', name: 'WYC (Wyckoff Accumulation/Distribution)', desc: 'Automatic labeling of Springs, Upthrusts and Markups', category: 'Structure', badge: 'Wyckoff' },

  // 4. Levels / OI
  { id: 'VWAP', name: 'VWAP (Volume Weighted Average Price)', desc: 'Session benchmark average price weighted by volume', category: 'Levels / OI', badge: 'Standard' },
  { id: 'AVWAP', name: 'AVWAP (Anchored VWAP)', desc: 'VWAP calculated from swing highs, lows or chosen events', category: 'Levels / OI', badge: 'Standard' },
  { id: 'D-OPEN', name: 'D-OPEN (Daily Open Line)', desc: 'Intraday bull/bear dividing line at midnight UTC', category: 'Levels / OI', badge: 'Key Level' },
  { id: 'N-POC', name: 'N-POC (Naked Point of Control)', desc: 'Untested session POCs acting as price magnets', category: 'Levels / OI', badge: 'Magnet' },
  { id: 'OI', name: 'OI (Open Interest Track)', desc: 'Outstanding derivatives contracts trend indicator', category: 'Levels / OI', badge: 'Derivatives' },
  { id: 'OI-WALL', name: 'OI-WALL (Open Interest Concentrations)', desc: 'Massive open interest walls that act as price boundaries', category: 'Levels / OI', badge: 'Wall' },

  // 5. Entry Setup
  { id: 'S.TREND', name: 'S.TREND (SuperTrend)', desc: 'ATR trailing stop trend following indicator', category: 'Entry Setup', badge: 'Trend' },
  { id: 'OB', name: 'OB (Order Blocks)', desc: 'Institutional supply and demand footprint candles', category: 'Entry Setup', badge: 'SMC' },
  { id: 'CHoCH', name: 'CHoCH (Change of Character)', desc: 'First early reversal signal breaking opposite swing structure', category: 'Entry Setup', badge: 'SMC' },
  { id: 'KELTNER', name: 'KELTNER (Keltner Channels)', desc: 'Volatility bands based on ATR around an exponential moving average', category: 'Entry Setup', badge: 'Volatility' },
  { id: 'DONCHIAN', name: 'DONCHIAN (Donchian Channels)', desc: 'Highest high and lowest low bands over N periods', category: 'Entry Setup', badge: 'Channel' },
  { id: 'AUTO_FIB', name: 'AUTO FIB (Automated Fibonacci)', desc: 'Automatic 0.382, 0.5, 0.618 and 0.786 retracements of current swing', category: 'Entry Setup', badge: 'Fib' },

  // 6. ICT Models
  { id: 'OTE', name: 'OTE (Optimal Trade Entry)', desc: 'ICT 62% to 79% Fibonacci equilibrium retracement zone', category: 'ICT Models', badge: 'ICT' },
  { id: 'SILVER', name: 'SILVER (Silver Bullet Window)', desc: 'Fixed New York 1-hour time window liquidity sweep setups', category: 'ICT Models', badge: 'ICT' },
  { id: 'JUDAS', name: 'JUDAS (Judas Swing)', desc: 'Session opening fakeout move engineered to trap breakout liquidity', category: 'ICT Models', badge: 'ICT' },
  { id: 'AMD', name: 'AMD (Accumulation Manipulation Distribution)', desc: 'Power of 3 daily delivery model phases', category: 'ICT Models', badge: 'ICT' },
  { id: 'KILL_ZONE', name: 'KILL ZONE (London/NY Open Windows)', desc: 'Highlights peak institutional execution time windows', category: 'ICT Models', badge: 'ICT' },

  // 7. Pro Tools
  { id: 'SQUEEZE', name: 'SQUEEZE (TTM Volatility Squeeze)', desc: 'Detects Bollinger Bands contracting inside Keltner Channels', category: 'Pro Tools', badge: 'Pro' },
  { id: 'B.BANDS', name: 'B.BANDS (Bollinger Bands)', desc: 'Standard deviation volatility bands (20, 2)', category: 'Pro Tools', badge: 'Standard' },
  { id: 'ATR_CH', name: 'ATR CH (ATR Channel)', desc: 'Multiples of ATR bands plotted around price', category: 'Pro Tools', badge: 'Pro' },
  { id: 'SESS_HL', name: 'SESS H/L (Session Highs and Lows)', desc: 'Labels previous session high/low liquidity target levels', category: 'Pro Tools', badge: 'Levels' },
  { id: 'AI_ZONES', name: 'AI-ZONES (Automated Neural Zones)', desc: 'Deep learning order-flow and volume confluence zones', category: 'Pro Tools', badge: 'AI' },
];

const CATEGORIES = [
  'All',
  'Order Flow',
  'Volume / Delta',
  'Structure',
  'Levels / OI',
  'Entry Setup',
  'ICT Models',
  'Pro Tools',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const IndicatorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { activeIndicators, toggleIndicator } = useMarketStore();
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  if (!isOpen) return null;

  const filtered = ALL_INDICATORS.filter((ind) => {
    const matchCat = selectedCat === 'All' || ind.category === selectedCat;
    const matchSearch =
      ind.name.toLowerCase().includes(search.toLowerCase()) ||
      ind.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-[#00000099] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-[780px] max-h-[85vh] bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[#d1d4dc] text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 border-b border-[#2a2e39] flex justify-between items-center bg-[#131722]">
          <div>
            <div className="font-extrabold text-white text-sm tracking-wide">
              INDICATORS & ORDER FLOW TOOLS
            </div>
            <div className="text-[11px] text-[#787b86]">
              Ultra-precision order flow, volume profiles, Smart Money Concepts & ICT models
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#787b86] hover:text-white text-base font-bold px-2 py-0.5 rounded hover:bg-[#2a2e39]"
          >
            ✕
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 border-b border-[#2a2e39] flex flex-col gap-2.5 bg-[#131722]">
          <input
            autoFocus
            type="text"
            placeholder="Search indicators by name or keyword (e.g. CVD, FVG, VWAP, Squeeze)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1e222d] border border-[#2a2e39] rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#2962ff]"
          />

          <div className="flex space-x-1 overflow-x-auto pb-1 text-[11px]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
                  selectedCat === cat
                    ? 'bg-[#2962ff] text-white'
                    : 'bg-[#1e222d] text-[#787b86] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Indicator Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 bg-[#181b24]">
          {filtered.map((item) => {
            const isActive = activeIndicators.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleIndicator(item.id)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-[#2962ff18] border-[#2962ff]'
                    : 'bg-[#1e222d] border-[#2a2e39] hover:border-[#3b4150]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#131722] text-[#2962ff]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#787b86] line-clamp-2 leading-relaxed">
                    {item.desc}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-[#2a2e3922]">
                  <span className="text-[10px] text-[#50535e]">{item.category}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isActive ? 'bg-[#2962ff] text-white' : 'bg-[#131722] text-[#787b86]'
                    }`}
                  >
                    {isActive ? 'ACTIVE ✓' : '+ ADD'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
