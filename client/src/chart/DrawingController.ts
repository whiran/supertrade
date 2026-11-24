import { DrawingManager } from 'lightweight-charts-drawing';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { CanonicalBar } from '@tv/shared';

export type MagnetStrength = 'off' | 'weak' | 'strong';

export class DrawingController {
  private manager: any = null;
  private currentSymbol = '';
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  constructor(
    chart: IChartApi,
    candleSeries: ISeriesApi<'Candlestick'>,
    barsRef: React.MutableRefObject<CanonicalBar[]>,
    magnet: MagnetStrength = 'weak'
  ) {
    try {
      this.manager = new (DrawingManager as any)(chart, candleSeries, {
        bars: () => barsRef.current,
        magnet: magnet === 'off' ? false : magnet,
      });
    } catch (err) {
      console.warn('[DrawingController] DrawingManager initialization warning:', err);
    }
  }

  setSymbol(symbol: string): void {
    this.currentSymbol = symbol;
  }

  setSeries(series: any): void {
    if (this.manager && typeof this.manager.setSeries === 'function') {
      try {
        this.manager.setSeries(series);
      } catch {
        // ignore
      }
    }
  }

  setTool(tool: string | null): void {
    if (!this.manager) return;
    try {
      if (typeof this.manager.setActiveTool === 'function') {
        this.manager.setActiveTool(tool);
      } else if (typeof this.manager.setTool === 'function') {
        this.manager.setTool(tool);
      }
    } catch (err) {
      console.warn('[DrawingController] setTool error:', err);
    }
  }

  setMagnet(magnet: MagnetStrength): void {
    if (!this.manager) return;
    try {
      if (typeof this.manager.setMagnet === 'function') {
        this.manager.setMagnet(magnet === 'off' ? false : magnet);
      }
    } catch {
      // ignore
    }
  }

  undo(): void {
    if (this.manager && typeof this.manager.undo === 'function') {
      this.manager.undo();
    }
  }

  redo(): void {
    if (this.manager && typeof this.manager.redo === 'function') {
      this.manager.redo();
    }
  }

  exportJSON(): string {
    if (!this.manager) return '{}';
    try {
      if (typeof this.manager.exportJSON === 'function') {
        return this.manager.exportJSON();
      }
    } catch {
      // fallback
    }
    return '{}';
  }

  importJSON(jsonString: string): void {
    if (!this.manager || !jsonString || jsonString === '{}') return;
    try {
      if (typeof this.manager.importJSON === 'function') {
        this.manager.importJSON(jsonString);
      }
    } catch (err) {
      console.warn('[DrawingController] importJSON warning:', err);
    }
  }

  async saveToServer(): Promise<void> {
    if (!this.currentSymbol) return;
    const data = this.exportJSON();
    try {
      await fetch(`/api/drawings/${encodeURIComponent(this.currentSymbol)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
    } catch (err) {
      console.warn('[DrawingController] Failed to auto-save drawings:', err);
    }
  }

  async loadFromServer(symbol: string): Promise<void> {
    this.currentSymbol = symbol;
    try {
      const res = await fetch(`/api/drawings/${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const { data } = (await res.json()) as { data: string };
        if (data && data !== '{}') {
          this.importJSON(data);
        }
      }
    } catch (err) {
      console.warn('[DrawingController] Failed to load drawings:', err);
    }
  }

  destroy(): void {
    if (this.manager) {
      try {
        if (typeof this.manager.destroy === 'function') {
          this.manager.destroy();
        }
      } catch {
        // ignore
      }
      this.manager = null;
    }
  }
}
