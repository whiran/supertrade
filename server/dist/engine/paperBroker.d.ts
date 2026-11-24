import type { Order, Position, CanonicalBar } from '@tv/shared';
export declare class PaperBroker {
    placeOrder(input: Omit<Order, 'id' | 'status' | 'createdAtMs'>): Order;
    cancelOrder(id: string): boolean;
    onBarUpdate(bar: CanonicalBar, symbol: string): void;
    private executeFill;
    getAccount(): {
        balance: number;
        equity: number;
    };
    getOrders(): Order[];
    getPositions(): Position[];
}
export declare const paperBroker: PaperBroker;
//# sourceMappingURL=paperBroker.d.ts.map