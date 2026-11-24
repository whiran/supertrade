import type { AlertRule, CanonicalBar, LiveQuote } from '@tv/shared';
export interface AlertTriggerEvent {
    alertId: string;
    symbol: string;
    tf: string;
    price: number;
    timeMs: number;
    reason: string;
}
export declare class AlertRunner {
    private alerts;
    private lastTriggerTimes;
    private history;
    loadAlerts(alerts: AlertRule[]): void;
    evaluateBar(bar: CanonicalBar, symbol: string, tf: string): void;
    evaluateQuote(quote: LiveQuote): void;
    private dispatchWebhook;
    getTriggerHistory(): AlertTriggerEvent[];
}
export declare const alertRunner: AlertRunner;
//# sourceMappingURL=alertRunner.d.ts.map