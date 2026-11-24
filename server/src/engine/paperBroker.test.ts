import { describe, it, expect } from 'vitest';
import { PaperBroker } from './paperBroker.js';

describe('PaperBroker simulated execution ledger', () => {
  it('places and fills market orders applying slippage and fees', () => {
    const broker = new PaperBroker();
    const order = broker.placeOrder({
      symbol: 'BINANCE:BTCUSDT',
      side: 'buy',
      type: 'market',
      qty: 0.5,
      price: 50000,
      feeBps: 10,
      slippageBps: 5,
    });

    expect(order.status).toBe('filled');
    expect(order.filledPrice).toBeGreaterThan(50000); // 5 bps slippage added on buy

    const positions = broker.getPositions().filter((p) => p.symbol === 'BINANCE:BTCUSDT');
    expect(positions.length).toBeGreaterThanOrEqual(1);
  });

  it('places limit orders and triggers execution when price crosses', () => {
    const broker = new PaperBroker();
    const order = broker.placeOrder({
      symbol: 'BINANCE:ETHUSDT',
      side: 'buy',
      type: 'limit',
      qty: 2,
      price: 3000,
      feeBps: 10,
      slippageBps: 0,
    });

    expect(order.status).toBe('open');

    // Bar low above limit price -> no fill
    broker.onBarUpdate(
      { time: 1000, open: 3050, high: 3100, low: 3010, close: 3020, volume: 10, isFinal: true },
      'BINANCE:ETHUSDT'
    );
    expect(broker.getOrders().find((o) => o.id === order.id)?.status).toBe('open');

    // Bar low reaches limit price -> fills
    broker.onBarUpdate(
      { time: 1060, open: 3020, high: 3030, low: 2990, close: 3005, volume: 15, isFinal: true },
      'BINANCE:ETHUSDT'
    );
    expect(broker.getOrders().find((o) => o.id === order.id)?.status).toBe('filled');
  });
});
