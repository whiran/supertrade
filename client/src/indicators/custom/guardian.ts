import type { CanonicalBar } from '@tv/shared';

export type MsFilter = 'All' | 'CHoCH' | 'CHoCH+' | 'BOS' | 'None';
export type MsMode = 'Manual' | 'Dynamic';
export type ObFilter = 'None' | 'BOS' | 'CHoCH' | 'CHoCH+';
export type ObMitigation = 'Absolute' | 'Middle';
export type ObPosition = 'Full' | 'Middle' | 'Accurate' | 'Precise';
export type OverlapMethod = 'Recent' | 'Previous';
export type FvgType = 'FVG' | 'VI' | 'OG';
export type FvgMitigationSrc = 'Close' | 'Wick';
export type ZoneMode = 'Fast' | 'Slow';

export interface GuardianConfig {
  internalLookback: number;
  swingLookback: number;
  msMode: MsMode;
  showSwingMs: MsFilter;
  showInternalMs: MsFilter;
  showEql: boolean;
  obShow: boolean;
  obNum: number;
  obFilter: ObFilter;
  obMitigation: ObMitigation;
  obPos: ObPosition;
  useOverlap: boolean;
  useOverlapMethod: OverlapMethod;
  fvgEnable: boolean;
  fvgType: FvgType;
  fvgNum: number;
  fvgExtend: number;
  fvgSrc: FvgMitigationSrc;
  showAccDistZone: boolean;
  zoneMode: ZoneMode;
  emaLength: number;
}

export const DEFAULT_GUARDIAN_CONFIG: GuardianConfig = {
  internalLookback: 5,
  swingLookback: 50,
  msMode: 'Manual',
  showSwingMs: 'All',
  showInternalMs: 'All',
  showEql: true,
  obShow: true,
  obNum: 5,
  obFilter: 'None',
  obMitigation: 'Absolute',
  obPos: 'Precise',
  useOverlap: true,
  useOverlapMethod: 'Previous',
  fvgEnable: true,
  fvgType: 'FVG',
  fvgNum: 5,
  fvgExtend: 10,
  fvgSrc: 'Close',
  showAccDistZone: true,
  zoneMode: 'Fast',
  emaLength: 50,
};

export interface StructureBreak {
  kind: 'internal' | 'swing';
  label: 'BOS' | 'CHoCH' | 'CHoCH+';
  bull: boolean;
  pivotTime: number;
  breakTime: number;
  price: number;
  pivotIndex: number;
  breakIndex: number;
}

export interface SwingPointLabel {
  time: number;
  price: number;
  text: 'HH' | 'HL' | 'LH' | 'LL';
  bull: boolean;
}

export interface StrongWeakLevels {
  high: number;
  highTime: number;
  highLabel: string;
  highVol: number;
  highPct: number;
  low: number;
  lowTime: number;
  lowLabel: string;
  lowVol: number;
  lowPct: number;
  equilibrium: number;
  premiumBottom: number;
  eqTop: number;
  eqBottom: number;
  discountTop: number;
}

export interface OrderBlock {
  bull: boolean;
  top: number;
  bottom: number;
  mid: number;
  startTime: number;
  volume: number;
  volumePct: number;
  dir: 1 | -1;
}

export interface FairValueGap {
  bull: boolean;
  top: number;
  bottom: number;
  startTime: number;
  endTime: number;
  type: FvgType;
}

export interface EqualLevel {
  kind: 'EQH' | 'EQL';
  startTime: number;
  endTime: number;
  startPrice: number;
  endPrice: number;
}

export interface AccDistZone {
  kind: 'Accumulation' | 'Distribution';
  top: number;
  bottom: number;
  startTime: number;
  endTime: number;
  points: Array<{ time: number; price: number }>;
}

export interface GuardianAlerts {
  bullBos: boolean;
  bullChoch: boolean;
  bullChochPlus: boolean;
  bullSwingBos: boolean;
  bullSwingChoch: boolean;
  bullSwingChochPlus: boolean;
  bullOb: boolean;
  bullObTouch: boolean;
  bullFvg: boolean;
  eql: boolean;
  accZone: boolean;
  bearBos: boolean;
  bearChoch: boolean;
  bearChochPlus: boolean;
  bearSwingBos: boolean;
  bearSwingChoch: boolean;
  bearSwingChochPlus: boolean;
  bearOb: boolean;
  bearObTouch: boolean;
  bearFvg: boolean;
  eqh: boolean;
  distZone: boolean;
}

export interface GuardianState {
  barCount: number;
  internalTrend: 1 | -1 | 0;
  swingTrend: 1 | -1 | 0;
  structureBreaks: StructureBreak[];
  swingLabels: SwingPointLabel[];
  strongWeak: StrongWeakLevels | null;
  bullOrderBlocks: OrderBlock[];
  bearOrderBlocks: OrderBlock[];
  fvgs: FairValueGap[];
  eqLevels: EqualLevel[];
  zones: AccDistZone[];
  detectedPattern: {
    found: string;
    bull: boolean | null;
    isFound: boolean;
    period: number;
  };
  impulseTrend: {
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    isImpulse: boolean;
    emaValue: number | null;
  };
  alerts: GuardianAlerts;
}

