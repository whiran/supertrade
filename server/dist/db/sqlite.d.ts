import { type Database as DatabaseType } from 'better-sqlite3';
import type { CanonicalBar, Order, Position, AlertRule } from '@tv/shared';
declare const db: DatabaseType;
export declare function insertCandle(bar: CanonicalBar, symbol: string, tf: string): void;
export declare function insertCandleBatch(bars: CanonicalBar[], symbol: string, tf: string): void;
export declare function getCandleRange(symbol: string, tf: string, limit: number, endSec?: number): CanonicalBar[];
export declare function getWatchlists(): Array<{
    id: string;
    name: string;
    symbols: string[];
}>;
export declare function upsertWatchlist(id: string, name: string, symbols: string[]): void;
export declare function getDrawings(symbol: string): string;
export declare function saveDrawings(symbol: string, data: string): void;
export declare function getAlerts(): AlertRule[];
export declare function saveAlert(alert: AlertRule): void;
export declare function deleteAlert(id: string): void;
export declare function getPaperAccount(): {
    balance: number;
    equity: number;
};
export declare function updatePaperAccount(balance: number, equity: number): void;
export declare function getPaperOrders(): Order[];
export declare function savePaperOrder(order: Order): void;
export declare function deletePaperOrder(id: string): void;
export declare function getPaperPositions(): Position[];
export declare function savePaperPosition(pos: Position): void;
export declare function deletePaperPosition(id: string): void;
export { db };
//# sourceMappingURL=sqlite.d.ts.map