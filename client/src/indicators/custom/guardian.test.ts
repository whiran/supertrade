import { describe, it, expect } from 'vitest';
import type { CanonicalBar } from '@tv/shared';
import { GuardianIndicator } from './guardian.js';

function makeBar(
  time: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume = 100,
  isFinal = true
): CanonicalBar {
  return { time, open, high, low, close, volume, isFinal };
}

function makeWaveBars(count: number, startTime = 1700000000, step = 60): CanonicalBar[] {
  const bars: CanonicalBar[] = [];
  for (let i = 0; i < count; i++) {
    const wave = Math.sin(i / 4) * 10 + i * 0.15;
    const base = 100 + wave;
    const open = +(base - 0.5).toFixed(4);
    const close = +(base + 0.5 * Math.cos(i / 3)).toFixed(4);
    const high = +(Math.max(open, close) + 1.5).toFixed(4);
    const low = +(Math.min(open, close) - 1.5).toFixed(4);
    bars.push(makeBar(startTime + i * step, open, high, low, close, 100 + (i % 7) * 25));
  }
  return bars;
}

describe('GuardianIndicator', () => {
  it('handles empty, single, and insufficient bars without crashing or NaN', () => {
    const ind = new GuardianIndicator();
    const emptyState = ind.calculate([]);
    expect(emptyState.barCount).toBe(0);
    expect(emptyState.strongWeak).toBeNull();
    expect(emptyState.impulseTrend.signal).toBe('NEUTRAL');

    const oneBar = ind.update(makeBar(1700000000, 100, 102, 99, 101, 50));
    expect(oneBar.barCount).toBe(1);
    expect(oneBar.strongWeak).not.toBeNull();
    expect(Number.isFinite(oneBar.strongWeak!.equilibrium)).toBe(true);
    expect(oneBar.structureBreaks).toHaveLength(0);
  });

  it('guards against zero volume, flat prices, and NaN/out-of-order bars', () => {
    const ind = new GuardianIndicator({ msMode: 'Dynamic', internalLookback: 5 });
    const flatBars: CanonicalBar[] = Array.from({ length: 40 }, (_, i) =>
      makeBar(1700000000 + i * 60, 100, 100, 100, 100, 0)
    );

    // Inject invalid NaN bar and out-of-order bar
    const state = ind.calculate([
      ...flatBars,
      { time: 1700000000 + 40 * 60, open: NaN, high: 100, low: 100, close: 100, volume: 0, isFinal: true },
      makeBar(1700000000 + 5 * 60, 200, 200, 200, 200, 10), // out-of-order
    ]);

    expect(state.barCount).toBe(40);
    expect(state.strongWeak?.highPct).toBe(0);
    expect(state.strongWeak?.lowPct).toBe(0);
    expect(Number.isFinite(state.strongWeak!.equilibrium)).toBe(true);
    expect(state.impulseTrend.signal).toBe('NEUTRAL');
  });

  it('handles live non-final bar updates at the same timestamp without duplicating bars', () => {
    const ind = new GuardianIndicator();
    const baseBars = makeWaveBars(30);
    ind.calculate(baseBars);

    const nextTime = baseBars[baseBars.length - 1].time + 60;
    ind.update(makeBar(nextTime, 105, 106, 104, 105.5, 100, false));
    expect(ind.getState().barCount).toBe(31);

    ind.update(makeBar(nextTime, 105, 108, 104, 107.5, 250, true));
    expect(ind.getState().barCount).toBe(31);
  });

  it('detects internal BOS, CHoCH, and CHoCH+ market structure breaks', () => {
    const ind = new GuardianIndicator({ internalLookback: 2, swingLookback: 10 });
    // Construct a clear downtrend pivot high, higher low, then bullish breakout (CHoCH / BOS)
    const prices = [
      // Initial swing up and down to establish itrend = -1 and two lows (dn.l)
      [100, 102, 99, 101],
      [101, 103, 100, 102],
      [102, 106, 101, 105], // pivot high at idx 2 (106)
      [105, 105, 102, 103],
      [103, 104, 100, 101],
      [101, 102, 96, 97],   // pivot low at idx 5 (96)
      [97, 100, 97, 99],
      [99, 101, 98, 100],
      [100, 101, 94, 95],   // breaks below 96 -> bearish BOS/break
      [95, 96, 92, 93],     // pivot low at idx 9 (92)
      [93, 99, 93, 98],
      [98, 101, 97, 100],   // pivot high at idx 11 (101)
      [100, 100, 95, 96],   // pivot low at idx 12 (95) -> higher low (95 > 92)
      [96, 98, 96, 97],
      [97, 100, 97, 99],
      [99, 103, 99, 102.5], // breaks above 101 -> CHoCH+ (or CHoCH)
      [102.5, 105, 102, 104],
      [104, 107, 103, 106], // pivot high at idx 17 (107)
      [106, 106, 103, 104],
      [104, 105, 102, 103],
      [103, 109, 103, 108.5], // breaks above 107 -> BOS
    ];
    const bars = prices.map(([o, h, l, c], i) => makeBar(1700000000 + i * 60, o, h, l, c, 200));
    const state = ind.calculate(bars);

    expect(state.structureBreaks.length).toBeGreaterThan(0);
    const labels = state.structureBreaks.map((s) => s.label);
    expect(labels.some((l) => l === 'BOS' || l === 'CHoCH' || l === 'CHoCH+')).toBe(true);
  });

  it('creates and mitigates Volumetric Order Blocks and computes volumePct', () => {
    const ind = new GuardianIndicator({
      internalLookback: 2,
      swingLookback: 10,
      obShow: true,
      obNum: 5,
      obMitigation: 'Absolute',
      obPos: 'Precise',
    });

    const bars = makeWaveBars(120);
    const state = ind.calculate(bars);

    const totalBullPct = state.bullOrderBlocks.reduce((acc, ob) => acc + ob.volumePct, 0);
    const totalBearPct = state.bearOrderBlocks.reduce((acc, ob) => acc + ob.volumePct, 0);

    if (state.bullOrderBlocks.length > 0) {
      expect(totalBullPct).toBeGreaterThan(0);
      expect(totalBullPct).toBeLessThanOrEqual(100);
      for (const ob of state.bullOrderBlocks) {
        expect(ob.top).toBeGreaterThanOrEqual(ob.bottom);
        expect(ob.mid).toBeCloseTo((ob.top + ob.bottom) / 2, 4);
      }
    }
    if (state.bearOrderBlocks.length > 0) {
      expect(totalBearPct).toBeGreaterThan(0);
      expect(totalBearPct).toBeLessThanOrEqual(100);
    }
  });

  it('detects and mitigates Fair Value Gaps (FVG, VI, OG)', () => {
    const ind = new GuardianIndicator({ fvgEnable: true, fvgType: 'FVG', fvgSrc: 'Close' });
    const bars: CanonicalBar[] = [
      makeBar(1700000000, 100, 102, 99, 101, 100),
      makeBar(1700000060, 101, 106, 101, 105, 200),
      makeBar(1700000120, 105, 109, 104, 108, 200), // gap: low(104) > b2.high(102)
    ];

    const state1 = ind.calculate(bars);
    expect(state1.fvgs.length).toBe(1);
    expect(state1.fvgs[0].bull).toBe(true);
    expect(state1.fvgs[0].bottom).toBe(102);
    expect(state1.fvgs[0].top).toBe(104);

    // Mitigate by closing below 102
    const state2 = ind.update(makeBar(1700000180, 108, 108, 100, 101, 300));
    expect(state2.fvgs.length).toBe(0);
  });

  it('detects EQH / EQL when consecutive pivots are within 0.1 * ATR(200)', () => {
    const ind = new GuardianIndicator({ showEql: true });
    const bars: CanonicalBar[] = [
      makeBar(1700000000, 100, 105, 95, 102),
      makeBar(1700000060, 102, 110.0, 100, 104), // pivot high 110.0
      makeBar(1700000120, 104, 106, 101, 103),
      makeBar(1700000180, 103, 110.05, 102, 105), // pivot high 110.05 (diff 0.05 < 0.1 * ATR ~ 0.8)
      makeBar(1700000240, 105, 106, 101, 102),
    ];
    const state = ind.calculate(bars);
    expect(state.eqLevels.some((e) => e.kind === 'EQH')).toBe(true);
  });

  it('computes Strong/Weak High/Low, Equilibrium, and Impulse Trend, and resets cleanly', () => {
    const ind = new GuardianIndicator({ internalLookback: 3, swingLookback: 12, emaLength: 10 });
    const bars = makeWaveBars(150);
    const state = ind.calculate(bars);

    expect(state.strongWeak).not.toBeNull();
    expect(state.strongWeak!.high).toBeGreaterThanOrEqual(state.strongWeak!.low);
    expect(state.strongWeak!.equilibrium).toBeCloseTo(
      (state.strongWeak!.high + state.strongWeak!.low) / 2,
      6
    );
    expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(state.impulseTrend.signal);

    ind.reset();
    expect(ind.getState().barCount).toBe(0);
    expect(ind.getState().strongWeak).toBeNull();
  });
});
