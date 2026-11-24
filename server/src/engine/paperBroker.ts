import type { Order, Position, CanonicalBar } from '@tv/shared';
import {
  getPaperAccount,
  updatePaperAccount,
  getPaperOrders,
  savePaperOrder,
  getPaperPositions,
  savePaperPosition,
  deletePaperPosition,
} from '../db/sqlite.js';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export class PaperBroker {
  placeOrder(input: Omit<Order, 'id' | 'status' | 'createdAtMs'>): Order {
    const order: Order = {
      ...input,
      id: generateId('ord'),
      status: input.type === 'market' ? 'filled' : 'open',
      createdAtMs: Date.now(),
    };

    if (order.type === 'market') {
      const slipFactor = (order.slippageBps || 0) / 10000;
      order.filledPrice = order.side === 'buy' ? order.price * (1 + slipFactor) : order.price * (1 - slipFactor);
      order.status = 'filled';
      this.executeFill(order);
    }

    savePaperOrder(order);
    return order;
  }

  cancelOrder(id: string): boolean {
    const orders = getPaperOrders();
    const order = orders.find((o) => o.id === id);
    if (order && order.status === 'open') {
      order.status = 'cancelled';
      savePaperOrder(order);
      return true;
    }
    return false;
  }

  onBarUpdate(bar: CanonicalBar, symbol: string): void {
    const orders = getPaperOrders().filter((o) => o.symbol === symbol && o.status === 'open');

    for (const order of orders) {
      let fills = false;
      if (order.type === 'limit') {
        fills = order.side === 'buy' ? bar.low <= order.price : bar.high >= order.price;
      } else if (order.type === 'stop') {
        fills = order.side === 'buy' ? bar.high >= order.price : bar.low <= order.price;
      }

      if (fills) {
        const slipFactor = (order.slippageBps || 0) / 10000;
        order.filledPrice =
          order.side === 'buy' ? order.price * (1 + slipFactor) : order.price * (1 - slipFactor);
        order.status = 'filled';
        savePaperOrder(order);
        this.executeFill(order);
      }
    }

    // Update positions unrealized PnL & equity
    const positions = getPaperPositions().filter((p) => p.symbol === symbol);
    let totalUnrealized = 0;
    for (const pos of positions) {
      pos.currentPrice = bar.close;
      pos.unrealizedPnl = (bar.close - pos.avgEntryPrice) * pos.qty * (pos.side === 'buy' ? 1 : -1);
      totalUnrealized += pos.unrealizedPnl;
      savePaperPosition(pos);
    }

    const acct = getPaperAccount();
    updatePaperAccount(acct.balance, acct.balance + totalUnrealized);
  }

  private executeFill(order: Order): void {
    if (!order.filledPrice) return;
    const fee = (order.filledPrice * order.qty * (order.feeBps || 0)) / 10000;
    const acct = getPaperAccount();

    const positions = getPaperPositions();
    const existing = positions.find((p) => p.symbol === order.symbol);

    if (existing) {
      if (existing.side === order.side) {
        // Add to position
        const newQty = existing.qty + order.qty;
        existing.avgEntryPrice =
          (existing.avgEntryPrice * existing.qty + order.filledPrice * order.qty) / newQty;
        existing.qty = newQty;
        savePaperPosition(existing);
      } else {
        // Closing or reducing position
        if (order.qty >= existing.qty) {
          const realized =
            (order.filledPrice - existing.avgEntryPrice) * existing.qty * (existing.side === 'buy' ? 1 : -1) - fee;
          deletePaperPosition(existing.id);
          updatePaperAccount(acct.balance + realized, acct.balance + realized);

          // Overfill in opposite direction
          const remaining = order.qty - existing.qty;
          if (remaining > 0) {
            const newPos: Position = {
              id: generateId('pos'),
              symbol: order.symbol,
              side: order.side,
              qty: remaining,
              avgEntryPrice: order.filledPrice,
              currentPrice: order.filledPrice,
              unrealizedPnl: 0,
              realizedPnl: 0,
              feeBps: order.feeBps,
              openedAtMs: Date.now(),
            };
            savePaperPosition(newPos);
          }
          return;
        } else {
          // Partial close
          const realized =
            (order.filledPrice - existing.avgEntryPrice) * order.qty * (existing.side === 'buy' ? 1 : -1) - fee;
          existing.qty -= order.qty;
          existing.realizedPnl += realized;
          savePaperPosition(existing);
          updatePaperAccount(acct.balance + realized, acct.balance + realized);
          return;
        }
      }
    } else {
      // New position
      const pos: Position = {
        id: generateId('pos'),
        symbol: order.symbol,
        side: order.side,
        qty: order.qty,
        avgEntryPrice: order.filledPrice,
        currentPrice: order.filledPrice,
        unrealizedPnl: 0,
        realizedPnl: 0,
        feeBps: order.feeBps,
        openedAtMs: Date.now(),
      };
      savePaperPosition(pos);
    }

    updatePaperAccount(acct.balance - fee, acct.balance - fee);
  }

  getAccount() {
    return getPaperAccount();
  }
  getOrders() {
    return getPaperOrders();
  }
  getPositions() {
    return getPaperPositions();
  }
}

export const paperBroker = new PaperBroker();
