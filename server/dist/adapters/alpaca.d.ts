import type { CanonicalBar, LiveQuote, ProviderAdapter, Timeframe } from '@tv/shared';
export declare class AlpacaAdapter implements ProviderAdapter {
    readonly id = "alpaca";
    readonly assetClass: "equity";
    readonly feedQuality: "LIVE_IEX_PARTIAL_VOL";
    private apiKey;
    private apiSecret;
    private feed;
    private agg;
    private ws;
    private subscribedSymbols;
    get isConfigured(): boolean;
    fetchHistory(symbol: string, tf: Timeframe, limit: number, endSec?: number): Promise<CanonicalBar[]>;
    subscribe(symbol: string, tf: Timeframe, onBar: (bar: CanonicalBar) => void, onQuote: (quote: LiveQuote) => void): () => void;
}
//# sourceMappingURL=alpaca.d.ts.map