---
trigger: glob
globs: "client/src/chart/**/*.ts, client/src/chart/**/*.tsx"
description: >-
  Lightweight Charts v5 guardrails. Enforces v5-only series addition, multi-pane oscillator layouts,
  zero-flicker streaming updates, and DOM-ref legend rendering.
---

# Lightweight Charts v5 Guardrails

## FORBIDDEN v4 APIs
Never call the following deprecated methods on `IChartApi`:
- `chart.addCandlestickSeries()`
- `chart.addLineSeries()`
- `chart.addAreaSeries()`
- `chart.addHistogramSeries()`

## REQUIRED v5 APIs
Import series definitions directly from `lightweight-charts`:
```ts
import { CandlestickSeries, LineSeries, HistogramSeries, AreaSeries } from 'lightweight-charts';

// Add to main chart:
const candleSeries = chart.addSeries(CandlestickSeries, options);

// Add to multi-pane oscillator:
const pane = chart.addPane();
pane.setStretchFactor(0.22);
const rsiSeries = pane.addSeries(LineSeries, options);
```

## Zero-Flicker Updates
- Call `series.setData(history)` exactly **ONCE** per symbol/timeframe load.
- Push live ticks and bar formations exclusively via `series.update(bar)`.

## Performance & UX
- Enable `CrosshairMode.MagnetOHLC`.
- Set `autoSize: true`.
- Maintain `layout.attributionLogo: true` (Apache-2.0 NOTICE compliance).
- Enable `enableConflation` when loaded history exceeds 15,000 bars.
- Never trigger React state re-renders inside `subscribeCrosshairMove` (update OHLCV legend text via DOM refs).

## React Strict Mode Safety
- Store chart and drawing instances in `useRef` inside `useEffect`.
- Always call `chart.remove()` and cleanup controllers on unmount.
