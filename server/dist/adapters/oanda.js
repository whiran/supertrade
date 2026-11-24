import { TickAggregator } from '../engine/tickAggregator.js';
import { getCandleRange, insertCandleBatch } from '../db/sqlite.js';
const OANDA_GRAN = {
    '1s': 'S5',
    '5s': 'S5',
    '1m': 'M1',
    '5m': 'M5',
    '15m': 'M15',
    '30m': 'M30',
    '1h': 'H1',
    '4h': 'H4',
    '1d': 'D',
    '1w': 'W',
};
function normalizeSymbol(symbol) {
    return symbol.replace('OANDA:', '');
}
export class OandaAdapter {
    id = 'oanda';
    assetClass = 'forex';
    feedQuality = 'LIVE_BROKER_DEMO';
    apiKey = process.env.OANDA_API_KEY || '';
    accountId = process.env.OANDA_ACCOUNT_ID || '';
    agg = new TickAggregator();
    get isConfigured() {
        return Boolean(this.apiKey && this.accountId);
    }
    async fetchHistory(symbol, tf, limit, endSec) {
        const cached = getCandleRange(symbol, tf, limit, endSec);
        if (!this.isConfigured || cached.length >= Math.min(limit, 100))
            return cached;
        const instrument = normalizeSymbol(symbol);
        const gran = OANDA_GRAN[tf] || 'M1';
        const url = new URL(`https://api-fxpractice.oanda.com/v3/instruments/${instrument}/candles`);
        url.searchParams.set('granularity', gran);
        url.searchParams.set('count', String(Math.min(limit, 5000)));
        url.searchParams.set('price', 'M');
        if (endSec) {
            url.searchParams.set('to', new Date(endSec * 1000).toISOString());
        }
        try {
            const res = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Accept-Datetime-Format': 'UNIX',
                },
            });
            if (!res.ok)
                throw new Error(`OANDA error HTTP ${res.status}`);
            const data = (await res.json());
            const bars = (data.candles || [])
                .filter((c) => c.complete)
                .map((c) => ({
                time: Math.floor(parseFloat(c.time)),
                open: parseFloat(c.mid.o),
                high: parseFloat(c.mid.h),
                low: parseFloat(c.mid.l),
                close: parseFloat(c.mid.c),
                volume: c.volume || 0,
                isFinal: true,
            }));
            insertCandleBatch(bars, symbol, tf);
            return bars;
        }
        catch (err) {
            console.warn(`[oanda] fetchHistory error:`, err);
            return cached;
        }
    }
    subscribe(symbol, tf, onBar, onQuote) {
        if (!this.isConfigured)
            return () => { };
        const instrument = normalizeSymbol(symbol);
        const url = `https://stream-fxpractice.oanda.com/v3/accounts/${this.accountId}/pricing/stream?instruments=${instrument}`;
        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${this.apiKey}` },
                    signal: controller.signal,
                });
                if (!res.body)
                    return;
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        if (!line.trim())
                            continue;
                        try {
                            const obj = JSON.parse(line);
                            if (obj.type === 'HEARTBEAT')
                                continue;
                            if (obj.type === 'PRICE' && obj.bids && obj.asks) {
                                const bid = parseFloat(obj.bids[0].price);
                                const ask = parseFloat(obj.asks[0].price);
                                const mid = (bid + ask) / 2;
                                onQuote({
                                    symbol,
                                    assetClass: 'forex',
                                    feedQuality: 'LIVE_BROKER_DEMO',
                                    bid,
                                    ask,
                                    last: mid,
                                    spreadBps: mid > 0 ? ((ask - bid) / mid) * 10000 : 0,
                                    timestampMs: Date.now(),
                                });
                                this.agg.addTick(symbol, tf, mid, 0, Date.now(), onBar);
                            }
                        }
                        catch {
                            // skip malformed chunk
                        }
                    }
                }
            }
            catch (err) {
                if (err.name !== 'AbortError') {
                    console.warn('[oanda] stream error:', err.message);
                }
            }
        })();
        return () => {
            controller.abort();
        };
    }
}
//# sourceMappingURL=oanda.js.map