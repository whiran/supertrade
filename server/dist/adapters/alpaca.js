import WebSocket from 'ws';
import { TickAggregator } from '../engine/tickAggregator.js';
import { getCandleRange, insertCandleBatch } from '../db/sqlite.js';
const ALPACA_TF = {
    '1s': '1Sec',
    '5s': '5Sec',
    '1m': '1Min',
    '5m': '5Min',
    '15m': '15Min',
    '30m': '30Min',
    '1h': '1Hour',
    '4h': '4Hour',
    '1d': '1Day',
    '1w': '1Week',
};
function normalizeSymbol(symbol) {
    return symbol.replace('ALPACA:', '').toUpperCase();
}
export class AlpacaAdapter {
    id = 'alpaca';
    assetClass = 'equity';
    feedQuality = 'LIVE_IEX_PARTIAL_VOL';
    apiKey = process.env.ALPACA_API_KEY || '';
    apiSecret = process.env.ALPACA_API_SECRET || '';
    feed = process.env.ALPACA_FEED || 'iex';
    agg = new TickAggregator();
    ws = null;
    subscribedSymbols = new Set();
    get isConfigured() {
        return Boolean(this.apiKey && this.apiSecret);
    }
    async fetchHistory(symbol, tf, limit, endSec) {
        const cached = getCandleRange(symbol, tf, limit, endSec);
        if (!this.isConfigured || cached.length >= Math.min(limit, 100))
            return cached;
        const sym = normalizeSymbol(symbol);
        const url = new URL(`https://data.alpaca.markets/v2/stocks/${sym}/bars`);
        url.searchParams.set('timeframe', ALPACA_TF[tf] || '1Min');
        url.searchParams.set('limit', String(Math.min(limit, 1000)));
        url.searchParams.set('feed', this.feed);
        if (endSec) {
            url.searchParams.set('end', new Date(endSec * 1000).toISOString());
        }
        try {
            const res = await fetch(url.toString(), {
                headers: {
                    'APCA-API-KEY-ID': this.apiKey,
                    'APCA-API-SECRET-KEY': this.apiSecret,
                },
            });
            if (!res.ok)
                throw new Error(`Alpaca error HTTP ${res.status}`);
            const data = (await res.json());
            const bars = (data.bars || []).map((b) => ({
                time: Math.floor(new Date(b.t).getTime() / 1000),
                open: b.o,
                high: b.h,
                low: b.l,
                close: b.c,
                volume: b.v,
                isFinal: true,
            }));
            insertCandleBatch(bars, symbol, tf);
            return bars;
        }
        catch (err) {
            console.warn(`[alpaca] fetchHistory failed:`, err);
            return cached;
        }
    }
    subscribe(symbol, tf, onBar, onQuote) {
        if (!this.isConfigured) {
            return () => { };
        }
        const sym = normalizeSymbol(symbol);
        if (this.subscribedSymbols.size >= 30) {
            console.warn('[alpaca] 30-symbol cap reached for free IEX feed');
            return () => { };
        }
        this.subscribedSymbols.add(sym);
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            const wsUrl = `wss://stream.data.alpaca.markets/v2/${this.feed}`;
            this.ws = new WebSocket(wsUrl);
            this.ws.on('open', () => {
                this.ws?.send(JSON.stringify({
                    action: 'auth',
                    key: this.apiKey,
                    secret: this.apiSecret,
                }));
            });
            this.ws.on('message', (raw) => {
                try {
                    const msgs = JSON.parse(raw.toString());
                    for (const msg of msgs) {
                        if (msg.T === 'authenticated') {
                            this.ws?.send(JSON.stringify({
                                action: 'subscribe',
                                trades: Array.from(this.subscribedSymbols),
                                quotes: Array.from(this.subscribedSymbols),
                            }));
                        }
                        else if (msg.T === 't') {
                            // Trade
                            const s = `ALPACA:${msg.S}`;
                            this.agg.addTick(s, tf, msg.p, msg.s, new Date(msg.t).getTime(), onBar);
                        }
                        else if (msg.T === 'q') {
                            // Quote
                            const s = `ALPACA:${msg.S}`;
                            const bid = msg.bp;
                            const ask = msg.ap;
                            const mid = (bid + ask) / 2;
                            onQuote({
                                symbol: s,
                                assetClass: 'equity',
                                feedQuality: 'LIVE_IEX_PARTIAL_VOL',
                                bid,
                                ask,
                                last: mid,
                                spreadBps: mid > 0 ? ((ask - bid) / mid) * 10000 : 0,
                                timestampMs: Date.now(),
                            });
                        }
                    }
                }
                catch {
                    // ignore
                }
            });
        }
        return () => {
            this.subscribedSymbols.delete(sym);
        };
    }
}
//# sourceMappingURL=alpaca.js.map