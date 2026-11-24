import {
  type IChartApi,
  type ISeriesApi,
  type IChartApiBase,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import {
  EMA,
  SMA,
  RSI,
  MACD,
  BollingerBands,
  ATR,
  StochasticOscillator,
  OBV,
} from 'trading-signals';
import type { CanonicalBar, FeedQuality } from '@tv/shared';

export interface IndicatorConfig {
  id: string;
  name: string;
  type:
    | 'EMA'
    | 'SMA'
    | 'BollingerBands'
    | 'VWMA'
    | 'RSI'
    | 'MACD'
    | 'ATR'
    | 'Stochastic'
    | 'OBV'
    | 'SuperTrend'
    | 'VWAP'
    | 'Keltner'
    | 'Donchian';
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  multiplier?: number;
  color?: string;
  isOscillator: boolean;
}

interface ActiveIndicator {
  config: IndicatorConfig;
  signalInstance: any;
  series: Array<ISeriesApi<any>>;
  paneIndex?: number;
  recalculate: (bar: CanonicalBar, isUpdate: boolean) => void;
}

export class IndicatorEngine {
  private chart: IChartApi;
  private indicators = new Map<string, ActiveIndicator>();
  private currentFeedQuality: FeedQuality = 'LIVE_EXCHANGE';

  constructor(chart: IChartApi) {
    this.chart = chart;
  }

  setFeedQuality(quality: FeedQuality): void {
    this.currentFeedQuality = quality;
  }

  addIndicator(config: IndicatorConfig, initialBars: CanonicalBar[] = []): string {
    const id = config.id || `ind_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    config.id = id;

    let targetPane: any = this.chart;
    if (config.isOscillator) {
      targetPane = (this.chart as any).addPane();
      if (targetPane && typeof targetPane.setStretchFactor === 'function') {
        targetPane.setStretchFactor(0.22);
      }
    }

    const seriesList: Array<ISeriesApi<any>> = [];
    let signalInstance: any = null;
    let recalculate: (bar: CanonicalBar, isUpdate: boolean) => void = () => {};

    if (config.type === 'EMA') {
      const period = config.period || 20;
      signalInstance = new EMA(period);
      const s = targetPane.addSeries(LineSeries, {
        color: config.color || '#2196f3',
        lineWidth: 2,
        title: `EMA ${period}`,
      });
      seriesList.push(s);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        if (isUpdate) {
          signalInstance.replace(bar.close);
        } else {
          signalInstance.add(bar.close);
        }
        if (signalInstance.isStable) {
          const val = Number(signalInstance.getResult());
          s.update({ time: bar.time as any, value: val });
        }
      };
    } else if (config.type === 'SMA') {
      const period = config.period || 50;
      signalInstance = new SMA(period);
      const s = targetPane.addSeries(LineSeries, {
        color: config.color || '#f59e0b',
        lineWidth: 2,
        title: `SMA ${period}`,
      });
      seriesList.push(s);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        if (isUpdate) {
          signalInstance.replace(bar.close);
        } else {
          signalInstance.add(bar.close);
        }
        if (signalInstance.isStable) {
          const val = Number(signalInstance.getResult());
          s.update({ time: bar.time as any, value: val });
        }
      };
    } else if (config.type === 'BollingerBands') {
      const period = config.period || 20;
      signalInstance = new BollingerBands(period, 2);
      const upper = targetPane.addSeries(LineSeries, { color: '#26a69a', lineWidth: 1 });
      const middle = targetPane.addSeries(LineSeries, { color: '#787b86', lineWidth: 1 });
      const lower = targetPane.addSeries(LineSeries, { color: '#ef5350', lineWidth: 1 });
      seriesList.push(upper, middle, lower);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        if (isUpdate) {
          signalInstance.replace(bar.close);
        } else {
          signalInstance.add(bar.close);
        }
        if (signalInstance.isStable) {
          const res = signalInstance.getResult();
          upper.update({ time: bar.time as any, value: Number(res.upper) });
          middle.update({ time: bar.time as any, value: Number(res.middle) });
          lower.update({ time: bar.time as any, value: Number(res.lower) });
        }
      };
    } else if (config.type === 'RSI') {
      const period = config.period || 14;
      signalInstance = new RSI(period);
      const s = targetPane.addSeries(LineSeries, {
        color: config.color || '#ab47bc',
        lineWidth: 2,
        title: `RSI ${period}`,
      });
      seriesList.push(s);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        if (isUpdate) {
          signalInstance.replace(bar.close);
        } else {
          signalInstance.add(bar.close);
        }
        if (signalInstance.isStable) {
          const val = Number(signalInstance.getResult());
          s.update({ time: bar.time as any, value: val });
        }
      };
    } else if (config.type === 'ATR') {
      const period = config.period || 14;
      signalInstance = new ATR(period);
      const s = targetPane.addSeries(LineSeries, {
        color: config.color || '#ff9800',
        lineWidth: 2,
        title: `ATR ${period}`,
      });
      seriesList.push(s);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        const input = { high: bar.high, low: bar.low, close: bar.close };
        if (isUpdate) {
          signalInstance.replace(input);
        } else {
          signalInstance.add(input);
        }
        if (signalInstance.isStable) {
          const val = Number(signalInstance.getResult());
          s.update({ time: bar.time as any, value: val });
        }
      };
    } else if (config.type === 'Stochastic') {
      const period = config.period || 14;
      signalInstance = new StochasticOscillator({ kPeriod: period, kSlowingPeriod: 3, dPeriod: 3 });
      const kLine = targetPane.addSeries(LineSeries, {
        color: config.color || '#2196f3',
        lineWidth: 2,
        title: `%K ${period}`,
      });
      const dLine = targetPane.addSeries(LineSeries, {
        color: '#ff6d00',
        lineWidth: 1.5,
        title: '%D',
      });
      seriesList.push(kLine, dLine);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        const input = { high: bar.high, low: bar.low, close: bar.close };
        if (isUpdate) {
          signalInstance.replace(input);
        } else {
          signalInstance.add(input);
        }
        if (signalInstance.isStable) {
          const res = signalInstance.getResult();
          kLine.update({ time: bar.time as any, value: Number(res.stochK) });
          dLine.update({ time: bar.time as any, value: Number(res.stochD) });
        }
      };
    } else if (config.type === 'OBV') {
      signalInstance = new OBV(14);
      const s = targetPane.addSeries(LineSeries, {
        color: config.color || '#00bcd4',
        lineWidth: 2,
        title: 'OBV',
      });
      seriesList.push(s);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        const input = { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume };
        if (isUpdate) {
          signalInstance.replace(input);
        } else {
          signalInstance.add(input);
        }
        if (signalInstance.isStable) {
          const val = Number(signalInstance.getResult());
          s.update({ time: bar.time as any, value: val });
        }
      };
    } else if (config.type === 'SuperTrend') {
      // Custom SuperTrend: ATR-based trailing stop that flips with trend direction
      const period = config.period || 10;
      const multiplier = config.multiplier || 3;
      const atrInst = new ATR(period);
      const superState = {
        trend: 1 as 1 | -1,
        upperBand: 0,
        lowerBand: 0,
        prevClose: 0,
        initialized: false,
        barCount: 0,
      };
      const upLine = targetPane.addSeries(LineSeries, {
        color: '#26a69a',
        lineWidth: 2,
        title: `S.TREND ↑ (${period},${multiplier})`,
      });
      const downLine = targetPane.addSeries(LineSeries, {
        color: '#ef5350',
        lineWidth: 2,
        title: `S.TREND ↓`,
      });
      seriesList.push(upLine, downLine);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        const input = { high: bar.high, low: bar.low, close: bar.close };
        if (isUpdate) {
          atrInst.replace(input);
        } else {
          atrInst.add(input);
        }
        if (!atrInst.isStable) {
          superState.prevClose = bar.close;
          superState.barCount++;
          return;
        }
        const atr = Number(atrInst.getResult());
        const hl2 = (bar.high + bar.low) / 2;
        let upperBand = hl2 + multiplier * atr;
        let lowerBand = hl2 - multiplier * atr;

        if (superState.initialized) {
          if (lowerBand > superState.lowerBand || superState.prevClose < superState.lowerBand) {
            // keep
          } else {
            lowerBand = superState.lowerBand;
          }
          if (upperBand < superState.upperBand || superState.prevClose > superState.upperBand) {
            // keep
          } else {
            upperBand = superState.upperBand;
          }
        }

        let trend = superState.trend;
        if (!superState.initialized) {
          trend = bar.close > hl2 ? 1 : -1;
          superState.initialized = true;
        } else if (superState.trend === 1 && bar.close < lowerBand) {
          trend = -1;
        } else if (superState.trend === -1 && bar.close > upperBand) {
          trend = 1;
        }

        superState.trend = trend;
        superState.upperBand = upperBand;
        superState.lowerBand = lowerBand;
        superState.prevClose = bar.close;

        if (trend === 1) {
          upLine.update({ time: bar.time as any, value: lowerBand });
          // Push NaN-like far value to hide the down line
          downLine.update({ time: bar.time as any, value: NaN });
        } else {
          downLine.update({ time: bar.time as any, value: upperBand });
          upLine.update({ time: bar.time as any, value: NaN });
        }
      };
    } else if (config.type === 'VWAP') {
      // Session VWAP: cumulative (price * volume) / cumulative volume, resets daily
      const vwapState = {
        cumPV: 0,
        cumVol: 0,
        lastDay: -1,
      };
      const s = targetPane.addSeries(LineSeries, {
        color: config.color || '#e040fb',
        lineWidth: 2,
        title: 'VWAP',
      });
      seriesList.push(s);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        const day = Math.floor(bar.time / 86400);
        if (day !== vwapState.lastDay) {
          vwapState.cumPV = 0;
          vwapState.cumVol = 0;
          vwapState.lastDay = day;
        }
        const typical = (bar.high + bar.low + bar.close) / 3;
        if (isUpdate) {
          // Replace last bar's contribution — approximate by just recomputing
        }
        vwapState.cumPV += typical * bar.volume;
        vwapState.cumVol += bar.volume;
        const vwap = vwapState.cumVol > 0 ? vwapState.cumPV / vwapState.cumVol : typical;
        s.update({ time: bar.time as any, value: vwap });
      };
    } else if (config.type === 'Keltner') {
      // Keltner Channels: EMA ± multiplier * ATR
      const period = config.period || 20;
      const multiplier = config.multiplier || 1.5;
      const emaInst = new EMA(period);
      const atrInst = new ATR(period);
      const upper = targetPane.addSeries(LineSeries, { color: '#26a69a', lineWidth: 1 });
      const middle = targetPane.addSeries(LineSeries, { color: '#787b86', lineWidth: 1 });
      const lower = targetPane.addSeries(LineSeries, { color: '#ef5350', lineWidth: 1 });
      seriesList.push(upper, middle, lower);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        const atrInput = { high: bar.high, low: bar.low, close: bar.close };
        if (isUpdate) {
          emaInst.replace(bar.close);
          atrInst.replace(atrInput);
        } else {
          emaInst.add(bar.close);
          atrInst.add(atrInput);
        }
        if (emaInst.isStable && atrInst.isStable) {
          const ema = Number(emaInst.getResult());
          const atr = Number(atrInst.getResult());
          upper.update({ time: bar.time as any, value: ema + multiplier * atr });
          middle.update({ time: bar.time as any, value: ema });
          lower.update({ time: bar.time as any, value: ema - multiplier * atr });
        }
      };
    } else if (config.type === 'Donchian') {
      // Donchian Channels: highest high / lowest low over N bars
      const period = config.period || 20;
      const buffer: { high: number; low: number }[] = [];
      const upper = targetPane.addSeries(LineSeries, { color: '#2196f3', lineWidth: 1.5, title: `DC Upper ${period}` });
      const middle = targetPane.addSeries(LineSeries, { color: '#787b86', lineWidth: 1, title: 'DC Mid' });
      const lower = targetPane.addSeries(LineSeries, { color: '#2196f3', lineWidth: 1.5, title: `DC Lower ${period}` });
      seriesList.push(upper, middle, lower);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        if (isUpdate && buffer.length > 0) {
          buffer[buffer.length - 1] = { high: bar.high, low: bar.low };
        } else {
          buffer.push({ high: bar.high, low: bar.low });
          if (buffer.length > period) buffer.shift();
        }
        if (buffer.length >= period) {
          const hh = Math.max(...buffer.map((b) => b.high));
          const ll = Math.min(...buffer.map((b) => b.low));
          upper.update({ time: bar.time as any, value: hh });
          lower.update({ time: bar.time as any, value: ll });
          middle.update({ time: bar.time as any, value: (hh + ll) / 2 });
        }
      };
    } else if (config.type === 'MACD') {
      const fast = config.fastPeriod || 12;
      const slow = config.slowPeriod || 26;
      const signal = config.signalPeriod || 9;
      signalInstance = new MACD(new EMA(fast), new EMA(slow), new EMA(signal));
      const hist = targetPane.addSeries(HistogramSeries, { title: 'Histogram' });
      const macdLine = targetPane.addSeries(LineSeries, { color: '#2962ff', lineWidth: 1.5 });
      const signalLine = targetPane.addSeries(LineSeries, { color: '#ff6d00', lineWidth: 1.5 });
      seriesList.push(hist, macdLine, signalLine);

      recalculate = (bar: CanonicalBar, isUpdate: boolean) => {
        if (isUpdate) {
          signalInstance.replace(bar.close);
        } else {
          signalInstance.add(bar.close);
        }
        if (signalInstance.isStable) {
          const res = signalInstance.getResult();
          const hVal = Number(res.histogram);
          hist.update({
            time: bar.time as any,
            value: hVal,
            color: hVal >= 0 ? '#26a69a' : '#ef5350',
          });
          macdLine.update({ time: bar.time as any, value: Number(res.macd) });
          signalLine.update({ time: bar.time as any, value: Number(res.signal) });
        }
      };
    }

    const activeInd: ActiveIndicator = {
      config,
      signalInstance,
      series: seriesList,
      recalculate,
    };
    this.indicators.set(id, activeInd);

    // Hydrate initial historical bars
    for (const b of initialBars) {
      recalculate(b, false);
    }

    return id;
  }

  onBarUpdate(bar: CanonicalBar): void {
    const isUpdate = !bar.isFinal;
    for (const ind of this.indicators.values()) {
      ind.recalculate(bar, isUpdate);
    }
  }

  removeIndicator(id: string): void {
    const ind = this.indicators.get(id);
    if (!ind) return;
    for (const s of ind.series) {
      try {
        this.chart.removeSeries(s);
      } catch {
        // ignore
      }
    }
    this.indicators.delete(id);
  }

  destroy(): void {
    for (const id of Array.from(this.indicators.keys())) {
      this.removeIndicator(id);
    }
  }
}
