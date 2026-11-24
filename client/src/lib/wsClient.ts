import type {
  WsClientMessage,
  WsServerMessage,
  Timeframe,
  CanonicalBar,
  LiveQuote,
} from '@tv/shared';

type BarCallback = (symbol: string, tf: Timeframe, bar: CanonicalBar) => void;
type QuoteCallback = (quote: LiveQuote) => void;
type StatusCallback = (connected: boolean) => void;

class TypedWsClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 15000;

  // Reference counted subscriptions: "symbol:tf" -> count
  private subs = new Map<string, number>();

  private barListeners = new Set<BarCallback>();
  private quoteListeners = new Set<QuoteCallback>();
  private statusListeners = new Set<StatusCallback>();

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.notifyStatus(true);

      // Resubscribe all active subscriptions
      for (const [key] of this.subs.entries()) {
        const [symbol, tf] = key.split(':') as [string, Timeframe];
        this.send({ type: 'subscribe', symbol, tf });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsServerMessage = JSON.parse(event.data);
        if (msg.type === 'bar') {
          this.barListeners.forEach((cb) => cb(msg.symbol, msg.tf, msg.bar));
        } else if (msg.type === 'quote') {
          this.quoteListeners.forEach((cb) => cb(msg.quote));
        }
      } catch {
        // ignore malformed message
      }
    };

    this.ws.onclose = () => {
      this.notifyStatus(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }

  private send(msg: WsClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  subscribe(symbol: string, tf: Timeframe): () => void {
    const key = `${symbol}:${tf}`;
    const current = this.subs.get(key) || 0;
    this.subs.set(key, current + 1);

    if (current === 0) {
      this.send({ type: 'subscribe', symbol, tf });
    }

    return () => {
      const remaining = (this.subs.get(key) || 1) - 1;
      if (remaining <= 0) {
        this.subs.delete(key);
        this.send({ type: 'unsubscribe', symbol, tf });
      } else {
        this.subs.set(key, remaining);
      }
    };
  }

  onBar(cb: BarCallback): () => void {
    this.barListeners.add(cb);
    return () => this.barListeners.delete(cb);
  }

  onQuote(cb: QuoteCallback): () => void {
    this.quoteListeners.add(cb);
    return () => this.quoteListeners.delete(cb);
  }

  onStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    if (this.ws) {
      cb(this.ws.readyState === WebSocket.OPEN);
    }
    return () => this.statusListeners.delete(cb);
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((cb) => cb(connected));
  }
}

export const wsClient = new TypedWsClient();
