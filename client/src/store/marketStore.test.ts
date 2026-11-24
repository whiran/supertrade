import { describe, it, expect, beforeEach } from 'vitest';
import { useMarketStore } from './marketStore.js';

describe('marketStore Zustand unit tests', () => {
  beforeEach(() => {
    useMarketStore.setState({
      activeSymbol: 'BINANCE:BTCUSDT',
      activeTimeframe: '1m',
      layoutMode: '1x1',
      quotes: new Map(),
      activePanel: 'watchlist',
      currentTheme: 'Slate',
      themeOpacity: 100,
      aiBotEnabled: true,
      aiZonesEnabled: true,
      autoSigEnabled: false,
      activeIndicators: ['VOL', 'CVD', 'S.TREND'],
      activeDrawingTool: null,
      magnetMode: 'weak',
    });
  });

  it('initial state has default BTCUSDT and 1m', () => {
    const s = useMarketStore.getState();
    expect(s.activeSymbol).toBe('BINANCE:BTCUSDT');
    expect(s.activeTimeframe).toBe('1m');
    expect(s.layoutMode).toBe('1x1');
  });

  it('setSymbol updates active symbol', () => {
    useMarketStore.getState().setSymbol('OANDA:EUR_USD');
    expect(useMarketStore.getState().activeSymbol).toBe('OANDA:EUR_USD');
  });

  it('setTimeframe updates active timeframe', () => {
    useMarketStore.getState().setTimeframe('1h');
    expect(useMarketStore.getState().activeTimeframe).toBe('1h');
  });

  it('updateQuote preserves map reactivity', () => {
    useMarketStore.getState().updateQuote({
      symbol: 'BINANCE:BTCUSDT',
      assetClass: 'crypto',
      feedQuality: 'LIVE_EXCHANGE',
      bid: 60000,
      ask: 60001,
      last: 60000.5,
      spreadBps: 0.16,
      timestampMs: Date.now(),
    });
    const quote = useMarketStore.getState().quotes.get('BINANCE:BTCUSDT');
    expect(quote).toBeDefined();
    expect(quote?.last).toBe(60000.5);
  });

  // --- New tests for theme, AI, and indicator features ---

  it('setTheme changes current theme', () => {
    useMarketStore.getState().setTheme('OLED');
    expect(useMarketStore.getState().currentTheme).toBe('OLED');
  });

  it('setThemeOpacity changes opacity', () => {
    useMarketStore.getState().setThemeOpacity(50);
    expect(useMarketStore.getState().themeOpacity).toBe(50);
  });

  it('toggleAiBot flips the AI bot state', () => {
    expect(useMarketStore.getState().aiBotEnabled).toBe(true);
    useMarketStore.getState().toggleAiBot();
    expect(useMarketStore.getState().aiBotEnabled).toBe(false);
    useMarketStore.getState().toggleAiBot();
    expect(useMarketStore.getState().aiBotEnabled).toBe(true);
  });

  it('toggleAiZones flips the AI zones state', () => {
    expect(useMarketStore.getState().aiZonesEnabled).toBe(true);
    useMarketStore.getState().toggleAiZones();
    expect(useMarketStore.getState().aiZonesEnabled).toBe(false);
  });

  it('toggleAutoSig flips the auto-signal state', () => {
    expect(useMarketStore.getState().autoSigEnabled).toBe(false);
    useMarketStore.getState().toggleAutoSig();
    expect(useMarketStore.getState().autoSigEnabled).toBe(true);
  });

  it('toggleIndicator adds and removes indicators', () => {
    const s = useMarketStore.getState();
    expect(s.activeIndicators).toContain('CVD');

    // Remove CVD
    s.toggleIndicator('CVD');
    expect(useMarketStore.getState().activeIndicators).not.toContain('CVD');

    // Add RSI
    useMarketStore.getState().toggleIndicator('RSI');
    expect(useMarketStore.getState().activeIndicators).toContain('RSI');

    // Remove RSI
    useMarketStore.getState().toggleIndicator('RSI');
    expect(useMarketStore.getState().activeIndicators).not.toContain('RSI');
  });

  it('setActivePanel switches to new panel types', () => {
    useMarketStore.getState().setActivePanel('trades');
    expect(useMarketStore.getState().activePanel).toBe('trades');

    useMarketStore.getState().setActivePanel('cryptosense');
    expect(useMarketStore.getState().activePanel).toBe('cryptosense');
  });
});
