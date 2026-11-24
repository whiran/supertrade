import { describe, it, expect } from 'vitest';
import { BinanceAdapter } from './binance.js';
describe('BinanceAdapter normalization', () => {
    it('instantiates with crypto asset class and LIVE_EXCHANGE feed quality', () => {
        const adapter = new BinanceAdapter();
        expect(adapter.id).toBe('binance');
        expect(adapter.assetClass).toBe('crypto');
        expect(adapter.feedQuality).toBe('LIVE_EXCHANGE');
    });
});
//# sourceMappingURL=binance.test.js.map