import { getCandleRange } from '../db/sqlite.js';
export async function screenerRoutes(app) {
    app.get('/api/screener', async (req) => {
        const { symbols = '' } = req.query;
        const symList = symbols ? symbols.split(',') : [];
        const rows = symList.map((symbol) => {
            const bars = getCandleRange(symbol, '1m', 1440);
            const closes = bars.map((b) => b.close);
            const last = closes[closes.length - 1] || 0;
            const first = closes[0] || last;
            const pctChange24h = first > 0 ? ((last - first) / first) * 100 : 0;
            // Simple RSI(14)
            let rsi14 = 50;
            if (closes.length > 14) {
                let gains = 0, losses = 0;
                for (let i = closes.length - 14; i < closes.length; i++) {
                    const d = closes[i] - closes[i - 1];
                    if (d > 0)
                        gains += d;
                    else
                        losses -= d;
                }
                const rs = losses === 0 ? 100 : gains / losses;
                rsi14 = 100 - 100 / (1 + rs);
            }
            // Simple EMA50
            let ema50 = last;
            if (closes.length >= 50) {
                const k = 2 / 51;
                ema50 = closes.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
                for (let i = 50; i < closes.length; i++) {
                    ema50 = closes[i] * k + ema50 * (1 - k);
                }
            }
            const trend = last > ema50 ? 'bullish' : last < ema50 ? 'bearish' : 'neutral';
            return {
                symbol,
                lastPrice: last,
                pctChange24h,
                rsi14,
                trend,
                spreadBps: 1.5,
            };
        });
        return { rows };
    });
    app.get('/api/screener/heatmap', async (req) => {
        const { symbols = '' } = req.query;
        const symList = symbols ? symbols.split(',') : [];
        const cells = symList.map((symbol) => {
            const bars = getCandleRange(symbol, '1d', 2);
            const pct = bars.length >= 2 && bars[0].close > 0
                ? ((bars[1].close - bars[0].close) / bars[0].close) * 100
                : 0;
            const color = pct >= 0
                ? '#26a69a'
                : '#ef5350';
            return { symbol, value: pct, color };
        });
        return { cells };
    });
}
//# sourceMappingURL=screener.js.map