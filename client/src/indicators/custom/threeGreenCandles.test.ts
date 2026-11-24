import { describe, it, expect } from 'vitest';
import { ThreeGreenCandlesIndicator } from './threeGreenCandles.js';

describe('ThreeGreenCandles custom indicator plugin', () => {
  it('triggers bullish signal on 3 consecutive green candles with increasing volume', () => {
    const plugin = new ThreeGreenCandlesIndicator();

    expect(
      plugin.update({ time: 100, open: 10, high: 12, low: 9, close: 11, volume: 100, isFinal: true })
    ).toBeNull();
    expect(
      plugin.update({ time: 160, open: 11, high: 13, low: 10, close: 12, volume: 150, isFinal: true })
    ).toBeNull();

    const signal = plugin.update({
      time: 220,
      open: 12,
      high: 14,
      low: 11,
      close: 13,
      volume: 200,
      isFinal: true,
    });

    expect(signal).not.toBeNull();
    expect(signal?.triggered).toBe(true);
  });

  it('does not trigger if one candle is red', () => {
    const plugin = new ThreeGreenCandlesIndicator();

    plugin.update({ time: 100, open: 10, high: 12, low: 9, close: 11, volume: 100, isFinal: true });
    plugin.update({ time: 160, open: 12, high: 13, low: 10, close: 10.5, volume: 150, isFinal: true }); // red
    const signal = plugin.update({
      time: 220,
      open: 10.5,
      high: 14,
      low: 10,
      close: 13,
      volume: 200,
      isFinal: true,
    });

    expect(signal).toBeNull();
  });
});
