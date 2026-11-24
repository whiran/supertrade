import { describe, it, expect } from 'vitest';
import { GRID_CONFIGS } from './MultiChartGrid.js';

describe('MultiChartGrid layout configs up to 16 charts', () => {
  it('correctly maps 1x1 to 4x4 matrix dimensions', () => {
    expect(GRID_CONFIGS['1x1'].count).toBe(1);
    expect(GRID_CONFIGS['1x2'].count).toBe(2);
    expect(GRID_CONFIGS['2x1'].count).toBe(2);
    expect(GRID_CONFIGS['2x2'].count).toBe(4);
    expect(GRID_CONFIGS['3x2'].count).toBe(6);
    expect(GRID_CONFIGS['3x3'].count).toBe(9);
    expect(GRID_CONFIGS['4x4'].count).toBe(16);
  });
});
