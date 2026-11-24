import { describe, it, expect } from 'vitest';
import { AlpacaAdapter } from './alpaca.js';
import { OandaAdapter } from './oanda.js';
import { CommoditiesAdapter } from './commodities.js';
import { IndicesAdapter } from './indices.js';

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

      const unsub = adapter.subscribe(
        'ALPACA:AAPL',
        '1m',
        () => {},
        (quote) => {
          quoteCount++;
          expect(quote.symbol).toBe('ALPACA:AAPL');
          expect(quote.assetClass).toBe('equity');
          expect(quote.last).toBeGreaterThan(50);
          expect(quote.ask).toBeGreaterThanOrEqual(quote.bid);
        }
      );

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

      await new Promise((resolve) => setTimeout(resolve, 1500));
      unsub();
      expect(quoteCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('CommoditiesAdapter (Crude Oil, Gold, Silver, Platinum, Palladium)', () => {
    it('generates realistic history for metals and energy', async () => {
      const adapter = new CommoditiesAdapter();
      expect(adapter.id).toBe('commodities');
      expect(adapter.assetClass).toBe('commodity');

      const oilBars = await adapter.fetchHistory('COMMODITY:USOIL', '1m', 15);
      expect(oilBars.length).toBeGreaterThanOrEqual(10);
      expect(oilBars[oilBars.length - 1].close).toBeGreaterThan(30);

      const goldBars = await adapter.fetchHistory('COMMODITY:XAUUSD', '1m', 15);
      expect(goldBars.length).toBeGreaterThanOrEqual(10);
      expect(goldBars[goldBars.length - 1].close).toBeGreaterThan(1500);

      const silverBars = await adapter.fetchHistory('COMMODITY:XAGUSD', '1m', 15);
      expect(silverBars.length).toBeGreaterThanOrEqual(10);
      expect(silverBars[silverBars.length - 1].close).toBeGreaterThan(15);
    });

    it('streams live quotes for gold and crude oil', async () => {
      const adapter = new CommoditiesAdapter();
      let quoteCount = 0;

      const unsub = adapter.subscribe(
        'COMMODITY:XAUUSD',
        '1m',
        () => {},
        (quote) => {
          quoteCount++;
          expect(quote.symbol).toBe('COMMODITY:XAUUSD');
          expect(quote.assetClass).toBe('commodity');
          expect(quote.last).toBeGreaterThan(2000);
          expect(quote.ask).toBeGreaterThan(quote.bid);
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));
      unsub();
      expect(quoteCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('IndicesAdapter (S&P 500, DJIA, Nasdaq Composite)', () => {
    it('generates realistic history for major indices', async () => {
      const adapter = new IndicesAdapter();
      expect(adapter.id).toBe('indices');
      expect(adapter.assetClass).toBe('index');

      const spxBars = await adapter.fetchHistory('INDEX:SPX', '1m', 15);
      expect(spxBars.length).toBeGreaterThanOrEqual(10);
      expect(spxBars[spxBars.length - 1].close).toBeGreaterThan(3000);

      const djiBars = await adapter.fetchHistory('INDEX:DJI', '1m', 15);
      expect(djiBars.length).toBeGreaterThanOrEqual(10);
      expect(djiBars[djiBars.length - 1].close).toBeGreaterThan(20000);

      const ixicBars = await adapter.fetchHistory('INDEX:IXIC', '1m', 15);
      expect(ixicBars.length).toBeGreaterThanOrEqual(10);
      expect(ixicBars[ixicBars.length - 1].close).toBeGreaterThan(10000);
    });

    it('streams live ticks and quotes for S&P 500', async () => {
      const adapter = new IndicesAdapter();
      let quoteCount = 0;

      const unsub = adapter.subscribe(
        'INDEX:SPX',
        '1m',
        () => {},
        (quote) => {
          quoteCount++;
          expect(quote.symbol).toBe('INDEX:SPX');
          expect(quote.assetClass).toBe('index');
          expect(quote.last).toBeGreaterThan(4000);
          expect(quote.ask).toBeGreaterThan(quote.bid);
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));
      unsub();
      expect(quoteCount).toBeGreaterThanOrEqual(1);
    });
  });
});
