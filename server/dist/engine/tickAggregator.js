import { insertCandle } from '../db/sqlite.js';
export const TF_SECONDS = {
    '1s': 1,
    '5s': 5,
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
    '1w': 604800,
};
export class TickAggregator {
    openBars = new Map();
    /**
     * Adds a tick and aggregates it into a CanonicalBar bucket.
     * If the bar crossed a timeframe boundary, the previous bar is finalized (isFinal: true)
     * and persisted to SQLite, and a new forming bar begins.
     */
    addTick(symbol, tf, price, volume, timestampMs, onBar) {
        const intervalSec = TF_SECONDS[tf] || 60;
        const timeSec = Math.floor(timestampMs / 1000);
        const barStartSec = Math.floor(timeSec / intervalSec) * intervalSec;
        const key = `${symbol}:${tf}`;
        const existing = this.openBars.get(key);
        if (existing && barStartSec > existing.time) {
            // Finalize the previous bar
            const finalBar = { ...existing, isFinal: true };
            this.openBars.delete(key);
            try {
                insertCandle(finalBar, symbol, tf);
            }
            catch (err) {
                // Fallback for tests or before DB init
            }
            onBar(finalBar);
        }
        const current = this.openBars.get(key);
        if (!current) {
            const newBar = {
                time: barStartSec,
                open: price,
                high: price,
                low: price,
                close: price,
                volume: volume,
                isFinal: false,
            };
            this.openBars.set(key, newBar);
            onBar({ ...newBar });
        }
        else {
            current.high = Math.max(current.high, price);
            current.low = Math.min(current.low, price);
            current.close = price;
            current.volume += volume;
            onBar({ ...current, isFinal: false });
        }
    }
    getOpenBar(symbol, tf) {
        return this.openBars.get(`${symbol}:${tf}`);
    }
    clear() {
        this.openBars.clear();
    }
}
//# sourceMappingURL=tickAggregator.js.map