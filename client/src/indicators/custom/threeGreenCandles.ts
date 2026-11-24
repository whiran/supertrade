import type { CanonicalBar } from '@tv/shared';

export interface CustomIndicatorSignal {
  time: number;
  triggered: boolean;
  message: string;
}

/**
 * Sample custom indicator plugin: Three Green Candles Pattern.
 * Detects 3 consecutive bullish bars with expanding volume.
 */
export class ThreeGreenCandlesIndicator {
  readonly id = 'custom_three_green_candles';
  readonly name = 'Three Green Candles';

  private barWindow: CanonicalBar[] = [];

  update(bar: CanonicalBar): CustomIndicatorSignal | null {
    if (!bar.isFinal) return null;

    this.barWindow.push(bar);
    if (this.barWindow.length > 3) {
      this.barWindow.shift();
    }

    if (this.barWindow.length === 3) {
      const [b1, b2, b3] = this.barWindow;
      const allGreen = b1.close > b1.open && b2.close > b2.open && b3.close > b3.open;
      const volumeRising = b3.volume >= b2.volume && b2.volume >= b1.volume;

      if (allGreen && volumeRising) {
        return {
          time: bar.time,
          triggered: true,
          message: 'Bullish 3 Green Candles with Expanding Volume detected',
        };
      }
    }

    return null;
  }

  reset(): void {
    this.barWindow = [];
  }
}
