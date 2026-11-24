import { describe, it, expect } from 'vitest';
import { DrawingController } from './DrawingController.js';

describe('DrawingController unit tests', () => {
  it('instantiates and provides safe fallback APIs', () => {
    const mockChart: any = {};
    const mockSeries: any = {};
    const barsRef: any = { current: [] };

    const controller = new DrawingController(mockChart, mockSeries, barsRef);
    expect(controller).toBeDefined();

    controller.setSymbol('BINANCE:BTCUSDT');
    controller.setTool('TrendLine');
    controller.setMagnet('strong');
    expect(controller.exportJSON()).toBe('{}');

    controller.undo();
    controller.redo();
    controller.destroy();
  });
});
