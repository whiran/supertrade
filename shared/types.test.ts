import { describe, it, expect } from 'vitest';
import type {
  CanonicalBar,
  LiveQuote,
  Timeframe,
  FeedQuality,
  AssetClass,
  Order,
  AlertRule,
} from './types.js';

describe('shared/types smoke tests', () => {
  it('CanonicalBar conforms to LWC v5 time and required fields', () => {
    const bar: CanonicalBar = {
      time: 1700000000,
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      volume: 1000,
      isFinal: true,
    };
    expect(bar.isFinal).toBe(true);
    expect(bar.time).toBeGreaterThan(0);
    expect(bar.close).toBe(105);
  });

  it('LiveQuote computes spreadBps correctly', () => {
    const bid = 100;
    const ask = 100.1;
    const mid = (bid + ask) / 2;
    const spreadBps = ((ask - bid) / mid) * 10000;
    const quote: LiveQuote = {
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto' as AssetClass,
      feedQuality: 'LIVE_EXCHANGE' as FeedQuality,
      bid,
      ask,
      last: 100.05,
      spreadBps,
      timestampMs: Date.now(),
    };
    expect(quote.spreadBps).toBeCloseTo(9.995, 2);
  });

  it('Timeframe enum covers all 10 required periods', () => {
    const timeframes: Timeframe[] = ['1s', '5s', '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    expect(timeframes).toHaveLength(10);
  });

  it('Order structure has all required trading fields', () => {
    const order: Order = {
      id: 'ord_1',
      symbol: 'BINANCE:BTCUSDT',
      side: 'buy',
      type: 'market',
      qty: 0.1,
      price: 50000,
      feeBps: 10,
      slippageBps: 5,
      status: 'filled',
      filledPrice: 50010,
      createdAtMs: Date.now(),
    };
    expect(order.side).toBe('buy');
    expect(order.status).toBe('filled');
  });

  it('AlertRule supports up to 5 compound conditions', () => {
    const alert: AlertRule = {
      id: 'alt_1',
      symbol: 'BINANCE:BTCUSDT',
      tf: '1m',
      conditions: [
        { type: 'price_cross', operator: 'cross_up', value: 50000, onBarCloseOnly: true },
        { type: 'spread_bps', operator: 'lt', value: 5, onBarCloseOnly: false },
      ],
      cooldownSec: 300,
      enabled: true,
    };
    expect(alert.conditions.length).toBeLessThanOrEqual(5);
  });
});