function emptyAlerts(): GuardianAlerts {
  return {
    bullBos: false,
    bullChoch: false,
    bullChochPlus: false,
    bullSwingBos: false,
    bullSwingChoch: false,
    bullSwingChochPlus: false,
    bullOb: false,
    bullObTouch: false,
    bullFvg: false,
    eql: false,
    accZone: false,
    bearBos: false,
    bearChoch: false,
    bearChochPlus: false,
    bearSwingBos: false,
    bearSwingChoch: false,
    bearSwingChochPlus: false,
    bearOb: false,
    bearObTouch: false,
    bearFvg: false,
    eqh: false,
    distZone: false,
  };
}

function isFinitePositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function smaSlice(values: number[], length: number): number | null {
  if (length <= 0 || values.length < length) return null;
  let sum = 0;
  const start = values.length - length;
  for (let i = start; i < values.length; i++) {
    sum += values[i];
  }
  return sum / length;
}

function stdevSlice(values: number[], length: number): number | null {
  const mean = smaSlice(values, length);
  if (mean === null) return null;
  let sq = 0;
  const start = values.length - length;
  for (let i = start; i < values.length; i++) {
    const d = values[i] - mean;
    sq += d * d;
  }
  return Math.sqrt(sq / length);
}

/**
 * Pine-compatible pivot high: bar at `idx - len` is strictly/uniquely highest
 * in the symmetric window `[idx - 2*len .. idx]`.
 */
function detectPivotHigh(bars: CanonicalBar[], idx: number, len: number): number | null {
  if (len < 1 || idx < 2 * len) return null;
  const centerIdx = idx - len;
  const centerHigh = bars[centerIdx].high;
  for (let j = idx - 2 * len; j <= idx; j++) {
    if (j === centerIdx) continue;
    if (j < centerIdx && bars[j].high >= centerHigh) return null;
    if (j > centerIdx && bars[j].high > centerHigh) return null;
  }
  return centerHigh;
}

/**
 * Pine-compatible pivot low: bar at `idx - len` is lowest
 * in the symmetric window `[idx - 2*len .. idx]`.
 */
function detectPivotLow(bars: CanonicalBar[], idx: number, len: number): number | null {
  if (len < 1 || idx < 2 * len) return null;
  const centerIdx = idx - len;
  const centerLow = bars[centerIdx].low;
  for (let j = idx - 2 * len; j <= idx; j++) {
    if (j === centerIdx) continue;
    if (j < centerIdx && bars[j].low <= centerLow) return null;
    if (j > centerIdx && bars[j].low < centerLow) return null;
  }
  return centerLow;
}

function shouldShowMs(filter: MsFilter, label: 'BOS' | 'CHoCH' | 'CHoCH+'): boolean {
  if (filter === 'None') return false;
  if (filter === 'All') return true;
  return filter === label;
}

function shouldEmitOb(filter: ObFilter, label: 'BOS' | 'CHoCH' | 'CHoCH+'): boolean {
  if (filter === 'None') return true;
  return filter === label;
}

function computeObTopBottom(
  bar: CanonicalBar,
  bull: boolean,
  pos: ObPosition
): { top: number; bottom: number } {
  const ohlc4 = (bar.open + bar.high + bar.low + bar.close) / 4;
  const hl2 = (bar.high + bar.low) / 2;
  const hlcc4 = (bar.high + bar.low + bar.close + bar.close) / 4;

  let posPrice = hl2;
  if (pos === 'Full') {
    posPrice = bull ? bar.high : bar.low;
  } else if (pos === 'Middle') {
    posPrice = ohlc4;
  }

  let top = bull ? posPrice : bar.high;
  let bottom = bull ? bar.low : posPrice;

  if (pos === 'Precise') {
    const avg = (top + bottom) / 2;
    if (bull) {
      const bodyLow = bar.close < bar.open ? bar.close : bar.open;
      if (avg < bodyLow && top > hlcc4) {
        top = avg;
      }
    } else {
      const bodyHigh = bar.close < bar.open ? bar.open : bar.close;
      if (avg > bodyHigh && bottom < hlcc4) {
        bottom = avg;
      }
    }
  }

  return {
    top: Math.max(top, bottom),
    bottom: Math.min(top, bottom),
  };
}

function recalcObVolumePct(obs: OrderBlock[], maxCount: number): void {
  const count = Math.min(maxCount, obs.length);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += obs[i].volume;
  }
  for (let i = 0; i < obs.length; i++) {
    obs[i].volumePct = i < count && total > 0 ? Math.floor((obs[i].volume / total) * 100) : 0;
  }
}

/**
 * Guardian ("Guardeer") Multi-Module Smart Money & Impulse Indicator.
 *
 * Implements:
 * - Internal & Swing Market Structure (BOS, CHoCH, CHoCH+, Manual/Dynamic lookback)
 * - Volumetric Order Blocks (mitigation, overlap removal, relative volume %)
 * - Strong/Weak High/Low + Equilibrium / Premium / Discount zones
 * - Fair Value Gaps (FVG / VI / OG) with mitigation
 * - Accumulation / Distribution Zones (Fast / Slow)
 * - Equal Highs / Equal Lows (EQH / EQL) via ATR(200)
 * - SMMA(34) / ZLEMA(34) Impulse + EMA(50) Trend signal
 */
export class GuardianIndicator {
  readonly id = 'GUARDIAN';
  readonly name = 'Guardian (Guardeer SMC + Impulse)';

  private config: GuardianConfig;
  private bars: CanonicalBar[] = [];
  private state: GuardianState;

