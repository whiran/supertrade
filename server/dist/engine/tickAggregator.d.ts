import type { CanonicalBar, Timeframe } from '@tv/shared';
export declare const TF_SECONDS: Record<Timeframe, number>;
export declare class TickAggregator {
    private openBars;
    /**
     * Adds a tick and aggregates it into a CanonicalBar bucket.
     * If the bar crossed a timeframe boundary, the previous bar is finalized (isFinal: true)
     * and persisted to SQLite, and a new forming bar begins.
     */
    addTick(symbol: string, tf: Timeframe, price: number, volume: number, timestampMs: number, onBar: (bar: CanonicalBar) => void): void;
    getOpenBar(symbol: string, tf: Timeframe): CanonicalBar | undefined;
    clear(): void;
}
//# sourceMappingURL=tickAggregator.d.ts.map