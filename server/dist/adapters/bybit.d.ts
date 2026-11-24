import type { CanonicalBar, LiveQuote, ProviderAdapter, Timeframe } from '@tv/shared';
export declare class BybitAdapter implements ProviderAdapter {
    readonly id = "bybit";
    readonly assetClass: "crypto";
    readonly feedQuality: "LIVE_EXCHANGE";
    private agg;
    private ws;
    private pingInterval;
    fetchHistory(symbol: string, tf: Timeframe, limit: number, endSec?: number): Promise<CanonicalBar[]>;
    subscribe(symbol: string, tf: Timeframe, onBar: (bar: CanonicalBar) => void, onQuote: (quote: LiveQuote) => void): () => void;
}
//# sourceMappingURL=bybit.d.ts.map