import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type IPriceLine,
} from 'lightweight-charts';
import type { CanonicalBar, LiveQuote, Timeframe, FeedQuality } from '@tv/shared';
import { wsClient } from '../lib/wsClient.js';
import { DrawingController } from './DrawingController.js';
import { IndicatorEngine } from './IndicatorEngine.js';
import { useMarketStore, type ChartAggregationType } from '../store/marketStore.js';
import { GuardianIndicator, type GuardianState } from '../indicators/custom/guardian.js';

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

const TF_SECONDS: Record<Timeframe, number> = {
  '1s': 1,
  '5s': 5,
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
};

function computeHeikinAshi(bars: CanonicalBar[]): CanonicalBar[] {
  if (!bars || bars.length === 0) return [];
  const haBars: CanonicalBar[] = [];
  let prevOpen = bars[0].open;
  let prevClose = bars[0].close;

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = (b.open + b.high + b.low + b.close) / 4;
    const haOpen = i === 0 ? (b.open + b.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(b.high, haOpen, haClose);
    const haLow = Math.min(b.low, haOpen, haClose);

    haBars.push({
      time: b.time,
      open: +haOpen.toFixed(4),
      high: +haHigh.toFixed(4),
      low: +haLow.toFixed(4),
      close: +haClose.toFixed(4),
      volume: b.volume,
      isFinal: b.isFinal,
    });

    prevOpen = haOpen;
    prevClose = haClose;
  }
  return haBars;
}

function roundToTick(val: number, tick: number): number {
  if (!tick || tick <= 0 || tick === 1) return val;
  return +(Math.round(val / tick) * tick).toFixed(4);
}

function getPrecisionForTick(tick: number): number {
  if (tick >= 1) return 2;
  const str = tick.toString();
  const dec = str.split('.')[1];
  return dec ? dec.length : 2;
}

function createMainSeries(chart: IChartApi, type: ChartAggregationType, tick: number = 1): ISeriesApi<any> {
  const minMove = tick > 0 ? tick : 0.01;
  const precision = getPrecisionForTick(minMove);
  const priceFormat = { type: 'price' as const, minMove, precision };

  switch (type) {
    case 'hollow':
      return chart.addSeries(CandlestickSeries, {
        upColor: '#131722',
        downColor: '#ef5350',
        borderVisible: true,
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        priceFormat,
      });
    case 'bars':
      return chart.addSeries(BarSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        priceFormat,
      });
    case 'line':
      return chart.addSeries(LineSeries, {
        color: '#2962ff',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        priceFormat,
      });
    case 'area':
      return chart.addSeries(AreaSeries, {
        lineColor: '#2962ff',
        topColor: '#2962ff55',
        bottomColor: '#2962ff00',
        lineWidth: 2,
        priceFormat,
      });
    case 'baseline':
      return chart.addSeries(BaselineSeries, {
        topLineColor: '#26a69a',
        bottomLineColor: '#ef5350',
        topFillColor1: '#26a69a33',
        bottomFillColor1: '#ef535033',
        lineWidth: 2,
        priceFormat,
      });
    case 'heikin_ashi':
    case 'candles':
    default:
      return chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        priceFormat,
      });
  }
}

function formatBarsForSeries(bars: CanonicalBar[], type: ChartAggregationType, tick: number = 1): any[] {
  if (type === 'heikin_ashi') {
    const haBars = computeHeikinAshi(bars);
    return haBars.map((b) => ({
      time: b.time as any,
      open: roundToTick(b.open, tick),
      high: roundToTick(b.high, tick),
      low: roundToTick(b.low, tick),
      close: roundToTick(b.close, tick),
    }));
  }
  if (type === 'line' || type === 'area' || type === 'baseline') {
    return bars.map((b) => ({
      time: b.time as any,
      value: roundToTick(b.close, tick),
    }));
  }
  return bars.map((b) => ({
    time: b.time as any,
    open: roundToTick(b.open, tick),
    high: roundToTick(b.high, tick),
    low: roundToTick(b.low, tick),
    close: roundToTick(b.close, tick),
  }));
}

