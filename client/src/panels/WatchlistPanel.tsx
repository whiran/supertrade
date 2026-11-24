import React, { useState, useEffect } from 'react';
import { useMarketStore } from '../store/marketStore.js';

interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

function normalizeNewSymbol(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (s.includes(':')) return s;

  // Commodities & Metals
  if (/^(XAU|XAG|XPT|XPD|OIL|USOIL|BCO|CRUDE)/.test(s)) {
    return `COMMODITY:${s.replace(/[/_]/g, '')}`;
  }
  // Major Indices
  if (/^(SPX|DJI|IXIC|NDX|RUT|SP500|US30|NAS100)/.test(s)) {
    return `INDEX:${s.replace(/[/_]/g, '')}`;
  }
  // Forex: contains / or _ or 6-letter currency codes
  const clean = s.replace(/[/_]/g, '');
  if (
    s.includes('/') ||
    s.includes('_') ||
    (clean.length === 6 &&
      /^(EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY|TRY|INR|ZAR|MXN|SEK|NOK|SGD|HKD|CNY|CNH|PLN)/.test(clean))
  ) {
    const base = clean.slice(0, 3);
    const quote = clean.slice(3, 6);
    return `OANDA:${base}_${quote}`;
  }
  // Crypto: ends with USDT, USDC, BUSD, BTC, ETH
  if (/(USDT|USDC|BUSD|BTC|ETH|SOL|BNB)$/.test(clean)) {
    return `BINANCE:${clean}`;
  }
  // US Equities: 1-5 letters ticker
  if (/^[A-Z]{1,5}$/.test(clean)) {
    return `ALPACA:${clean}`;
  }
  return `OANDA:${s.replace('/', '_')}`;
}

export const WatchlistPanel: React.FC = () => {
  const { activeSymbol, setSymbol, quotes } = useMarketStore();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeTab, setActiveTab] = useState<string>('forex');
  const [newSymbolInput, setNewSymbolInput] = useState<string>('');

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

  const handleAddSymbol = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSymbolInput.trim() || !currentList) return;

    const normalized = normalizeNewSymbol(newSymbolInput);
    if (!currentList.symbols.includes(normalized)) {
      const updatedSymbols = [...currentList.symbols, normalized];
      const updatedList = { ...currentList, symbols: updatedSymbols };

      setWatchlists((prev) =>
        prev.map((w) => (w.id === currentList.id ? updatedList : w))
      );

      // Persist to server SQLite
      fetch(`/api/watchlists/${currentList.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: currentList.name, symbols: updatedSymbols }),
      }).catch((err) => console.warn('[WatchlistPanel] Save error:', err));
    }

    setSymbol(normalized);
    setNewSymbolInput('');
  };

  const handleRemoveSymbol = (symToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentList) return;

    const updatedSymbols = currentList.symbols.filter((s) => s !== symToRemove);
    const updatedList = { ...currentList, symbols: updatedSymbols };

    setWatchlists((prev) =>
      prev.map((w) => (w.id === currentList.id ? updatedList : w))
    );

    fetch(`/api/watchlists/${currentList.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentList.name, symbols: updatedSymbols }),
    }).catch((err) => console.warn('[WatchlistPanel] Save error:', err));
  };

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs">
      {/* Preset Tabs */}
      <div className="flex border-b border-[#2a2e39] px-2 pt-2 bg-[#131722] overflow-x-auto space-x-0.5">
        {watchlists.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveTab(w.id)}
            className={`px-2.5 py-1.5 font-semibold text-xs rounded-t border-b-2 transition-colors whitespace-nowrap ${
              activeTab === w.id
                ? 'border-[#2962ff] text-white bg-[#1e222d]'
                : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            {w.name}
          </button>
        ))}
      </div>

      {/* Quick Add Symbol Input Bar */}
      <form
        onSubmit={handleAddSymbol}
        className="p-2 border-b border-[#2a2e39] bg-[#1a1e29] flex items-center space-x-1.5"
      >
        <span className="text-[#787b86] text-xs">➕</span>
        <input
          type="text"
          value={newSymbolInput}
          onChange={(e) => setNewSymbolInput(e.target.value)}
          placeholder="Add pair (e.g. EUR/TRY, USD/CHF, XAU)..."
          className="flex-1 bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-xs text-white placeholder-[#787b86] outline-none focus:border-[#2962ff]"
        />
        <button
          type="submit"
          className="bg-[#2962ff] hover:bg-[#1e53e5] text-white font-bold px-2.5 py-1 rounded text-xs transition-colors"
        >
          Add
        </button>
      </form>

      {/* Symbols Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2a2e39]">
        {currentList?.symbols.map((sym) => {
          const quote = quotes.get(sym);
          const isSelected = sym === activeSymbol;
          const displaySym = sym.split(':')[1] || sym;
          const prefix = sym.split(':')[0] || '';

          return (
            <div
              key={sym}
              onClick={() => setSymbol(sym)}
              className={`group flex items-center justify-between p-2.5 cursor-pointer hover:bg-[#2a2e39] transition-colors ${
                isSelected ? 'bg-[#2962ff18] border-l-2 border-[#2962ff]' : ''
              }`}
            >
              <div>
                <div className="font-bold text-white text-xs">{displaySym}</div>
                <div className="text-[10px] text-[#787b86]">{prefix}</div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="font-mono text-white text-xs font-semibold">
                    {quote ? quote.last.toFixed(4) : '—'}
                  </div>
                  <div className="font-mono text-[10px] text-[#787b86]">
                    {quote ? `${quote.spreadBps.toFixed(1)} bps` : 'Connecting...'}
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemoveSymbol(sym, e)}
                  title="Remove from watchlist"
                  className="opacity-0 group-hover:opacity-100 text-[#787b86] hover:text-[#ef5350] px-1 py-0.5 text-xs font-bold transition-opacity"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
