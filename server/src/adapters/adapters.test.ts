import { describe, it, expect } from 'vitest';
import { AlpacaAdapter } from './alpaca.js';
import { OandaAdapter } from './oanda.js';

describe('Multi-Asset Adapters', () => {
  describe('AlpacaAdapter (US Equities)', () => {
    it('generates realistic stock history out of the box with zero keys', async () => {
      const adapter = new AlpacaAdapter();
      expect(adapter.id).toBe('alpaca');
      expect(adapter.assetClass).toBe('equity');
      expect(adapter.feedQuality).toBe('LIVE_IEX_PARTIAL_VOL');

      const bars = await adapter.fetchHistory('ALPACA:SPY', '1m', 15);
      expect(bars.length).toBeGreaterThanOrEqual(10);
      const last = bars[bars.length - 1];
      expect(last.close).toBeGreaterThan(100);
      expect(last.volume).toBeGreaterThan(0);
      expect(last.high).toBeGreaterThanOrEqual(last.low);
    });

    it('streams live quotes and ticks when subscribed', async () => {
      const adapter = new AlpacaAdapter();
      let quoteCount = 0;
      let barCount = 0;

      const unsub = adapter.subscribe(
        'ALPACA:AAPL',
        '1m',
        (bar) => {
          barCount++;
        },
        (quote) => {
          quoteCount++;
          expect(quote.symbol).toBe('ALPACA:AAPL');
          expect(quote.assetClass).toBe('equity');
          expect(quote.last).toBeGreaterThan(50);
          expect(quote.ask).toBeGreaterThanOrEqual(quote.bid);
        }
      );

      // Wait 1.5 seconds for at least one tick
      await new Promise((resolve) => setTimeout(resolve, 1500));
      unsub();

      expect(quoteCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('OandaAdapter (Forex)', () => {
    it('generates realistic forex history out of the box with zero keys', async () => {
      const adapter = new OandaAdapter();
      expect(adapter.id).toBe('oanda');
      expect(adapter.assetClass).toBe('forex');
      expect(adapter.feedQuality).toBe('LIVE_BROKER_DEMO');

      const bars = await adapter.fetchHistory('OANDA:EUR_USD', '1m', 15);
      expect(bars.length).toBeGreaterThanOrEqual(10);
      const last = bars[bars.length - 1];
      expect(last.close).toBeGreaterThan(0.5);
      expect(last.close).toBeLessThan(2.0);
      expect(last.high).toBeGreaterThanOrEqual(last.low);
    });

    it('streams live forex quotes with realistic spreads and ticks', async () => {
      const adapter = new OandaAdapter();
      let quoteCount = 0;

      const unsub = adapter.subscribe(
        'OANDA:EUR_USD',
        '1m',
        () => {},
        (quote) => {
          quoteCount++;
          expect(quote.symbol).toBe('OANDA:EUR_USD');
          expect(quote.assetClass).toBe('forex');
          expect(quote.spreadBps).toBeGreaterThan(0);
          expect(quote.ask).toBeGreaterThan(quote.bid);
        }
      );

      // Wait 1.5 seconds for at least one tick
      await new Promise((resolve) => setTimeout(resolve, 1500));
      unsub();

      expect(quoteCount).toBeGreaterThanOrEqual(1);
    });
  });
});
