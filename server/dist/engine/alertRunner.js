export class AlertRunner {
    alerts = [];
    lastTriggerTimes = new Map(); // alertId -> timestampMs
    history = [];
    loadAlerts(alerts) {
        this.alerts = alerts;
    }
    evaluateBar(bar, symbol, tf) {
        const now = Date.now();
        for (const alert of this.alerts) {
            if (!alert.enabled || alert.symbol !== symbol || alert.tf !== tf) {
                continue;
            }
            // Cooldown check
            const lastTrigger = this.lastTriggerTimes.get(alert.id) || 0;
            if (now - lastTrigger < alert.cooldownSec * 1000) {
                continue;
            }
            // Check all conditions (AND conjunction, up to 5)
            const allMet = alert.conditions.every((cond) => {
                if (cond.onBarCloseOnly && !bar.isFinal) {
                    return false;
                }
                if (cond.type === 'price_cross') {
                    if (cond.operator === 'gt')
                        return bar.close > cond.value;
                    if (cond.operator === 'lt')
                        return bar.close < cond.value;
                    if (cond.operator === 'cross_up')
                        return bar.high >= cond.value && bar.open < cond.value;
                    if (cond.operator === 'cross_down')
                        return bar.low <= cond.value && bar.open > cond.value;
                }
                return false;
            });
            if (allMet && alert.conditions.length > 0) {
                this.lastTriggerTimes.set(alert.id, now);
                const event = {
                    alertId: alert.id,
                    symbol,
                    tf,
                    price: bar.close,
                    timeMs: now,
                    reason: `Bar condition met: close=${bar.close}`,
                };
                this.history.unshift(event);
                if (this.history.length > 50)
                    this.history.pop();
                this.dispatchWebhook(alert, event);
            }
        }
    }
    evaluateQuote(quote) {
        const now = Date.now();
        for (const alert of this.alerts) {
            if (!alert.enabled || alert.symbol !== quote.symbol)
                continue;
            const lastTrigger = this.lastTriggerTimes.get(alert.id) || 0;
            if (now - lastTrigger < alert.cooldownSec * 1000)
                continue;
            const allMet = alert.conditions.every((cond) => {
                if (cond.onBarCloseOnly)
                    return false;
                if (cond.type === 'spread_bps') {
                    if (cond.operator === 'gt')
                        return quote.spreadBps > cond.value;
                    if (cond.operator === 'lt')
                        return quote.spreadBps < cond.value;
                }
                if (cond.type === 'price_cross') {
                    if (cond.operator === 'gt')
                        return quote.last > cond.value;
                    if (cond.operator === 'lt')
                        return quote.last < cond.value;
                }
                return false;
            });
            if (allMet && alert.conditions.length > 0) {
                this.lastTriggerTimes.set(alert.id, now);
                const event = {
                    alertId: alert.id,
                    symbol: quote.symbol,
                    tf: alert.tf,
                    price: quote.last,
                    timeMs: now,
                    reason: `Quote condition met: last=${quote.last}, spread=${quote.spreadBps.toFixed(1)}bps`,
                };
                this.history.unshift(event);
                if (this.history.length > 50)
                    this.history.pop();
                this.dispatchWebhook(alert, event);
            }
        }
    }
    async dispatchWebhook(alert, event) {
        const payload = {
            alertId: alert.id,
            symbol: alert.symbol,
            tf: alert.tf,
            price: event.price,
            time: new Date(event.timeMs).toISOString(),
            reason: event.reason,
        };
        // Custom Webhook
        if (alert.webhookUrl) {
            try {
                await fetch(alert.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }
            catch (err) {
                console.warn(`[alertRunner] Webhook dispatch error:`, err.message);
            }
        }
        // Discord Webhook
        const discordUrl = process.env.DISCORD_WEBHOOK_URL;
        if (discordUrl) {
            try {
                await fetch(discordUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: `🚨 **TradingView Alert Triggered**\n**Symbol:** ${alert.symbol} (${alert.tf})\n**Price:** ${event.price}\n**Reason:** ${event.reason}`,
                    }),
                });
            }
            catch {
                // ignore
            }
        }
        // Telegram Bot
        const tgToken = process.env.TELEGRAM_BOT_TOKEN;
        const tgChat = process.env.TELEGRAM_CHAT_ID;
        if (tgToken && tgChat) {
            try {
                await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: tgChat,
                        text: `🚨 Alert: ${alert.symbol} (${alert.tf}) @ ${event.price}\n${event.reason}`,
                    }),
                });
            }
            catch {
                // ignore
            }
        }
    }
    getTriggerHistory() {
        return [...this.history];
    }
}
export const alertRunner = new AlertRunner();
//# sourceMappingURL=alertRunner.js.map