  constructor(config: Partial<GuardianConfig> = {}) {
    this.config = {
      ...DEFAULT_GUARDIAN_CONFIG,
      ...config,
      internalLookback: Math.max(2, Math.floor(config.internalLookback ?? DEFAULT_GUARDIAN_CONFIG.internalLookback)),
      swingLookback: Math.max(2, Math.floor(config.swingLookback ?? DEFAULT_GUARDIAN_CONFIG.swingLookback)),
      obNum: Math.min(10, Math.max(1, Math.floor(config.obNum ?? DEFAULT_GUARDIAN_CONFIG.obNum))),
      fvgNum: Math.min(20, Math.max(1, Math.floor(config.fvgNum ?? DEFAULT_GUARDIAN_CONFIG.fvgNum))),
      emaLength: Math.max(1, Math.floor(config.emaLength ?? DEFAULT_GUARDIAN_CONFIG.emaLength)),
    };
    this.state = this.createEmptyState();
  }

  private createEmptyState(): GuardianState {
    return {
      barCount: 0,
      internalTrend: 0,
      swingTrend: 0,
      structureBreaks: [],
      swingLabels: [],
      strongWeak: null,
      bullOrderBlocks: [],
      bearOrderBlocks: [],
      fvgs: [],
      eqLevels: [],
      zones: [],
      detectedPattern: {
        found: 'None',
        bull: null,
        isFound: false,
        period: 0,
      },
      impulseTrend: {
        signal: 'NEUTRAL',
        isImpulse: false,
        emaValue: null,
      },
      alerts: emptyAlerts(),
    };
  }

  reset(): void {
    this.bars = [];
    this.state = this.createEmptyState();
  }

  getState(): GuardianState {
    return this.state;
  }

  /**
   * Batch compute over a historical array of bars.
   */
  calculate(bars: CanonicalBar[]): GuardianState {
    this.bars = [];
    for (const b of bars) {
      if (!b || !Number.isFinite(b.time) || !Number.isFinite(b.open) || !Number.isFinite(b.high) || !Number.isFinite(b.low) || !Number.isFinite(b.close)) {
        continue;
      }
      if (this.bars.length > 0 && b.time < this.bars[this.bars.length - 1].time) {
        continue;
      }
      if (this.bars.length > 0 && b.time === this.bars[this.bars.length - 1].time) {
        this.bars[this.bars.length - 1] = { ...b, volume: Number.isFinite(b.volume) ? Math.max(0, b.volume) : 0 };
      } else {
        this.bars.push({ ...b, volume: Number.isFinite(b.volume) ? Math.max(0, b.volume) : 0 });
      }
    }
    this.state = this.computeAll(this.bars);
    return this.state;
  }

  /**
   * Incremental / live bar update. Handles both new bars and non-final bar updates
   * without corrupting pivot history.
   */
  update(bar: CanonicalBar): GuardianState {
    if (
      !bar ||
      !Number.isFinite(bar.time) ||
      !Number.isFinite(bar.open) ||
      !Number.isFinite(bar.high) ||
      !Number.isFinite(bar.low) ||
      !Number.isFinite(bar.close)
    ) {
      return this.state;
    }

    const sanitized: CanonicalBar = {
      ...bar,
      volume: Number.isFinite(bar.volume) ? Math.max(0, bar.volume) : 0,
    };

    const last = this.bars[this.bars.length - 1];
    if (last && sanitized.time < last.time) {
      return this.state;
    }

    if (last && sanitized.time === last.time) {
      this.bars[this.bars.length - 1] = sanitized;
    } else {
      this.bars.push(sanitized);
      if (this.bars.length > 2000) {
        this.bars.shift();
      }
    }

    this.state = this.computeAll(this.bars);
    return this.state;
  }