function updateSeriesWithBar(
  series: ISeriesApi<any>,
  bar: CanonicalBar,
  type: ChartAggregationType,
  allBars: CanonicalBar[],
  tick: number = 1
): void {
  if (type === 'heikin_ashi') {
    const len = allBars.length;
    const prevBar = len > 1 ? allBars[len - 2] : null;
    const prevClose = prevBar ? (prevBar.open + prevBar.high + prevBar.low + prevBar.close) / 4 : bar.open;
    const prevOpen = prevBar ? (prevBar.open + prevBar.close) / 2 : bar.open;
    const haOpen = (prevOpen + prevClose) / 2;
    const haClose = (bar.open + bar.high + bar.low + bar.close) / 4;
    const haHigh = Math.max(bar.high, haOpen, haClose);
    const haLow = Math.min(bar.low, haOpen, haClose);

    series.update({
      time: bar.time as any,
      open: roundToTick(+haOpen.toFixed(4), tick),
      high: roundToTick(+haHigh.toFixed(4), tick),
      low: roundToTick(+haLow.toFixed(4), tick),
      close: roundToTick(+haClose.toFixed(4), tick),
    });
    return;
  }
  if (type === 'line' || type === 'area' || type === 'baseline') {
    series.update({
      time: bar.time as any,
      value: roundToTick(bar.close, tick),
    });
    return;
  }
  series.update({
    time: bar.time as any,
    open: roundToTick(bar.open, tick),
    high: roundToTick(bar.high, tick),
    low: roundToTick(bar.low, tick),
    close: roundToTick(bar.close, tick),
  });
}

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
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const barsRef = useRef<CanonicalBar[]>([]);

  const drawingControllerRef = useRef<DrawingController | null>(null);
  const indicatorEngineRef = useRef<IndicatorEngine | null>(null);
  const isMountedRef = useRef<boolean>(false);

  const guardianRef = useRef<GuardianIndicator>(new GuardianIndicator());
  const guardianMarkersRef = useRef<ISeriesMarkersPluginApi<any> | null>(null);
  const guardianPriceLinesRef = useRef<IPriceLine[]>([]);
  const [guardianState, setGuardianState] = useState<GuardianState | null>(null);

  const { activeDrawingTool, magnetMode, chartAggregation, tickSize, activeIndicators } = useMarketStore();
  const guardianActive = activeIndicators.includes('GUARDIAN');
  const guardianActiveRef = useRef<boolean>(guardianActive);
  guardianActiveRef.current = guardianActive;

  const chartAggregationRef = useRef<ChartAggregationType>(chartAggregation);
  const tickSizeRef = useRef<number>(tickSize);
  chartAggregationRef.current = chartAggregation;
  tickSizeRef.current = tickSize;

  const prevAggRef = useRef<ChartAggregationType>(chartAggregation);
  const prevTickRef = useRef<number>(tickSize);

  const clearGuardianOverlay = useCallback((series: ISeriesApi<any> | null) => {
    if (guardianMarkersRef.current) {
      try {
        guardianMarkersRef.current.detach();
      } catch {
        // ignore
      }
      guardianMarkersRef.current = null;
    }
    if (series && guardianPriceLinesRef.current.length > 0) {
      for (const line of guardianPriceLinesRef.current) {
        try {
          series.removePriceLine(line);
        } catch {
          // ignore
        }
      }
    }
    guardianPriceLinesRef.current = [];
  }, []);

  const syncGuardianOverlay = useCallback(
    (series: ISeriesApi<any> | null) => {
      clearGuardianOverlay(series);
      if (!guardianActiveRef.current || !series || barsRef.current.length === 0) {
        setGuardianState(null);
        return;
      }

      const state = guardianRef.current.calculate(barsRef.current);
      setGuardianState(state);

      // Build sorted LWC v5 markers for Structure Breaks + Swing Points + EQH/EQL
      const markers: Array<{
        time: any;
        position: 'aboveBar' | 'belowBar' | 'inBar';
        color: string;
        shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
        text: string;
      }> = [];

      for (const sb of state.structureBreaks.slice(-30)) {
        markers.push({
          time: sb.breakTime as any,
          position: sb.bull ? 'belowBar' : 'aboveBar',
          color: sb.bull ? '#089981' : '#f23645',
          shape: sb.bull ? 'arrowUp' : 'arrowDown',
          text: `${sb.kind === 'swing' ? 'S-' : ''}${sb.label}`,
        });
      }

      for (const lbl of state.swingLabels.slice(-20)) {
        markers.push({
          time: lbl.time as any,
          position: lbl.bull ? 'belowBar' : 'aboveBar',
          color: lbl.bull ? '#26a69a' : '#ef5350',
          shape: 'circle',
          text: lbl.text,
        });
      }

      for (const eq of state.eqLevels.slice(0, 10)) {
        markers.push({
          time: eq.endTime as any,
          position: eq.kind === 'EQL' ? 'belowBar' : 'aboveBar',
          color: eq.kind === 'EQL' ? '#089981' : '#f23645',
          shape: 'square',
          text: eq.kind,
        });
      }

      markers.sort((a, b) => Number(a.time) - Number(b.time));
      if (markers.length > 0) {
        try {
          guardianMarkersRef.current = createSeriesMarkers(series, markers);
        } catch {
          // ignore if series does not support markers
        }
      }

      // Price lines: Strong/Weak High/Low, Equilibrium, Top Volumetric OBs
      const lines: IPriceLine[] = [];
      if (state.strongWeak) {
        lines.push(
          series.createPriceLine({
            price: state.strongWeak.high,
            color: '#f23645',
            lineWidth: 1,
            lineStyle: 0,
            axisLabelVisible: true,
            title: `${state.strongWeak.highLabel} (${state.strongWeak.highPct}%)`,
          }),
          series.createPriceLine({
            price: state.strongWeak.equilibrium,
            color: '#787b86',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Equilibrium',
          }),
          series.createPriceLine({
            price: state.strongWeak.low,
            color: '#089981',
            lineWidth: 1,
            lineStyle: 0,
            axisLabelVisible: true,
            title: `${state.strongWeak.lowLabel} (${state.strongWeak.lowPct}%)`,
          })
        );
      }

      for (const ob of state.bullOrderBlocks.slice(0, 2)) {
        lines.push(
          series.createPriceLine({
            price: ob.mid,
            color: '#089981',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: false,
            title: `Bull OB (${ob.volumePct}%)`,
          })
        );
      }
      for (const ob of state.bearOrderBlocks.slice(0, 2)) {
        lines.push(
          series.createPriceLine({
            price: ob.mid,
            color: '#f23645',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: false,
            title: `Bear OB (${ob.volumePct}%)`,
          })
        );
      }

      guardianPriceLinesRef.current = lines;
    },
    [clearGuardianOverlay]
  );

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
    isMountedRef.current = true;
    let cancelled = false;
    barsRef.current = [];

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
        rightOffset: 3,
        barSpacing: 9,
        minBarSpacing: 1.5,
      },
      autoSize: true,
    });
    chartRef.current = chart;

    // Main Series according to active aggregation (Candles, Heikin-Ashi, Hollow, Bars, Line, Area, Baseline)
    const mainSeries = createMainSeries(chart, chartAggregationRef.current, tickSizeRef.current);
    mainSeriesRef.current = mainSeries;

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
    const drawingCtrl = new DrawingController(chart, mainSeries as any, barsRef, magnetMode);
    drawingControllerRef.current = drawingCtrl;
    drawingCtrl.loadFromServer(symbol);

    const indEngine = new IndicatorEngine(chart);
    indicatorEngineRef.current = indEngine;

    // Auto-scale event listener
    const handleAutoScale = () => {
      chart.timeScale().fitContent();
      chart.priceScale('right').applyOptions({ autoScale: true });
    };
    window.addEventListener('tv:auto-scale', handleAutoScale);

    // Crosshair inspection without React re-renders
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        if (barsRef.current.length > 0) {
          updateLegend(barsRef.current[barsRef.current.length - 1]);
        }
        return;
      }
      const series = mainSeriesRef.current || mainSeries;
      const data = param.seriesData.get(series) as any;
      if (data) {
        const open = data.open ?? data.value ?? 0;
        const high = data.high ?? data.value ?? 0;
        const low = data.low ?? data.value ?? 0;
        const close = data.close ?? data.value ?? 0;
        updateLegend({
          time: Number(param.time),
          open,
          high,
          low,
          close,
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
        if (!res.ok || cancelled) return;
        const { bars } = (await res.json()) as { bars: CanonicalBar[] };
        if (cancelled) return;
        if (bars && bars.length > 0) {
          barsRef.current = bars;
          const currentSeries = mainSeriesRef.current || mainSeries;
          currentSeries.setData(
            formatBarsForSeries(bars, chartAggregationRef.current, tickSizeRef.current)
          );
          volumeSeries.setData(
            bars.map((b) => ({
              time: b.time as any,
              value: b.volume,
              color: b.close >= b.open ? '#26a69a44' : '#ef535044',
            }))
          );
          updateLegend(bars[bars.length - 1]);
          chart.timeScale().scrollToRealTime();
          syncGuardianOverlay(currentSeries);
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
      try {
        const currentSeries = mainSeriesRef.current || mainSeries;
        const lastBar = barsRef.current[barsRef.current.length - 1];
        if (lastBar && bar.time < lastBar.time) {
          return; // Ignore out-of-order stale ticks
        }

        // Bridge minor 1-3 tick network gaps if needed
        const intervalSec = TF_SECONDS[timeframe] || 60;
        if (lastBar && bar.time > lastBar.time + intervalSec && bar.time <= lastBar.time + 3 * intervalSec) {
          for (let t = lastBar.time + intervalSec; t < bar.time; t += intervalSec) {
            const bridgeBar: CanonicalBar = {
              time: t,
              open: lastBar.close,
              high: lastBar.close,
              low: lastBar.close,
              close: lastBar.close,
              volume: 0,
              isFinal: true,
            };
            updateSeriesWithBar(
              currentSeries,
              bridgeBar,
              chartAggregationRef.current,
              barsRef.current,
              tickSizeRef.current
            );
            volumeSeries.update({
              time: bridgeBar.time as any,
              value: 0,
              color: '#787b8622',
            });
            barsRef.current.push(bridgeBar);
          }
        }

        updateSeriesWithBar(
          currentSeries,
          bar,
          chartAggregationRef.current,
          barsRef.current,
          tickSizeRef.current
        );
        volumeSeries.update({
          time: bar.time as any,
          value: bar.volume,
          color: bar.close >= bar.open ? '#26a69a44' : '#ef535044',
        });

        if (barsRef.current.length > 0) {
          const lastIdx = barsRef.current.length - 1;
          if (barsRef.current[lastIdx].time === bar.time) {
            barsRef.current[lastIdx] = bar;
          } else {
            barsRef.current.push(bar);
          }
        } else {
          barsRef.current.push(bar);
        }
        updateLegend(bar);
        indEngine.onBarUpdate(bar);
        if (guardianActiveRef.current) {
          syncGuardianOverlay(currentSeries);
        }
        onBarUpdate?.(bar);
      } catch (err) {
        console.warn('[ChartCanvas] Bar update warning:', err);
      }
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
      cancelled = true;
      isMountedRef.current = false;
      clearGuardianOverlay(mainSeriesRef.current);
      window.removeEventListener('tv:auto-scale', handleAutoScale);
      drawingCtrl.saveToServer();
      drawingCtrl.destroy();
      indEngine.destroy();
      unsubWs();
      unsubBar();
      unsubQuote();
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
    };
  }, [symbol, timeframe, updateLegend, onBarUpdate, magnetMode]);

  // Dynamic Chart Aggregation & Tick Size switcher without resetting chart layout
  useEffect(() => {
    if (prevAggRef.current === chartAggregation && prevTickRef.current === tickSize) {
      return;
    }
    prevAggRef.current = chartAggregation;
    prevTickRef.current = tickSize;

    if (!isMountedRef.current) return;

    const chart = chartRef.current;
    if (!chart || !mainSeriesRef.current) return;

    try {
      chart.removeSeries(mainSeriesRef.current);
    } catch {
      // ignore
    }

    const newSeries = createMainSeries(chart, chartAggregation, tickSize);
    mainSeriesRef.current = newSeries;

    if (barsRef.current.length > 0) {
      newSeries.setData(formatBarsForSeries(barsRef.current, chartAggregation, tickSize));
    }

    if (drawingControllerRef.current) {
      drawingControllerRef.current.setSeries(newSeries);
    }
    syncGuardianOverlay(newSeries);
  }, [chartAggregation, tickSize, syncGuardianOverlay]);

  // Re-sync Guardian overlay whenever GUARDIAN is toggled in Indicators modal
  useEffect(() => {
    syncGuardianOverlay(mainSeriesRef.current);
  }, [guardianActive, syncGuardianOverlay]);

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

      {/* Guardian (Guardeer) SMC + Impulse HUD */}
      {guardianActive && guardianState && (
        <div className="absolute top-9 right-3 z-10 bg-[#131722e6] border border-[#2a2e39] rounded-md px-2.5 py-2 text-[10px] font-mono text-[#d1d4dc] shadow-xl pointer-events-none min-w-[205px] space-y-1">
          <div className="flex items-center justify-between border-b border-[#2a2e39] pb-1">
            <span className="font-extrabold text-[#00e5ff] tracking-wide">GUARDIAN SMC</span>
            <span
              className={`font-bold ${
                guardianState.impulseTrend.signal === 'BULLISH'
                  ? 'text-[#089981]'
                  : guardianState.impulseTrend.signal === 'BEARISH'
                    ? 'text-[#f23645]'
                    : 'text-[#787b86]'
              }`}
            >
              {guardianState.impulseTrend.signal === 'BULLISH'
                ? '🟢 BULL'
                : guardianState.impulseTrend.signal === 'BEARISH'
                  ? '🔴 BEAR'
                  : '⚫ NEUT'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787b86]">Internal:</span>
            <span
              className={
                guardianState.internalTrend > 0
                  ? 'text-[#089981] font-bold'
                  : guardianState.internalTrend < 0
                    ? 'text-[#f23645] font-bold'
                    : 'text-[#787b86]'
              }
            >
              {guardianState.internalTrend > 0 ? 'BULLISH' : guardianState.internalTrend < 0 ? 'BEARISH' : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787b86]">Swing:</span>
            <span
              className={
                guardianState.swingTrend > 0
                  ? 'text-[#089981] font-bold'
                  : guardianState.swingTrend < 0
                    ? 'text-[#f23645] font-bold'
                    : 'text-[#787b86]'
              }
            >
              {guardianState.swingTrend > 0 ? 'BULLISH' : guardianState.swingTrend < 0 ? 'BEARISH' : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787b86]">Order Blocks:</span>
            <span>
              <span className="text-[#089981] font-bold">{guardianState.bullOrderBlocks.length}B</span>
              {' / '}
              <span className="text-[#f23645] font-bold">{guardianState.bearOrderBlocks.length}S</span>
              {' · '}
              <span className="text-[#38bdf8]">{guardianState.fvgs.length} FVG</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787b86]">Pattern:</span>
            <span
              className={
                guardianState.detectedPattern.bull === true
                  ? 'text-[#089981] font-bold'
                  : guardianState.detectedPattern.bull === false
                    ? 'text-[#f23645] font-bold'
                    : 'text-[#787b86]'
              }
            >
              {guardianState.detectedPattern.found}
            </span>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
