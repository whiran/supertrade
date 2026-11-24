import type { CanonicalBar, LiveQuote, ProviderAdapter, Timeframe } from '@tv/shared';
export declare class BinanceAdapter implements ProviderAdapter {
    readonly id = "binance";
    readonly assetClass: "crypto";
    readonly feedQuality: "LIVE_EXCHANGE";
    private agg;
    private ws;
    private activeStreams;
    private onBarCallbacks;
    private onQuoteCallbacks;
    private rolloverTimer;
    fetchHistory(symbol: string, tf: Timeframe, limit: number, endSec?: number): Promise<CanonicalBar[]>;
    subscribe(symbol: string, tf: Timeframe, onBar: (bar: CanonicalBar) => void, onQuote: (quote: LiveQuote) => void): () => void;
    private ensureConnection;
}
//# sourceMappingURL=binance.d.ts.map