  private computeAll(bars: CanonicalBar[]): GuardianState {
    if (bars.length === 0) {
      return this.createEmptyState();
    }

    const cfg = this.config;
    const alerts = emptyAlerts();

    // Structure state
    let iLen = cfg.internalLookback;
    const sLen = cfg.swingLookback;
    let itrend: 1 | -1 | 0 = 0;
    let trend: 1 | -1 | 0 = 0;

    const up = { p: [] as number[], l: [] as number[], n: [] as number[] };
    const dn = { p: [] as number[], l: [] as number[], n: [] as number[] };
    const sup = { p: [] as number[], l: [] as number[], n: [] as number[] };
    const sdn = { p: [] as number[], l: [] as number[], n: [] as number[] };

    let lastIHIdx = 0;
    let lastILIdx = 0;
    let lastSHIdx = 0;
    let lastSLIdx = 0;

    const structureBreaks: StructureBreak[] = [];
    const swingLabels: SwingPointLabel[] = [];

    // Strong / Weak High/Low state
    let zhlOut = 0;
    let prevZhlOut = 0;
    let phlTopy = 0;
    let phlBottomy = 0;
    let phlTup = bars[0].high;
    let phlTupTime = bars[0].time;
    let phlTdn = bars[0].low;
    let phlTdnTime = bars[0].time;
    let phlUV = bars[0].volume;
    let phlDV = bars[0].volume;
    let phlTopTime = bars[0].time;
    let phlBottomTime = bars[0].time;

    // Order Blocks
    const bullOBs: OrderBlock[] = [];
    const bearOBs: OrderBlock[] = [];

    // Fair Value Gaps
    const fvgs: FairValueGap[] = [];

    // EQH / EQL state
    const eqLevels: EqualLevel[] = [];
    let eqPrevHigh = 0;
    let eqPrevHighTime = 0;
    let eqPrevLow = 0;
    let eqPrevLowTime = 0;

    // Accumulation & Distribution Zone state
    const zonePivots: Array<{ time: number; price: number; c: 1 | -1 }> = [];
    const zones: AccDistZone[] = [];
    const detectedPattern = {
      found: 'None',
      bull: null as boolean | null,
      isFound: false,
      period: 0,
    };

    // Dynamic lookback helper series
    const pctChanges: number[] = [];

    // ATR(200) for EQH / EQL
    let trSum = 0;
    let atr200 = 0;

    // Impulse & EMA(50) state
    const highWindow: number[] = [];
    const lowWindow: number[] = [];
    const hlc3Window: number[] = [];
    let smmaHigh: number | null = null;
    let smmaLow: number | null = null;
    let ema1: number | null = null;
    let ema2: number | null = null;
    let prevMd = 0;
    const mdHistory: number[] = [];
    const mdPrevHistory: number[] = [];

    const trendEmaMult = 2 / (cfg.emaLength + 1);
    let trendEma: number | null = null;
    let prevTrendEma: number | null = null;
    let lastImpulse = false;

    const impulseLen = 34;
    const impulseStrength = 9;
    const impulseMult = 2 / (impulseLen + 1);

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const prevBar = i > 0 ? bars[i - 1] : null;

      // Reset per-bar alerts so final state reflects latest bar's alerts
      Object.assign(alerts, emptyAlerts());

      // Pattern expiry counter (50 bars)
      if (detectedPattern.isFound) {
        detectedPattern.period += 1;
      }
      if (detectedPattern.period >= 50) {
        detectedPattern.period = 0;
        detectedPattern.found = 'None';
        detectedPattern.isFound = false;
        detectedPattern.bull = null;
      }

      // Dynamic MS lookback
      if (i >= iLen && isFinitePositive(bars[i - iLen].close)) {
        const pct = ((b.close - bars[i - iLen].close) / bars[i - iLen].close) * 100;
        pctChanges.push(pct);
      } else {
        pctChanges.push(0);
      }

      if (cfg.msMode === 'Dynamic' && pctChanges.length >= iLen) {
        const mean = smaSlice(pctChanges, iLen);
        const sd = stdevSlice(pctChanges, iLen);
        if (mean !== null && sd !== null && sd > 0) {
          const vv = Math.abs((pctChanges[pctChanges.length - 1] - mean) / sd);
          if (vv >= 2.0) iLen = 5;
          else if (vv >= 1.9) iLen = 6;
          else if (vv >= 1.8) iLen = 7;
          else if (vv >= 1.7) iLen = 8;
          else if (vv >= 1.6) iLen = 9;
          else if (vv >= 1.5) iLen = 10;
        }
      }

      // ATR(200)
      const tr = prevBar
        ? Math.max(b.high - b.low, Math.abs(b.high - prevBar.close), Math.abs(b.low - prevBar.close))
        : b.high - b.low;
      if (i < 200) {
        trSum += tr;
        atr200 = trSum / (i + 1);
      } else {
        atr200 = (atr200 * 199 + tr) / 200;
      }

      // Impulse SMMA(34) / ZLEMA(34) + EMA(50)
      highWindow.push(b.high);
      lowWindow.push(b.low);
      const hlc3 = (b.high + b.low + b.close) / 3;
      hlc3Window.push(hlc3);

      if (highWindow.length === impulseLen) {
        smmaHigh = smaSlice(highWindow, impulseLen);
        smmaLow = smaSlice(lowWindow, impulseLen);
      } else if (highWindow.length > impulseLen && smmaHigh !== null && smmaLow !== null) {
        smmaHigh = (smmaHigh * (impulseLen - 1) + b.high) / impulseLen;
        smmaLow = (smmaLow * (impulseLen - 1) + b.low) / impulseLen;
      }

      ema1 = ema1 === null ? hlc3 : hlc3 * impulseMult + ema1 * (1 - impulseMult);
      ema2 = ema2 === null ? ema1 : ema1 * impulseMult + ema2 * (1 - impulseMult);
      const zlema = ema1 + (ema1 - ema2);

      if (smmaHigh !== null && smmaLow !== null) {
        const md = zlema > smmaHigh ? zlema - smmaHigh : zlema < smmaLow ? zlema - smmaLow : 0;
        mdHistory.push(md);
        mdPrevHistory.push(prevMd);
        const sb = smaSlice(mdHistory, impulseStrength);
        const sbPrev = smaSlice(mdPrevHistory, impulseStrength);
        if (sb !== null && sbPrev !== null) {
          const sh = md - sb;
          const shPrev = prevMd - sbPrev;
          lastImpulse = sh !== 0 && shPrev !== 0;
        }
        prevMd = md;
      }

      prevTrendEma = trendEma;
      trendEma = trendEma === null ? b.close : b.close * trendEmaMult + trendEma * (1 - trendEmaMult);

      // Pivots
      const iH = detectPivotHigh(bars, i, iLen);
      const iL = detectPivotLow(bars, i, iLen);
      const sH = detectPivotHigh(bars, i, sLen);
      const sL = detectPivotLow(bars, i, sLen);

      if (iH !== null) {
        const pIdx = i - iLen;
        up.p.unshift(bars[pIdx].high);
        up.l.unshift(bars[pIdx].high);
        up.n.unshift(pIdx);
        lastIHIdx = pIdx;
      }
      if (iL !== null) {
        const pIdx = i - iLen;
        dn.p.unshift(bars[pIdx].low);
        dn.l.unshift(bars[pIdx].low);
        dn.n.unshift(pIdx);
        lastILIdx = pIdx;
      }
      if (sH !== null) {
        const pIdx = i - sLen;
        sup.p.unshift(bars[pIdx].high);
        sup.l.unshift(bars[pIdx].high);
        sup.n.unshift(pIdx);
        lastSHIdx = pIdx;
      }
      if (sL !== null) {
        const pIdx = i - sLen;
        sdn.p.unshift(bars[pIdx].low);
        sdn.l.unshift(bars[pIdx].low);
        sdn.n.unshift(pIdx);
        lastSLIdx = pIdx;
      }

      let bullObTrigger = false;
      let bearObTrigger = false;

      // INTERNAL BULLISH STRUCTURE
      if (up.p.length > 0 && dn.l.length > 1 && prevBar && prevBar.close <= up.p[0] && b.close > up.p[0]) {
        const isChoch = itrend < 0;
        let label: 'BOS' | 'CHoCH' | 'CHoCH+' = 'BOS';
        if (!isChoch) {
          alerts.bullBos = true;
        } else {
          const isPlus = dn.l[0] > dn.l[1];
          label = isPlus ? 'CHoCH+' : 'CHoCH';
          if (isPlus) alerts.bullChochPlus = true;
          else alerts.bullChoch = true;
        }
        if (shouldShowMs(cfg.showInternalMs, label)) {
          structureBreaks.push({
            kind: 'internal',
            label,
            bull: true,
            pivotTime: bars[up.n[0]].time,
            breakTime: b.time,
            price: up.p[0],
            pivotIndex: up.n[0],
            breakIndex: i,
          });
        }
        if (shouldEmitOb(cfg.obFilter, label)) {
          bullObTrigger = true;
        }
        itrend = 1;
        up.p.length = 0;
        up.n.length = 0;
      }

      // INTERNAL BEARISH STRUCTURE
      if (dn.p.length > 0 && up.l.length > 1 && prevBar && prevBar.close >= dn.p[0] && b.close < dn.p[0]) {
        const isChoch = itrend > 0;
        let label: 'BOS' | 'CHoCH' | 'CHoCH+' = 'BOS';
        if (!isChoch) {
          alerts.bearBos = true;
        } else {
          const isPlus = up.l[0] < up.l[1];
          label = isPlus ? 'CHoCH+' : 'CHoCH';
          if (isPlus) alerts.bearChochPlus = true;
          else alerts.bearChoch = true;
        }
        if (shouldShowMs(cfg.showInternalMs, label)) {
          structureBreaks.push({
            kind: 'internal',
            label,
            bull: false,
            pivotTime: bars[dn.n[0]].time,
            breakTime: b.time,
            price: dn.p[0],
            pivotIndex: dn.n[0],
            breakIndex: i,
          });
        }
        if (shouldEmitOb(cfg.obFilter, label)) {
          bearObTrigger = true;
        }
        itrend = -1;
        dn.p.length = 0;
        dn.n.length = 0;
      }

      // SWING BULLISH STRUCTURE
      if (sup.p.length > 0 && sdn.l.length > 1 && prevBar && prevBar.close <= sup.p[0] && b.close > sup.p[0]) {
        const isChoch = trend < 0;
        let label: 'BOS' | 'CHoCH' | 'CHoCH+' = 'BOS';
        if (!isChoch) {
          alerts.bullSwingBos = true;
        } else {
          const isPlus = sdn.l[0] > sdn.l[1];
          label = isPlus ? 'CHoCH+' : 'CHoCH';
          if (isPlus) alerts.bullSwingChochPlus = true;
          else alerts.bullSwingChoch = true;
        }
        if (shouldShowMs(cfg.showSwingMs, label)) {
          structureBreaks.push({
            kind: 'swing',
            label,
            bull: true,
            pivotTime: bars[sup.n[0]].time,
            breakTime: b.time,
            price: sup.p[0],
            pivotIndex: sup.n[0],
            breakIndex: i,
          });
        }
        trend = 1;
        sup.p.length = 0;
        sup.n.length = 0;
      }

      // SWING BEARISH STRUCTURE
      if (sdn.p.length > 0 && sup.l.length > 1 && prevBar && prevBar.close >= sdn.p[0] && b.close < sdn.p[0]) {
        const isChoch = trend > 0;
        let label: 'BOS' | 'CHoCH' | 'CHoCH+' = 'BOS';
        if (!isChoch) {
          alerts.bearSwingBos = true;
        } else {
          const isPlus = sup.l[0] < sup.l[1];
          label = isPlus ? 'CHoCH+' : 'CHoCH';
          if (isPlus) alerts.bearSwingChochPlus = true;
          else alerts.bearSwingChoch = true;
        }
        if (shouldShowMs(cfg.showSwingMs, label)) {
          structureBreaks.push({
            kind: 'swing',
            label,
            bull: false,
            pivotTime: bars[sdn.n[0]].time,
            breakTime: b.time,
            price: sdn.p[0],
            pivotIndex: sdn.n[0],
            breakIndex: i,
          });
        }
        trend = -1;
        sdn.p.length = 0;
        sdn.n.length = 0;
      }

      // Strong/Weak High/Low (zhl)
      if (i >= sLen) {
        let highest = -Infinity;
        let lowest = Infinity;
        for (let k = i - sLen + 1; k <= i; k++) {
          if (bars[k].high > highest) highest = bars[k].high;
          if (bars[k].low < lowest) lowest = bars[k].low;
        }
        const refBar = bars[i - sLen];
        prevZhlOut = zhlOut;
        zhlOut = refBar.high > highest ? 0 : refBar.low < lowest ? 1 : prevZhlOut;

        const top = zhlOut === 0 && prevZhlOut !== 0 ? refBar.high : 0;
        const btm = zhlOut === 1 && prevZhlOut !== 1 ? refBar.low : 0;

        if (top > 0) {
          const txt: 'HH' | 'HL' = top > phlTopy ? 'HH' : 'HL';
          swingLabels.push({ time: refBar.time, price: top, text: txt, bull: false });
          phlTopy = top;
          phlTopTime = refBar.time;
          phlTup = top;
          phlTupTime = refBar.time;
        }
        if (btm > 0) {
          const txt: 'LH' | 'LL' = btm > phlBottomy ? 'LH' : 'LL';
          swingLabels.push({ time: refBar.time, price: btm, text: txt, bull: true });
          phlBottomy = btm;
          phlBottomTime = refBar.time;
          phlTdn = btm;
          phlTdnTime = refBar.time;
        }
      }

      if (b.high >= phlTup) {
        if (b.high > phlTup) phlUV = b.volume;
        phlTup = b.high;
        phlTupTime = b.time;
      }
      if (b.low <= phlTdn) {
        if (b.low < phlTdn) phlDV = b.volume;
        phlTdn = b.low;
        phlTdnTime = b.time;
      }

      // Volumetric Order Blocks
      if (cfg.obShow) {
        if (bullObTrigger) {
          alerts.bullOb = true;
          const span = Math.max(1, i - lastIHIdx);
          let minLow = Infinity;
          let minOffset = 0;
          for (let k = 0; k < span && i - k >= 0; k++) {
            if (bars[i - k].low < minLow) {
              minLow = bars[i - k].low;
              minOffset = k;
            }
          }
          const obIdx = Math.max(0, i - minOffset - 1);
          const obBar = bars[obIdx];
          const { top, bottom } = computeObTopBottom(obBar, true, cfg.obPos);
          const newOb: OrderBlock = {
            bull: true,
            top,
            bottom: Math.min(bottom, minLow),
            mid: (top + Math.min(bottom, minLow)) / 2,
            startTime: bars[Math.max(0, i - minOffset)].time,
            volume: obBar.volume,
            volumePct: 0,
            dir: obBar.close > obBar.open ? 1 : -1,
          };
          bullOBs.unshift(newOb);
          if (cfg.useOverlap && bullOBs.length > 1 && bullOBs[0].bottom < bullOBs[1].top) {
            bullOBs.splice(cfg.useOverlapMethod === 'Recent' ? 1 : 0, 1);
          }
        }

        if (bearObTrigger) {
          alerts.bearOb = true;
          const span = Math.max(1, i - lastILIdx);
          let maxHigh = -Infinity;
          let maxOffset = 0;
          for (let k = 0; k < span && i - k >= 0; k++) {
            if (bars[i - k].high > maxHigh) {
              maxHigh = bars[i - k].high;
              maxOffset = k;
            }
          }
          const obIdx = Math.max(0, i - maxOffset - 1);
          const obBar = bars[obIdx];
          const { top, bottom } = computeObTopBottom(obBar, false, cfg.obPos);
          const adjTop = Math.max(top, maxHigh);
          const newOb: OrderBlock = {
            bull: false,
            top: adjTop,
            bottom,
            mid: (adjTop + bottom) / 2,
            startTime: bars[Math.max(0, i - maxOffset)].time,
            volume: obBar.volume,
            volumePct: 0,
            dir: obBar.close > obBar.open ? 1 : -1,
          };
          bearOBs.unshift(newOb);
          if (cfg.useOverlap && bearOBs.length > 1 && bearOBs[0].top > bearOBs[1].bottom) {
            bearOBs.splice(cfg.useOverlapMethod === 'Recent' ? 1 : 0, 1);
          }
        }

        // OB Mitigation on confirmed bars
        for (let idx = bullOBs.length - 1; idx >= 0; idx--) {
          const threshold = cfg.obMitigation === 'Middle' ? bullOBs[idx].mid : bullOBs[idx].bottom;
          if (b.close < threshold) {
            bullOBs.splice(idx, 1);
          }
        }
        for (let idx = bearOBs.length - 1; idx >= 0; idx--) {
          const threshold = cfg.obMitigation === 'Middle' ? bearOBs[idx].mid : bearOBs[idx].top;
          if (b.close > threshold) {
            bearOBs.splice(idx, 1);
          }
        }

        if (bullOBs.length > 0 && prevBar && prevBar.low >= bullOBs[0].top && b.low < bullOBs[0].top) {
          alerts.bullObTouch = true;
        }
        if (bearOBs.length > 0 && prevBar && prevBar.high <= bearOBs[0].bottom && b.high > bearOBs[0].bottom) {
          alerts.bearObTouch = true;
        }
      }

      // Fair Value Gaps (FVG / VI / OG)
      if (cfg.fvgEnable && i >= 2) {
        const b2 = bars[i - 2];
        const b1 = bars[i - 1];
        const dt = Math.max(1, b.time - b1.time);

        if (cfg.fvgType === 'FVG') {
          if (b.low > b2.high) {
            fvgs.unshift({
              bull: true,
              top: b.low,
              bottom: b2.high,
              startTime: b2.time,
              endTime: b.time + dt * cfg.fvgExtend,
              type: 'FVG',
            });
            alerts.bullFvg = true;
          }
          if (b.high < b2.low) {
            fvgs.unshift({
              bull: false,
              top: b2.low,
              bottom: b.high,
              startTime: b2.time,
              endTime: b.time + dt * cfg.fvgExtend,
              type: 'FVG',
            });
            alerts.bearFvg = true;
          }
        } else if (cfg.fvgType === 'VI') {
          const bullBodyHigh1 = Math.max(b1.open, b1.close);
          const bullBodyLow0 = Math.min(b.open, b.close);
          if (b.open > b1.close && b1.high > b.low && b.close > b1.close && b.open > b1.open && b1.high < bullBodyLow0) {
            fvgs.unshift({
              bull: true,
              top: bullBodyLow0,
              bottom: bullBodyHigh1,
              startTime: b1.time,
              endTime: b.time + dt * cfg.fvgExtend,
              type: 'VI',
            });
            alerts.bullFvg = true;
          }
          const bearBodyLow1 = Math.min(b1.open, b1.close);
          const bearBodyHigh0 = Math.max(b.open, b.close);
          if (b.open < b1.close && b1.low < b.high && b.close < b1.close && b.open < b1.open && b1.low > bearBodyHigh0) {
            fvgs.unshift({
              bull: false,
              top: bearBodyLow1,
              bottom: bearBodyHigh0,
              startTime: b1.time,
              endTime: b.time + dt * cfg.fvgExtend,
              type: 'VI',
            });
            alerts.bearFvg = true;
          }
        } else if (cfg.fvgType === 'OG') {
          if (b.low > b1.high) {
            fvgs.unshift({
              bull: true,
              top: b.low,
              bottom: b1.high,
              startTime: b1.time,
              endTime: b.time + dt * cfg.fvgExtend,
              type: 'OG',
            });
            alerts.bullFvg = true;
          }
          if (b.high < b1.low) {
            fvgs.unshift({
              bull: false,
              top: b1.low,
              bottom: b.high,
              startTime: b1.time,
              endTime: b.time + dt * cfg.fvgExtend,
              type: 'OG',
            });
            alerts.bearFvg = true;
          }
        }

        // FVG Mitigation
        for (let idx = fvgs.length - 1; idx >= 0; idx--) {
          const g = fvgs[idx];
          const bullTrig = cfg.fvgSrc === 'Wick' ? b.low : b.close;
          const bearTrig = cfg.fvgSrc === 'Wick' ? b.high : b.close;
          if (g.bull ? bullTrig < g.bottom : bearTrig > g.top) {
            fvgs.splice(idx, 1);
          }
        }
      }

      // Accumulation & Distribution Zones
      if (cfg.showAccDistZone) {
        if (iH !== null) {
          zonePivots.unshift({ time: bars[i - iLen].time, price: bars[i - iLen].high, c: 1 });
        }
        if (iL !== null) {
          zonePivots.unshift({ time: bars[i - iLen].time, price: bars[i - iLen].low, c: -1 });
        }
        if (zonePivots.length > 1 && zonePivots[0].c === zonePivots[1].c) {
          zonePivots.length = 0;
        }

        if (cfg.zoneMode === 'Slow' && zonePivots.length > 5) {
          const z = zonePivots;
          if (z[0].c === -1 && z[1].c === 1 && z[2].c === -1 && z[3].c === 1 && z[4].c === -1 && z[5].c === 1) {
            if (z[0].price > z[2].price && z[2].price > z[4].price && z[1].price < z[3].price && z[3].price < z[5].price) {
              alerts.accZone = true;
              zones.push({
                kind: 'Accumulation',
                top: z[5].price,
                bottom: z[4].price,
                startTime: z[5].time,
                endTime: z[0].time,
                points: z.slice(0, 6).reverse().map((pt) => ({ time: pt.time, price: pt.price })),
              });
              detectedPattern.found = 'Accumulation Zone';
              detectedPattern.bull = true;
              detectedPattern.isFound = true;
              detectedPattern.period = 0;
              zonePivots.length = 0;
            }
          } else if (z[0].c === 1 && z[1].c === -1 && z[2].c === 1 && z[3].c === -1 && z[4].c === 1 && z[5].c === -1) {
            if (z[0].price < z[2].price && z[2].price < z[4].price && z[1].price > z[3].price && z[3].price > z[5].price) {
              alerts.distZone = true;
              zones.push({
                kind: 'Distribution',
                top: z[5].price,
                bottom: z[4].price,
                startTime: z[5].time,
                endTime: z[0].time,
                points: z.slice(0, 6).reverse().map((pt) => ({ time: pt.time, price: pt.price })),
              });
              detectedPattern.found = 'Distribution Zone';
              detectedPattern.bull = false;
              detectedPattern.isFound = true;
              detectedPattern.period = 0;
              zonePivots.length = 0;
            }
          }
        } else if (cfg.zoneMode === 'Fast' && zonePivots.length > 3) {
          const z = zonePivots;
          if (z[0].c === -1 && z[1].c === 1 && z[2].c === -1 && z[3].c === 1) {
            if (z[0].price > z[2].price && z[1].price < z[3].price) {
              alerts.accZone = true;
              zones.push({
                kind: 'Accumulation',
                top: z[3].price,
                bottom: z[2].price,
                startTime: z[3].time,
                endTime: z[0].time,
                points: z.slice(0, 4).reverse().map((pt) => ({ time: pt.time, price: pt.price })),
              });
              detectedPattern.found = 'Accumulation Zone';
              detectedPattern.bull = true;
              detectedPattern.isFound = true;
              detectedPattern.period = 0;
              zonePivots.length = 0;
            }
          } else if (z[0].c === 1 && z[1].c === -1 && z[2].c === 1 && z[3].c === -1) {
            if (z[0].price < z[2].price && z[1].price > z[3].price) {
              alerts.distZone = true;
              zones.push({
                kind: 'Distribution',
                top: z[2].price,
                bottom: z[3].price,
                startTime: z[3].time,
                endTime: z[0].time,
                points: z.slice(0, 4).reverse().map((pt) => ({ time: pt.time, price: pt.price })),
              });
              detectedPattern.found = 'Distribution Zone';
              detectedPattern.bull = false;
              detectedPattern.isFound = true;
              detectedPattern.period = 0;
              zonePivots.length = 0;
            }
          }
        }
      }

      // EQH / EQL (1-bar pivot)
      if (cfg.showEql && i >= 2) {
        const eqTop = detectPivotHigh(bars, i, 1);
        const eqBtm = detectPivotLow(bars, i, 1);
        if (eqTop !== null) {
          if (eqPrevHighTime > 0) {
            const mx = Math.max(eqTop, eqPrevHigh);
            const mn = Math.min(eqTop, eqPrevHigh);
            if (mx < mn + atr200 * 0.1) {
              eqLevels.unshift({
                kind: 'EQH',
                startTime: eqPrevHighTime,
                endTime: bars[i - 1].time,
                startPrice: eqPrevHigh,
                endPrice: eqTop,
              });
              if (eqLevels.length > 50) eqLevels.pop();
              alerts.eqh = true;
            }
          }
          eqPrevHigh = eqTop;
          eqPrevHighTime = bars[i - 1].time;
        }
        if (eqBtm !== null) {
          if (eqPrevLowTime > 0) {
            const mx = Math.max(eqBtm, eqPrevLow);
            const mn = Math.min(eqBtm, eqPrevLow);
            if (mn > mx - atr200 * 0.1) {
              eqLevels.unshift({
                kind: 'EQL',
                startTime: eqPrevLowTime,
                endTime: bars[i - 1].time,
                startPrice: eqPrevLow,
                endPrice: eqBtm,
              });
              if (eqLevels.length > 50) eqLevels.pop();
              alerts.eql = true;
            }
          }
          eqPrevLow = eqBtm;
          eqPrevLowTime = bars[i - 1].time;
        }
      }
    }

