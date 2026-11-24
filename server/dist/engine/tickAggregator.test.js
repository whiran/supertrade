import { describe, it, expect } from 'vitest';
import { TickAggregator } from './tickAggregator.js';
describe('TickAggregator rollover & aggregation logic', () => {
    it('aggregates ticks in the same 1m interval without finalization', () => {
        const agg = new TickAggregator();
        const emitted = [];
        // t = 1000s, 1010s, 1018s -> all in barStartSec = 960 (960 to 1019)
        agg.addTick('BINANCE:BTCUSDT', '1m', 50000, 1.5, 1000000, (b) => emitted.push({ ...b }));
        agg.addTick('BINANCE:BTCUSDT', '1m', 50500, 2.0, 1010000, (b) => emitted.push({ ...b }));
        agg.addTick('BINANCE:BTCUSDT', '1m', 49800, 0.5, 1018000, (b) => emitted.push({ ...b }));
        expect(emitted.length).toBe(3);
        const last = emitted[emitted.length - 1];
        expect(last.isFinal).toBe(false);
        expect(last.open).toBe(50000);
        expect(last.high).toBe(50500);
        expect(last.low).toBe(49800);
        expect(last.close).toBe(49800);
        expect(last.volume).toBe(4.0);
    });
    it('finalizes previous bar when tick crosses timeframe boundary', () => {
        const agg = new TickAggregator();
        const emitted = [];
        // Bar 1: t=60s
        agg.addTick('BINANCE:BTCUSDT', '1m', 100, 10, 60000, (b) => emitted.push({ ...b }));
        // Bar 2: t=120s triggers finalization of bar 1
        agg.addTick('BINANCE:BTCUSDT', '1m', 110, 5, 120000, (b) => emitted.push({ ...b }));
        const finalized = emitted.filter((b) => b.isFinal);
        expect(finalized.length).toBe(1);
        expect(finalized[0].time).toBe(60);
        expect(finalized[0].close).toBe(100);
        const active = agg.getOpenBar('BINANCE:BTCUSDT', '1m');
        expect(active?.time).toBe(120);
        expect(active?.open).toBe(110);
    });
});
//# sourceMappingURL=tickAggregator.test.js.map