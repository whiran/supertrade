import React, { useState, useEffect } from 'react';
import { useMarketStore } from '../store/marketStore.js';
import type { CalendarEvent } from '@tv/shared';

interface NewsItem {
  headline: string;
  url: string;
  datetime: number;
  source: string;
  summary: string;
}

export const CalendarNewsPanel: React.FC = () => {
  const { activeSymbol } = useMarketStore();
  const [activeTab, setActiveTab] = useState<'news' | 'calendar'>('news');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (activeTab === 'news') {
      fetch(`/api/news/${encodeURIComponent(activeSymbol)}`)
        .then((r) => r.json())
        .then(({ news }) => {
          if (news) setNews(news);
        })
        .catch((err) => console.warn('[CalendarNewsPanel] News error:', err));
    } else {
      fetch('/api/calendar')
        .then((r) => r.json())
        .then(({ events }) => {
          if (events) setEvents(events);
        })
        .catch((err) => console.warn('[CalendarNewsPanel] Calendar error:', err));
    }
  }, [activeTab, activeSymbol]);

  return (
    <div className="flex flex-col h-full bg-[#1e222d] text-[#d1d4dc] text-xs p-3">
      {/* Tab Switcher */}
      <div className="flex border-b border-[#2a2e39] space-x-2 mb-3">
        <button
          onClick={() => setActiveTab('news')}
          className={`pb-1.5 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'news'
              ? 'border-[#2962ff] text-white'
              : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          Company & Market News
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-1.5 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'calendar'
              ? 'border-[#2962ff] text-white'
              : 'border-transparent text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          Forex Economic Calendar
        </button>
      </div>

      {/* Tab 1: News Feed */}
      {activeTab === 'news' && (
        <div className="flex-1 overflow-y-auto space-y-2.5">
          {news.length === 0 ? (
            <div className="text-center text-[#787b86] py-8">
              No recent news for {activeSymbol}.
              <div className="text-[10px] mt-1 text-[#50535e]">
                (Configure FINNHUB_API_KEY for full live headlines)
              </div>
            </div>
          ) : (
            news.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block bg-[#131722] p-2.5 rounded border border-[#2a2e39] hover:border-[#2962ff] transition-colors"
              >
                <div className="font-bold text-white mb-1 line-clamp-2">{item.headline}</div>
                <div className="flex justify-between text-[10px] text-[#787b86]">
                  <span>{item.source}</span>
                  <span>{new Date(item.datetime * 1000).toLocaleDateString()}</span>
                </div>
              </a>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Forex Factory Economic Calendar */}
      {activeTab === 'calendar' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {events.length === 0 ? (
            <div className="text-center text-[#787b86] py-8">Loading weekly economic events...</div>
          ) : (
            events.map((ev, idx) => (
              <div
                key={idx}
                className="bg-[#131722] p-2 rounded border border-[#2a2e39] flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <span className="font-bold text-white">{ev.currency}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        ev.impact === 'high'
                          ? 'bg-[#ef535022] text-[#ef5350]'
                          : ev.impact === 'medium'
                          ? 'bg-[#f59e0b22] text-[#f59e0b]'
                          : 'bg-[#787b8622] text-[#787b86]'
                      }`}
                    >
                      {ev.impact}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#d1d4dc] line-clamp-1">{ev.event}</div>
                  <div className="text-[10px] text-[#787b86]">
                    {new Date(ev.dateTimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono">
                  {ev.actual && <div className="text-[#26a69a] font-bold">{ev.actual}</div>}
                  {ev.forecast && <div className="text-[#787b86]">F: {ev.forecast}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
