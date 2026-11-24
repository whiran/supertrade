import React, { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import type { CanonicalBar, LiveQuote, Timeframe, FeedQuality } from '@tv/shared';
import { wsClient } from '../lib/wsClient.js';
import { DrawingController } from './DrawingController.js';
import { IndicatorEngine } from './IndicatorEngine.js';
import { useMarketStore } from '../store/marketStore.js';

interface Props {
  symbol: string;
  timeframe: Timeframe;
  onBarUpdate?: (bar: CanonicalBar) => void;
  syncCrosshairs?: boolean;
}

const FEED_TOOLTIPS: Record<FeedQuality, { label: string; bg: string; color: string; desc: string }> = {
  LIVE_EXCHANGE: {
    label: 'LIVE',
    bg: '#26a69a22',
    color: '#26a69a',
    desc: 'Exchange Direct Feed — 100% volume, sub-millisecond execution',
  },
  LIVE_BROKER_DEMO: {
    label: 'DEMO',
    bg: '#2962ff22',
    color: '#2962ff',
    desc: 'OANDA Practice v20 Demo Feed — Simulated broker prices',
  },
  LIVE_IEX_PARTIAL_VOL: {
    label: 'IEX VOL',
    bg: '#f59e0b22',
    color: '#f59e0b',
    desc: 'IEX Partial Volume: Represents ~2-4% of total US consolidated volume. VWAP, RVOL and Volume Profiles may be inaccurate.',
  },
  DELAYED_15M: {
    label: '15m DELAY',
    bg: '#ef535022',
    color: '#ef5350',
    desc: '15-minute delayed SIP data feed',
  },
};

export const ChartCanvas: React.FC<Props> = ({
  symbol,
  timeframe,
  onBarUpdate,
  syncCrosshairs,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const barsRef = useRef<CanonicalBar[]>([]);

  const drawingControllerRef = useRef<DrawingController | null>(null);
  const indicatorEngineRef = useRef<IndicatorEngine | null>(null);

  const { activeDrawingTool, magnetMode } = useMarketStore();

  // Zero-react-render DOM legend updater
  const updateLegend = useCallback(
    (bar: CanonicalBar | null) => {
      if (!legendRef.current) return;
      if (!bar) {
        legendRef.current.innerHTML = `<span class="font-bold text-white">${symbol}</span> · ${timeframe}`;
        return;
      }
      const isUp = bar.close >= bar.open;
      const colorCls = isUp ? 'text-[#26a69a]' : 'text-[#ef5350]';
      const change = bar.close - bar.open;
      const changePct = bar.open > 0 ? (change / bar.open) * 100 : 0;

      legendRef.current.innerHTML = `
        <span class="font-bold text-white mr-3">${symbol}</span>
        <span class="text-[#787b86] mr-2">O <span class="${colorCls}">${bar.open.toFixed(4)}</span></span>
        <span class="text-[#787b86] mr-2">H <span class="${colorCls}">${bar.high.toFixed(4)}</span></span>
        <span class="text-[#787b86] mr-2">L <span class="${colorCls}">${bar.low.toFixed(4)}</span></span>
        <span class="text-[#787b86] mr-2">C <span class="${colorCls}">${bar.close.toFixed(4)}</span></span>
        <span class="${colorCls} font-semibold">${change >= 0 ? '+' : ''}${change.toFixed(4)} (${changePct.toFixed(2)}%)</span>
        <span class="text-[#787b86] ml-2">Vol <span class="text-white">${bar.volume.toLocaleString()}</span></span>
      `;
    },
    [symbol, timeframe]
  );

  // Initialize LWC v5 chart instance
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#131722' },
        textColor: '#787b86',
        attributionLogo: true, // Apache-2.0 compliance per spec
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: CrosshairMode.MagnetOHLC,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: timeframe === '1s' || timeframe === '5s',
      },
      autoSize: true,
    });
    chartRef.current = chart;

    // Main Candlestick Series - REQUIRED v5 API
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candleSeriesRef.current = candleSeries;

    // Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Setup Drawing & Indicator Controllers
    const drawingCtrl = new DrawingController(chart, candleSeries, barsRef, magnetMode);
    drawingControllerRef.current = drawingCtrl;
    drawingCtrl.loadFromServer(symbol);

    const indEngine = new IndicatorEngine(chart);
    indicatorEngineRef.current = indEngine;

    // Crosshair inspection without React re-renders
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        if (barsRef.current.length > 0) {
          updateLegend(barsRef.current[barsRef.current.length - 1]);
        }
        return;
      }
      const data = param.seriesData.get(candleSeries) as any;
      if (data) {
        updateLegend({
          time: Number(param.time),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: 0,
          isFinal: true,
        });
      }
    });

    // 1. Fetch historical bars and call series.setData() exactly ONCE
    async function loadHistory() {
      try {
        const res = await fetch(
          `/api/history?symbol=${encodeURIComponent(symbol)}&tf=${timeframe}&limit=1000`
        );
        if (!res.ok) return;
        const { bars } = (await res.json()) as { bars: CanonicalBar[] };
        if (bars && bars.length > 0) {
          barsRef.current = bars;
          candleSeries.setData(
            bars.map((b) => ({
              time: b.time as any,
              open: b.open,
              high: b.high,
              low: b.low,
              close: b.close,
            }))
          );
          volumeSeries.setData(
            bars.map((b) => ({
              time: b.time as any,
              value: b.volume,
              color: b.close >= b.open ? '#26a69a44' : '#ef535044',
            }))
          );
          updateLegend(bars[bars.length - 1]);
        }
      } catch (err) {
        console.warn('[ChartCanvas] History fetch error:', err);
      }
    }

    loadHistory();

    // 2. Subscribe to live WS updates
    const unsubWs = wsClient.subscribe(symbol, timeframe);

    const unsubBar = wsClient.onBar((s, tf, bar) => {
      if (s !== symbol || tf !== timeframe) return;
      candleSeries.update({
        time: bar.time as any,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      });
      volumeSeries.update({
        time: bar.time as any,
        value: bar.volume,
        color: bar.close >= bar.open ? '#26a69a44' : '#ef535044',
      });

      if (bar.isFinal) {
        barsRef.current.push(bar);
      } else if (barsRef.current.length > 0) {
        barsRef.current[barsRef.current.length - 1] = bar;
      }
      updateLegend(bar);
      indEngine.onBarUpdate(bar);
      onBarUpdate?.(bar);
    });

    const unsubQuote = wsClient.onQuote((quote) => {
      if (quote.symbol !== symbol) return;
      indEngine.setFeedQuality(quote.feedQuality);
      if (badgeRef.current) {
        const badge = FEED_TOOLTIPS[quote.feedQuality] || FEED_TOOLTIPS.LIVE_EXCHANGE;
        badgeRef.current.textContent = badge.label;
        badgeRef.current.style.backgroundColor = badge.bg;
        badgeRef.current.style.color = badge.color;
        badgeRef.current.title = `${badge.desc} (Spread: ${quote.spreadBps.toFixed(1)} bps)`;
      }
    });

    return () => {
      drawingCtrl.saveToServer();
      drawingCtrl.destroy();
      indEngine.destroy();
      unsubWs();
      unsubBar();
      unsubQuote();
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, timeframe, updateLegend, onBarUpdate, magnetMode]);

  // Sync active tool changes to drawing controller
  useEffect(() => {
    drawingControllerRef.current?.setTool(activeDrawingTool);
  }, [activeDrawingTool]);

  return (
    <div className="relative w-full h-full bg-[#131722] overflow-hidden">
      {/* Top Left OHLCV Legend */}
      <div
        ref={legendRef}
        className="absolute top-2 left-3 z-10 pointer-events-none text-xs flex items-center bg-[#131722cc] px-2 py-1 rounded"
      />

      {/* Top Right Feed Quality Provenance Badge */}
      <div
        ref={badgeRef}
        className="absolute top-2 right-3 z-10 text-[10px] font-bold px-2 py-0.5 rounded cursor-help transition-colors"
        style={{ backgroundColor: '#26a69a22', color: '#26a69a' }}
        title="Exchange Direct Live Feed"
      >
        LIVE
      </div>

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
