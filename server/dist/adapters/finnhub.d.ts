export declare function isFinnhubAvailable(): boolean;
export declare function searchSymbols(q: string): Promise<Array<{
    symbol: string;
    description: string;
    type: string;
}>>;
export declare function getCompanyNews(symbol: string): Promise<any[]>;
export declare function getStockProfile(symbol: string): Promise<any>;
//# sourceMappingURL=finnhub.d.ts.map