import type { CanonicalBar, LiveQuote, ProviderAdapter, Timeframe } from '@tv/shared';
export declare class OandaAdapter implements ProviderAdapter {
    readonly id = "oanda";
    readonly assetClass: "forex";
    readonly feedQuality: "LIVE_BROKER_DEMO";
    private apiKey;
    private accountId;
    private agg;
    get isConfigured(): boolean;
    fetchHistory(symbol: string, tf: Timeframe, limit: number, endSec?: number): Promise<CanonicalBar[]>;
    subscribe(symbol: string, tf: Timeframe, onBar: (bar: CanonicalBar) => void, onQuote: (quote: LiveQuote) => void): () => void;
}
//# sourceMappingURL=oanda.d.ts.map