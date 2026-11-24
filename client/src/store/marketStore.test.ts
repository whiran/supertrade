import { describe, it, expect, beforeEach } from 'vitest';
import { useMarketStore } from './marketStore.js';

describe('marketStore Zustand unit tests', () => {
  beforeEach(() => {
    useMarketStore.setState({
      activeSymbol: 'BINANCE:BTCUSDT',
      activeTimeframe: '1m',
      layoutMode: '1x1',
      quotes: new Map(),
    });
  });

  it('initial state has default BTCUSDT and 1m', () => {
    const s = useMarketStore.getState();
    expect(s.activeSymbol).toBe('BINANCE:BTCUSDT');
    expect(s.activeTimeframe).toBe('1m');
    expect(s.layoutMode).toBe('1x1');
  });

  it('setSymbol updates active symbol', () => {
    useMarketStore.getState().setSymbol('OANDA:EUR_USD');
    expect(useMarketStore.getState().activeSymbol).toBe('OANDA:EUR_USD');
  });

  it('setTimeframe updates active timeframe', () => {
    useMarketStore.getState().setTimeframe('1h');
    expect(useMarketStore.getState().activeTimeframe).toBe('1h');
  });

  it('updateQuote preserves map reactivity', () => {
    useMarketStore.getState().updateQuote({
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      feedQuality: 'LIVE_EXCHANGE',
      bid: 60000,
      ask: 60001,
      last: 60000.5,
      spreadBps: 0.16,
      timestampMs: Date.now(),
    });
    const quote = useMarketStore.getState().quotes.get('BINANCE:BTCUSDT');
    expect(quote).toBeDefined();
    expect(quote?.last).toBe(60000.5);
  });
});
