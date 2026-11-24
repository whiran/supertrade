import React, { useState, useEffect } from 'react';
import { useMarketStore } from '../store/marketStore.js';
import type { Order, Position } from '@tv/shared';

export const PaperTradingPanel: React.FC = () => {
  const { activeSymbol, quotes } = useMarketStore();
  const quote = quotes.get(activeSymbol);

  const [activeTab, setActiveTab] = useState<'trade' | 'positions' | 'orders'>('trade');
  const [account, setAccount] = useState<{ balance: number; equity: number }>({
    balance: 100000,
    equity: 100000,
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Order Entry Form state
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [type, setType] = useState<'market' | 'limit' | 'stop'>('market');
  const [qty, setQty] = useState<string>('1.0');
  const [limitPrice, setLimitPrice] = useState<string>('');

  const refreshAccount = async () => {
    try {
      const [acctRes, posRes, ordRes] = await Promise.all([
        fetch('/api/paper/account'),
        fetch('/api/paper/positions'),
        fetch('/api/paper/orders'),
      ]);
      if (acctRes.ok) setAccount(await acctRes.json());
      if (posRes.ok) {
        const { positions } = await posRes.json();
        setPositions(positions || []);
      }
      if (ordRes.ok) {
        const { orders } = await ordRes.json();
        setOrders(orders || []);
      }
    } catch (err) {
      console.warn('[PaperTradingPanel] Refresh error:', err);
    }
  };

  useEffect(() => {
    refreshAccount();
    const interval = setInterval(refreshAccount, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceOrder = async () => {
    const price =
      type === 'market'
        ? quote?.last || 100
        : parseFloat(limitPrice) || quote?.last || 100;

    await fetch('/api/paper/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: activeSymbol,
        side,
        type,
        qty: parseFloat(qty) || 1,
        price,
        feeBps: 10,
        slippageBps: 5,
      }),
    });

    refreshAccount();
  };

  const handleCancelOrder = async (id: string) => {
    await fetch(`/api/paper/orders/${id}`, { method: 'DELETE' });
    refreshAccount();
  };

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs p-3">
      {/* Account Balance Header */}
      <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] mb-3 flex justify-between items-center">
        <div>
          <div className="text-[10px] text-[#787b86]">ACCOUNT EQUITY</div>
          <div className="text-sm font-bold text-white font-mono">
            ${account.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#787b86]">CASH BALANCE</div>
          <div className="text-xs font-semibold text-[#26a69a] font-mono">
            ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a2e39] space-x-2 mb-3">
        {(['trade', 'positions', 'orders'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-1 font-semibold text-xs border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-[#2962ff] text-white'
                : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: Order Entry Form */}
      {activeTab === 'trade' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide('buy')}
              className={`py-1.5 rounded font-bold text-xs uppercase ${
                side === 'buy' ? 'bg-[#26a69a] text-white' : 'bg-[#131722] text-[#787b86]'
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`py-1.5 rounded font-bold text-xs uppercase ${
                side === 'sell' ? 'bg-[#ef5350] text-white' : 'bg-[#131722] text-[#787b86]'
              }`}
            >
              SELL
            </button>
          </div>

          <div>
            <label className="text-[10px] text-[#787b86] block mb-1">ORDER TYPE</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none"
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#787b86] block mb-1">QUANTITY</label>
            <input
              type="number"
              step="0.1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs font-mono outline-none"
            />
          </div>

          {type !== 'market' && (
            <div>
              <label className="text-[10px] text-[#787b86] block mb-1">LIMIT PRICE</label>
              <input
                type="number"
                placeholder={quote?.last ? String(quote.last) : '0.00'}
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs font-mono outline-none"
              />
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            className={`w-full py-2 rounded font-bold text-xs uppercase text-white shadow-md transition-opacity hover:opacity-90 ${
              side === 'buy' ? 'bg-[#26a69a]' : 'bg-[#ef5350]'
            }`}
          >
            Submit {type} {side}
          </button>
        </div>
      )}

      {/* Tab 2: Open Positions */}
      {activeTab === 'positions' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {positions.length === 0 ? (
            <div className="text-center text-[#787b86] py-6">No open positions</div>
          ) : (
            positions.map((p) => {
              const isProfit = p.unrealizedPnl >= 0;
              return (
                <div key={p.id} className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white">
                      {p.symbol.split(':')[1]} ({p.side.toUpperCase()})
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isProfit ? 'text-[#26a69a]' : 'text-[#ef5350]'
                      }`}
                    >
                      {isProfit ? '+' : ''}
                      {p.unrealizedPnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#787b86]">
                    <span>Qty: {p.qty}</span>
                    <span>Entry: ${p.avgEntryPrice.toFixed(2)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Working Orders */}
      {activeTab === 'orders' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {orders.length === 0 ? (
            <div className="text-center text-[#787b86] py-6">No active orders</div>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="bg-[#131722] p-2 rounded border border-[#2a2e39] flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-white">
                    {o.symbol.split(':')[1]} {o.side.toUpperCase()} {o.type.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-[#787b86]">
                    Qty: {o.qty} @ ${o.price.toFixed(2)} · {o.status}
                  </div>
                </div>
                {o.status === 'open' && (
                  <button
                    onClick={() => handleCancelOrder(o.id)}
                    className="px-2 py-0.5 bg-[#ef535022] hover:bg-[#ef535044] text-[#ef5350] rounded text-[10px] font-bold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
