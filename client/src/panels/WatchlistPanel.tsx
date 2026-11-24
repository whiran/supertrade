import React, { useState, useEffect } from 'react';
import { useMarketStore } from '../store/marketStore.js';

interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

export const WatchlistPanel: React.FC = () => {
  const { activeSymbol, setSymbol, quotes } = useMarketStore();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeTab, setActiveTab] = useState<string>('crypto');

  useEffect(() => {
    fetch('/api/watchlists')
      .then((res) => res.json())
      .then(({ watchlists }: { watchlists: Watchlist[] }) => {
        if (watchlists && watchlists.length > 0) {
          setWatchlists(watchlists);
        }
      })
      .catch((err) => console.warn('[WatchlistPanel] Fetch error:', err));
  }, []);

  const currentList = watchlists.find((w) => w.id === activeTab) || watchlists[0];

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs">
      {/* Preset Tabs */}
      <div className="flex border-b border-[#2a2e39] px-2 pt-2 bg-[#131722] overflow-x-auto">
        {watchlists.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveTab(w.id)}
            className={`px-3 py-1.5 font-semibold text-xs rounded-t border-b-2 transition-colors ${
              activeTab === w.id
                ? 'border-[#2962ff] text-white bg-[#1e222d]'
                : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            {w.name}
          </button>
        ))}
      </div>

      {/* Symbols Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2a2e39]">
        {currentList?.symbols.map((sym) => {
          const quote = quotes.get(sym);
          const isSelected = sym === activeSymbol;
          const displaySym = sym.split(':')[1] || sym;

          return (
            <div
              key={sym}
              onClick={() => setSymbol(sym)}
              className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-[#2a2e39] transition-colors ${
                isSelected ? 'bg-[#2962ff18] border-l-2 border-[#2962ff]' : ''
              }`}
            >
              <div>
                <div className="font-bold text-white text-xs">{displaySym}</div>
                <div className="text-[10px] text-[#787b86]">{sym.split(':')[0]}</div>
              </div>

              <div className="text-right">
                <div className="font-mono text-white text-xs font-semibold">
                  {quote ? quote.last.toFixed(4) : '—'}
                </div>
                <div className="font-mono text-[10px] text-[#787b86]">
                  {quote ? `${quote.spreadBps.toFixed(1)} bps` : 'Connecting...'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
