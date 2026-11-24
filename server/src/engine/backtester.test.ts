import { describe, it, expect } from 'vitest';
import { Backtester } from './backtester.js';
import { insertCandleBatch } from '../db/sqlite.js';
import type { CanonicalBar } from '@tv/shared';

describe('Backtester strategy engine & 5 quant checks', () => {
  it('evaluates EMA crossover and computes all 5 quant checks', () => {
    const symbol = 'TEST:SYNTH';
    const bars: CanonicalBar[] = [];
    let price = 100;

    // Generate 200 synthetic oscillating bars
    for (let i = 0; i < 200; i++) {
      const delta = Math.sin(i / 10) * 5 + (i % 2 === 0 ? 1 : -0.8);
      price += delta;
      bars.push({
        time: 1700000000 + i * 60,
        open: price - 0.5,
        high: price + 1.5,
        low: price - 1.5,
        close: price,
        volume: 100,
        isFinal: true,
      });
    }

    insertCandleBatch(bars, symbol, '1m');

    const tester = new Backtester();
    const result = tester.run({
      symbol,
      tf: '1m',
      strategyName: 'EMA_CROSSOVER',
      params: { fast: 5, slow: 15 },
      startSec: 1700000000,
      endSec: 1700000000 + 200 * 60,
      initialCapital: 100000,
      feeBps: 5,
      slippageBps: 2,
    });

    expect(result.config.symbol).toBe(symbol);
    expect(result.quantChecks).toBeDefined();
    expect(result.quantChecks.walkForward.windows).toBe(1);
    expect(result.quantChecks.overfitting.perturbedParams).toBe(2);
    expect(result.quantChecks.deflatedSharpe).toBeDefined();
    expect(result.quantChecks.costStress.stillProfitableAt3x).toBeDefined();
    expect(result.quantChecks.monteCarlo.simulations).toBe(1000);
  });
});
