import React, { useState, useEffect } from 'react';
import { useMarketStore } from '../store/marketStore.js';
import type { AlertRule } from '@tv/shared';

export const AlertsPanel: React.FC = () => {
  const { activeSymbol, activeTimeframe, quotes } = useMarketStore();
  const quote = quotes.get(activeSymbol);

  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [triggerPrice, setTriggerPrice] = useState<string>('');
  const [operator, setOperator] = useState<'gt' | 'lt' | 'cross_up' | 'cross_down'>('gt');
  const [webhookUrl, setWebhookUrl] = useState<string>('');

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const { alerts } = await res.json();
        setAlerts(alerts || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreateAlert = async () => {
    const val = parseFloat(triggerPrice);
    if (!val) return;

    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: activeSymbol,
        tf: activeTimeframe,
        conditions: [
          {
            type: 'price_cross',
            operator,
            value: val,
            onBarCloseOnly: false,
          },
        ],
        webhookUrl: webhookUrl || undefined,
        cooldownSec: 60,
        enabled: true,
      }),
    });

    setTriggerPrice('');
    fetchAlerts();
  };

  const handleDeleteAlert = async (id: string) => {
    await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
    fetchAlerts();
  };

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs p-3 space-y-3">
      <div className="font-bold text-sm text-white border-b border-[#2a2e39] pb-2">
        COMPOUND ALERTS & WEBHOOKS
      </div>

      {/* Create Alert Form */}
      <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] space-y-2">
        <div className="font-semibold text-white">Create New Alert</div>

        <div className="flex space-x-2">
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as any)}
            className="bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none"
          >
            <option value="gt">Price &gt;</option>
            <option value="lt">Price &lt;</option>
            <option value="cross_up">Crosses Up</option>
            <option value="cross_down">Crosses Down</option>
          </select>

          <input
            type="number"
            placeholder={quote?.last ? String(quote.last) : 'Target Price'}
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(e.target.value)}
            className="flex-1 bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs font-mono outline-none"
          />
        </div>

        <input
          type="text"
          placeholder="Optional Webhook / Discord URL"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-white text-xs outline-none"
        />

        <button
          onClick={handleCreateAlert}
          className="w-full py-1.5 bg-[#2962ff] hover:bg-[#1e54e4] rounded font-bold text-white transition-colors"
        >
          Arm Alert
        </button>
      </div>

      {/* Active Alerts List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <div className="font-bold text-[#787b86] text-[11px]">ACTIVE ALERTS</div>
        {alerts.length === 0 ? (
          <div className="text-[#787b86] text-center py-6">No armed alerts</div>
        ) : (
          alerts.map((alt) => (
            <div
              key={alt.id}
              className="bg-[#131722] p-2 rounded border border-[#2a2e39] flex justify-between items-center"
            >
              <div>
                <div className="font-bold text-white">
                  {alt.symbol.split(':')[1]} ({alt.tf})
                </div>
                <div className="text-[10px] text-[#787b86]">
                  {alt.conditions.map((c) => `${c.operator} ${c.value}`).join(' & ')}
                </div>
              </div>
              <button
                onClick={() => handleDeleteAlert(alt.id)}
                className="text-[#ef5350] hover:text-white px-2 py-0.5 rounded text-[10px] font-bold"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
