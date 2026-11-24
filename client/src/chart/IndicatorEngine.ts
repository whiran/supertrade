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
    | 'OBV';
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
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