    recalcObVolumePct(bullOBs, cfg.obNum);
    recalcObVolumePct(bearOBs, cfg.obNum);

    const totalVol = phlUV + phlDV;
    const strongWeak: StrongWeakLevels = {
      high: phlTup,
      highTime: phlTupTime,
      highLabel: trend < 0 ? 'Strong High' : 'Weak High',
      highVol: phlUV,
      highPct: totalVol > 0 ? Math.round((phlUV / totalVol) * 100) : 0,
      low: phlTdn,
      lowTime: phlTdnTime,
      lowLabel: trend > 0 ? 'Strong Low' : 'Weak Low',
      lowVol: phlDV,
      lowPct: totalVol > 0 ? Math.round((phlDV / totalVol) * 100) : 0,
      equilibrium: (phlTup + phlTdn) / 2,
      premiumBottom: 0.95 * phlTup + 0.05 * phlTdn,
      eqTop: 0.525 * phlTup + 0.475 * phlTdn,
      eqBottom: 0.525 * phlTdn + 0.475 * phlTup,
      discountTop: 0.95 * phlTdn + 0.05 * phlTup,
    };

    let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (lastImpulse && trendEma !== null && prevTrendEma !== null) {
      if (trendEma > prevTrendEma) signal = 'BULLISH';
      else if (trendEma < prevTrendEma) signal = 'BEARISH';
    }

    // Keep unused pivot trackers referenced cleanly
    void lastSHIdx;
    void lastSLIdx;

    return {
      barCount: bars.length,
      internalTrend: itrend,
      swingTrend: trend,
      structureBreaks: structureBreaks.slice(-150),
      swingLabels: swingLabels.slice(-100),
      strongWeak,
      bullOrderBlocks: bullOBs.slice(0, cfg.obNum),
      bearOrderBlocks: bearOBs.slice(0, cfg.obNum),
      fvgs: fvgs.slice(0, cfg.fvgNum),
      eqLevels: eqLevels.slice(0, 50),
      zones: zones.slice(-20),
      detectedPattern,
      impulseTrend: {
        signal,
        isImpulse: lastImpulse,
        emaValue: trendEma,
      },
      alerts,
    };
  }
}
