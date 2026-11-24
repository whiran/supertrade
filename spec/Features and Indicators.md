# CGTrading.lk: Features and Indicators

Site analysis prepared November 24, 2026

The site is a browser-based crypto order-flow charting platform titled "ATAS Market Research | Ultra Precision". It is a JavaScript app, so only the labels in the page could be read. Anything described beyond the labels is interpretation, and the behaviour of the tools has not been tested.

## Part 1: Features

### Market and chart controls

- Symbol input with a GO button
- Quick-select symbols: BTC, ETH, SOL, XRP, BNB, DOGE
- Timeframes: 1m, 5m, 15m, 1h, 2h, 4h, 1d
- Live mode and a "24H BACK" history option
- Trend readout
- Chart background colour picker with presets (OLED, Cyber, Slate, Purple, Pine, Charcoal, Mocha, Light) and an opacity slider
- Collapsible sidebar with Chart, Tools, TF and Symbol tabs

### AI features

- AI BOT with an AUTO ON/OFF toggle
- AI-ZONES overlay
- AI auto-signals (AUTO-SIG)
- AI analysis summary written in Sinhala (සිංහල විශ්ලේෂණය)

### Replay mode

- Bar-by-bar replay with previous, next and play controls
- Speeds: 1s, 0.5s, 0.2s and 0.1s per bar

### Drawing tools

- Cursor
- Horizontal line
- Trendline
- Box
- Long position and Short position
- Delta P (delta profile)
- Vol P (volume profile)
- TPO (Time Price Opportunity profile)
- AVWAP (anchored VWAP)
- ADA tracker
- IMB PROF (imbalance profile)
- Undo and Clear

### Profile tools with settings dialogs

- **Absorption Profile:** price rows, volume climax (x average), minimum quality score, maximum penetration (ticks), and a traded-volume backdrop option
- **FRVP (Fixed Range Volume Profile):** inputs, style, coordinates and visibility settings; number of rows or ticks per row; row size; volume total or up/down; value area volume; extend right; and templates

### CryptoSense FA Engine

A fundamental plus order-flow confluence tool that produces an overall score out of 100.

- **Price and valuation:** price, market cap, FDV and the market cap to FDV ratio
- **Tokenomics:** circulating supply and max supply
- **Dev and community:** GitHub commits (4 weeks) and Reddit subscribers
- **Order-flow pressure estimate:** 24h volume to market cap, and 24h price change
- **Macro trend:** 7-day change, 30-day change and distance from all-time high
- **Social sentiment:** Twitter followers, Telegram users and CoinGecko rank
- **Institutional and DeFi:** total value locked, market cap to TVL ratio and liquidity score
- **Profile and ranges:** genesis date and 24h high and low
- **Open interest and funding:** open interest, 24h OI change, funding rate and a "Smart Money OI Wall"
- **Smart money vs retail:** retail long/short ratio, taker buy/sell (CVD) and orderbook imbalance

### Time & Sales (T&S) panel

- Minimum dollar-size filter
- Price, size and time columns
- Buy count, delta and sell count totals

### Panel chart modes and tools

- Candles, Line, Footprint, Volume Profile and VWAP
- Bubbles and Load (whale loading)
- Notes
- Undo and Clear

## Part 2: Indicators

The platform groups its indicators into six dropdown menus.

### Order Flow

IMB, STK, CG-ABS, OF-STRUCT, HEAT, BAND, DELTA, WHALE, SIZE-Δ, VPT, DOM-LIQ, DOM-PROF, MMS, NEWS, LIQ-POOL, SWEPT, ICEBERG, PACE, WICK-Δ, REKT, GLOW, FOOT, SPOOF, BBA DELTA, ORSI, OF-MACD

### Volume / Delta

VOL-BOX, VOL, CVD, CVD-C, G-DELTA, MTF FP, SHAPE, C-VOL, C-DELTA, HV-BUY, HV-SELL, LVN, HVN, TPO-LVN, VWBA, ABS, SIAT, SIAT-C, ACD, STATS, CANDLE

### Structure

FVG, SNR, SK, EW (Elliott Wave), WYC (Wyckoff), SMC, CRT, PATTERNS, AUTO-CH, GHOST, PIVOT, SESS

### Levels / OI

VWAP, AVWAP, D-OPEN, D-TPO, D-VOL, D-FVH, N-POC (naked POC), KEY-LVL, HTF-LVL, OI, OIT, OI-WALL

### Entry Setup

| Category | Indicators |
| --- | --- |
| Smart Money Concepts | CHoCH, BREAKER, OB, ZONE, LIQ SWEEP, FAIR VAL |
| Price Action | PA SIGNAL, S.TREND, T.CLOUD, KELTNER, DONCHIAN |
| Momentum & Divergence | DIVERG, MOMENTUM, D.STREAK, CUM DIV |
| Volume Profile | VPVR, RANGE, POC, SESS VWAP |
| Auto Levels | AUTO FIB, VOL MA |
| Institutional | S/D ZONE, LIQ LVL, MKT STRUC, IMB MAP, TAPE SPD |
| Advanced Confluence | HTF BIAS, TRENDLINE, VWAP DEV, HVB, PIVOT, CONFLUENCE |
| Wyckoff / VSA | SPRING, UPTHRUST, CAUSE, EFF/RES, SCHEMATIC |

### ICT Models

| Category | Indicators |
| --- | --- |
| Core ICT Concepts | OTE, PD ARRAY, MSS, MMXM |
| Time-Based Models | SILVER, JUDAS, AMD, NWOG |
| Pattern Models | TMC, OPTEX |
| Advanced ICT | PD MATRIX, POWER3, KILL ZONE, FVG CHAIN, HTF OB |
| Order Flow Model | OF SWEEP, OF OB, OF FVG, DELTA TRAP, OF FULL ★ |

### Pro Tools

| Category | Indicators |
| --- | --- |
| Volatility & Range | ATR CH, B.BANDS, SQUEEZE, HI/LO, RANGE EXT |
| Order Flow Advanced | MTF-ABS, ABSORB, AGG FLOW, STK IMB, EXHAUST, INIT ACT |
| Multi-Timeframe | HTF CANDLE, MTF VWAP, HTF EMA, SESS H/L |
| Smart Signals | TREND BAR, MOM DIV, VOL SPIKE, CLV, RNG BRK, TICK SPD, PUSH |
| RSI | RSI MAP |

### Sidebar indicator panel

The sidebar repeats most of the indicators above under longer names, such as ELLIOTT WAVE, WYCKOFF MODEL, SMC SYSTEM, CRT SETUP, NAKED POC and OI WALL. It also lists a few that do not appear in the dropdowns:

- STACKED (stacked imbalances)
- AI ZONES
- VOL / TICK
- MMS SCORE
- SWEPT ZONES
- Δ-COLOR
- LINE
- SESSIONS
- VOLUME
- ABS ZONE
- MTF ABS
- GHOST BOOK
- OI PANEL
- LVN LINES
- HVN PROFILE
- MTF HEAT
- GLOBAL Δ

## Summary

There are about 100 distinct indicators across the six menus, plus the drawing tools, replay mode, the CryptoSense FA Engine and the Time & Sales panel. Many indicators are unexplained abbreviations (for example OPTEX, TMC, SK and MMS), and their exact behaviour cannot be confirmed without using the live tool.

## Part 3: Detailed Analysis

### How to read this section

The site gives no help text for its tools, so every explanation here comes from the label plus the standard meaning of that term in order-flow, Smart Money Concepts (SMC), ICT, Wyckoff and Auction Market Theory trading. Each row carries a confidence tag:

- **Standard:** a widely used concept with an agreed meaning. The site's version may still differ in settings and visuals.
- **Likely:** the name is not standard, but the label and its menu group point to one reading.
- **Unclear:** a proprietary or ambiguous abbreviation. The reading given is a guess and should be checked on the live tool.

None of the tools were run, so accuracy, data source and calculation settings are unverified.

## 3.1 Chart tools

### Drawing tools

| Tool | What it does | Typical use | Confidence |
| --- | --- | --- | --- |
| Cursor | Default pointer for selecting and moving drawings | Adjust or delete existing drawings | Standard |
| H-Line | Draws a horizontal line at a chosen price | Mark support, resistance, targets and stops | Standard |
| Trend | Draws a line between two anchor points | Trendlines, channel edges | Standard |
| Box | Draws a rectangle over a price and time range | Mark supply/demand zones, ranges, order blocks | Standard |
| Long / Short | Position tool showing entry, stop, target and risk-to-reward | Plan and review trades visually | Standard |
| Delta P | Delta profile: net buy minus sell volume at each price inside a drawn range | See which prices were won by buyers or sellers | Likely |
| Vol P | Volume profile over a drawn range, showing POC and value area | Find acceptance zones and key prices in a swing or session | Standard |
| TPO | Market Profile (time-price opportunity) over a range | See where price spent the most time, value area, poor highs/lows | Standard |
| AVWAP | Anchored VWAP started from a clicked bar | Fair-value reference from a swing high/low, news bar or breakout | Standard |
| ADA tracker | Not explained anywhere on the page | Unknown. Possibly an absorption/delta tracker | Unclear |
| IMB PROF | Imbalance profile: counts of footprint imbalances per price level | Find prices with repeated one-sided aggression | Likely |
| Undo / Clear | Remove the last drawing or all drawings | Housekeeping | Standard |

The compact toolbar also shows ABP, NDP, AVP, CVD, PACE and IMB shortcuts. ABP is the absorption profile and AVP is almost certainly the anchored volume profile. NDP is not explained (possibly a net delta profile).

### Profile tools with settings dialogs

**Absorption Profile.** Absorption means heavy aggressive volume trades into a price without moving it, because passive orders soak it up. The dialog exposes five controls:

- *Price Rows:* the resolution of the profile (how many price buckets).
- *Volume Climax (x avg):* a bar counts as a candidate only if its volume is this many times the average.
- *Min Quality Score:* a filter on the tool's own scoring of each absorption event.
- *Max Penetration (ticks):* how far price may push through the level and still count as absorbed.
- *Show traded-volume backdrop:* draws the ordinary volume profile behind the absorption marks.

Use: mark levels where large players defended a price, then watch for reactions on a retest. Higher climax and quality settings give fewer, stronger signals.

**FRVP (Fixed Range Volume Profile).** This is the standard volume profile applied to a range the trader chooses. Settings cover rows layout (number of rows or ticks per row), row size, volume mode (total or up/down split), value area percentage, style, coordinates, visibility, extend-right and saved templates. The dialog note "Real candles, auto timeframe (no history fetch)" suggests the profile is built from candles already on screen, not from raw tick history. That makes it fast, but less precise than a tick-based profile.

### Replay mode

Bar-by-bar replay lets the trader step back in time and watch the chart develop with previous/next/play controls at 1s, 0.5s, 0.2s or 0.1s per bar. It is used for practice, reviewing setups and training pattern recognition without risking money. It is not a full backtester, since it produces no performance statistics.

### Top-bar and mode controls

| Control | Likely function | Confidence |
| --- | --- | --- |
| LIVE | Switches the chart to the real-time feed | Standard |
| 24H BACK | Loads the previous 24 hours of data or history | Likely |
| AI BOT / AUTO ON-OFF | Turns the AI analysis assistant and its automatic updating on or off | Likely |
| AI-ZONES | Draws zones the AI thinks matter (supply, demand, absorption) | Likely |
| AUTO-SIG | Automatic buy/sell signal markers | Likely |
| FUND | Opens the CryptoSense FA Engine | Likely |
| BG | Opens the chart background colour dialog | Standard |
| CLR | Clears indicators or drawings from the chart | Likely |
| TREND: -- | Short trend readout, probably from the AI or a trend filter | Unclear |

### CryptoSense FA Engine

A fundamental analysis (FA) plus order-flow analysis (OFA) panel for the selected coin. It returns a score out of 100 and an AI summary in Sinhala. Each block, and how to use it:

| Block | Metrics | How to interpret |
| --- | --- | --- |
| Price & valuation | Price, market cap, FDV, market cap/FDV ratio | A low ratio means many tokens are still locked, so future supply inflation is a risk |
| Tokenomics | Circulating supply, max supply | A higher circulating share means less unlock/dump risk. "Infinite" max supply means ongoing dilution |
| Dev & community | GitHub commits (4 weeks), Reddit subscribers | Active development suggests the project is alive. Reddit size is a weak signal |
| Orderflow pressure (Est) | 24h volume/market cap, 24h price change | A rough proxy for buy/sell pressure. It is estimated and is not real order-flow data |
| Macro trend | 7D change, 30D change, distance from ATH | Longer-term momentum and how far the coin is from its peak |
| Social sentiment | Twitter followers, Telegram users, CoinGecko rank | Retail attention. Easy to inflate and lagging |
| Institutional & DeFi | TVL, market cap/TVL, liquidity score | Market cap/TVL below 1 is read as undervalued for DeFi projects. It does not apply to non-DeFi coins |
| Profile & ranges | Genesis date, 24h high/low | Age and short-term volatility |
| Open interest & funding | OI, 24h OI change, funding rate, "Smart Money OI Wall" | Rising OI with price confirms a trend. Extreme funding signals crowded positioning |
| Smart money vs retail | Retail long/short ratio, taker buy/sell (CVD), orderbook imbalance | The page says a retail long/short ratio above 2.5 means retail is trapped and may get flushed |

Strengths: it brings fundamentals, derivatives and order-flow context into one view. Weaknesses: the weighting behind the 0 to 100 score is not disclosed, several inputs are estimates, and fundamentals like tokenomics rarely matter on intraday timeframes. Treat the score as a screening aid, not a signal.

### Time & Sales (T&S) panel

A live tape of individual trades (price, size, time) with a minimum-dollar filter and running totals of buys, sells and delta (B, S, Δ). Use it to see large prints as they happen and to confirm whether aggression is on the bid or the ask. The filter removes retail-size noise.

### Chart modes in the bottom panel

| Mode | What it shows | Confidence |
| --- | --- | --- |
| CNDL | Standard candlesticks | Standard |
| LINE | Close-price line | Standard |
| FOOT | Footprint: buy and sell volume at each price inside each candle | Standard |
| VP | Volume profile | Standard |
| VWAP | Volume-weighted average price line | Standard |
| BUB | Bubbles: circles sized by trade or volume size | Likely |
| LOAD (whale) | Loads or highlights large trades | Likely |
| NOTES | Text notes on the chart | Standard |
| UNDO / CLR | Removes the last or all marks | Standard |

## 3.2 Order Flow indicators

Order-flow indicators read who is aggressing (market orders hitting the bid or ask) and who is resting (limit orders). The ones marked "book data" need live order-book depth, not just trades, so their quality depends on the site's data feed.

| Indicator | What it likely shows | How traders use it | Confidence |
| --- | --- | --- | --- |
| IMB | Footprint imbalances: a price where aggressive buying (or selling) is a large multiple of the opposite side, usually compared diagonally | Marks strong one-sided aggression. Often becomes support or resistance on retest | Standard |
| STK / STACKED | Stacked imbalances: three or more imbalances at adjacent prices | Signals strong commitment. Zones are watched for retests and continuation | Standard |
| CG-ABS | The site's own absorption detector ("CG" is probably the site brand) | Finds prices where heavy volume was absorbed without price progress | Likely |
| OF-STRUCT | Market structure (swing highs and lows) read together with order flow | Confirms structure breaks only when delta supports them | Unclear |
| HEAT | Heatmap shading, either of volume/delta intensity or of resting liquidity | Shows where activity concentrated. A true liquidity heatmap needs historical book data | Unclear |
| BAND | A band or zone drawn around price, possibly a delta or imbalance band | Context filter around current price | Unclear |
| DELTA | Buy volume minus sell volume per candle | Positive delta means buyers were more aggressive. Divergence from price warns of weakness | Standard |
| WHALE | Markers for unusually large trades | Spots institutional-size prints. The size threshold matters | Standard |
| SIZE-Δ | Delta split by trade size (small vs large participants) | Shows whether large or retail traders drove the move | Likely |
| VPT / VOL-TICK | Volume per tick, i.e. volume at each price level | Underlies profiles and footprints. Highlights heavily traded prices | Likely |
| DOM-LIQ | Resting limit-order liquidity from the depth of market (book data) | Identifies walls that may stall price | Standard |
| DOM-PROF | Order book depth aggregated into a profile by price (book data) | Compares bid-side and ask-side depth at a glance | Likely |
| MMS / MMS SCORE | A composite score, possibly market microstructure or market-maker sentiment | A single-number summary of order-flow conditions. The weighting is not disclosed | Unclear |
| NEWS | Economic or crypto news events on the chart | Avoid or study high-volatility event windows | Standard |
| LIQ-POOL | Liquidity pools: clusters of resting stops above equal highs or below equal lows | Price is often drawn toward these levels before reversing | Standard |
| SWEPT / SWEPT ZONES | Liquidity pools that price has already run through | After a sweep and reversal, a classic SMC entry trigger | Standard |
| ICEBERG | Hidden large orders that refill repeatedly at one price | Signals a large passive participant defending a level. Detection from public data is only an estimate | Standard |
| PACE | Speed of the tape (trades per second) | Acceleration shows urgency, a slowdown shows fading interest | Standard |
| WICK-Δ | Delta inside candle wicks | Shows whether a wick was real rejection or thin trade | Likely |
| REKT | Liquidation events (forced position closures) | Large liquidation spikes often mark short-term exhaustion. Needs a futures liquidation feed | Likely |
| FVG | Fair Value Gap on the order-flow list (three-candle price gap, see 3.4) | Imbalance zones price tends to revisit | Standard |
| VWBA | Volume-weighted bid/ask, probably the average bid and ask weighted by size | Shows which side of the book is heavier | Unclear |
| GLOW | A visual highlight on notable bars or levels | Makes standout signals easier to see | Unclear |
| FOOT | Footprint chart | Shows buy and sell volume at each price inside each candle | Standard |
| Δ-COLOR | Colours candles by delta | Spots delta divergences at a glance | Likely |
| SPOOF | Detects large orders that appear and are pulled before they trade (book data) | Warns that a visible wall may be fake | Standard |
| BBA DELTA | Probably delta at the best bid and ask | Reads pressure right at the top of the book | Unclear |
| ORSI | Probably an order-flow RSI (RSI applied to delta or CVD) | Overbought/oversold reading of aggression | Unclear |
| OF-MACD | Probably MACD applied to delta or CVD | Momentum of aggression, for crossovers and divergence | Unclear |

## 3.3 Volume / Delta indicators

| Indicator | What it likely shows | How traders use it | Confidence |
| --- | --- | --- | --- |
| VOL-BOX | Boxes summarising volume over a range | Marks high-activity ranges | Unclear |
| VOL / VOLUME | Volume histogram per candle | Confirms moves. Breakouts need volume | Standard |
| CVD / Δ∑CVD | Cumulative volume delta: running total of delta | Rising CVD with rising price confirms a trend. CVD falling while price rises is a bearish divergence | Standard |
| CVD-C / CVD CANDLE | CVD drawn as open/high/low/close candles | Reads delta swings like price structure | Likely |
| G-DELTA / GLOBAL Δ | Delta aggregated across several exchanges or markets | Broader view of who is aggressive, beyond one exchange | Likely |
| MTF FP | Multi-timeframe footprint | Footprint information from a higher timeframe on a lower chart | Likely |
| SHAPE / FP SHAPE | Footprint or profile shape classification (P, b, D shapes) | Recognise profile shapes that suggest short covering, long liquidation or balance | Likely |
| C-VOL | Total volume printed on each candle | Compare candle volumes quickly | Standard |
| C-DELTA | Delta printed on each candle | Compare candle aggression quickly | Standard |
| HV-BUY | High-volume candles or levels dominated by buying | Possible institutional demand zones | Likely |
| HV-SELL | High-volume candles or levels dominated by selling | Possible institutional supply zones | Likely |
| LVN | Low Volume Node: price with little traded volume | Price moves quickly through it. Used as targets and rejection levels | Standard |
| HVN | High Volume Node: price with heavy traded volume | Acceptance zone that acts as a magnet and as support or resistance | Standard |
| TPO-LVN | Low-volume node taken from a TPO profile | Thin-time areas where price traded briefly | Likely |
| VWBA | Volume-weighted bid/ask (see 3.2) | See above | Unclear |
| ABS | Absorption markers | Spot where aggression was absorbed | Standard |
| SIAT | Not explained anywhere on the page | Unknown. The label could abbreviate an aggression or trade-size measure | Unclear |
| SIAT-C | The candle version of SIAT | As above | Unclear |
| ACD | Probably Mark Fisher's ACD method (opening range with A and C breakout points and a pivot range) | Intraday breakout system built on the opening range | Likely |
| STATS | Statistics panel for the chart (volume, delta, buy/sell totals and similar) | Quick numeric summary | Likely |
| CANDLE | Candle styling or colouring options | Display preference | Likely |

## 3.4 Structure indicators

| Indicator | What it likely shows | How traders use it | Confidence |
| --- | --- | --- | --- |
| FVG | Fair Value Gap: a three-candle pattern where the first candle's high and third candle's low do not overlap, leaving an imbalance | Price often returns to fill part of the gap. Used as an entry or target zone | Standard |
| SNR | Support and resistance levels, probably auto-detected | Reference levels for entries, stops and targets | Standard |
| SK / SK SYSTEM | A named trading system whose rules are not described on the page | Unknown. Check the live tool before relying on it | Unclear |
| EW / ELLIOTT WAVE | Elliott Wave counts (impulse and corrective waves) | Wave counting is subjective. Automatic counts often repaint as new bars form | Standard |
| WYC / WYCKOFF MODEL | Wyckoff accumulation and distribution phases | Identify ranges, springs, upthrusts and the markup or markdown that follows | Standard |
| SMC / SMC SYSTEM | Smart Money Concepts: break of structure, change of character, order blocks, FVGs, liquidity | Trade with institutional footprints, entering after liquidity sweeps | Standard |
| CRT / CRT SETUP | Candle Range Theory: a large candle's high or low is swept, price closes back inside, and the opposite side of the range becomes the target | A simple reversal model on higher timeframe candles | Likely |
| PATTERNS | Chart and candlestick patterns | Pattern recognition prompts. Needs context to be useful | Standard |
| AUTO-CH | Automatic channel drawn around price | Trend boundaries for entries and exits | Standard |
| GHOST / GHOST BOOK | Remnants of the order book at past times, possibly a replay of vanished liquidity | See where large resting orders used to be | Unclear |
| PIVOT | Pivot points (daily, weekly or monthly) | Classic intraday support and resistance | Standard |
| SESS / SESSIONS | Trading sessions (Asia, London, New York) shaded on the chart | Track session ranges, highs and lows and when volatility rises | Standard |

## 3.5 Levels / Open Interest indicators

| Indicator | What it likely shows | How traders use it | Confidence |
| --- | --- | --- | --- |
| VWAP | Volume-weighted average price for the session | Fair value. Price above it is bullish, below it bearish | Standard |
| AVWAP | VWAP anchored to a chosen bar | Average cost of buyers or sellers since a key event | Standard |
| D-OPEN | The daily open price | A common bias line: above it buyers are in control | Standard |
| D-TPO | Daily TPO (Market Profile) | Value area, POC and poor highs and lows for the day | Standard |
| D-VOL | Daily volume profile | Value area, POC and nodes for the day | Standard |
| D-FVH | Not explained on the page | Unknown. Could be a daily fair-value or volume-histogram level | Unclear |
| N-POC / NAKED POC | A Point of Control from an earlier session that price has not revisited | Untested levels often act as magnets | Standard |
| KEY-LVL / KEY LEVELS | Important levels such as prior highs, lows and round numbers | Common reaction points | Likely |
| HTF-LVL / HTF LEVELS | Higher-timeframe levels (prior day, week or month high and low) | Larger players watch these. Good for targets and reversals | Standard |
| OI / OI (MAIN) | Open interest: total outstanding futures contracts | Rising OI with price confirms a trend. Falling OI in a rally suggests short covering | Standard |
| OIT / OI PANEL | Probably an OI trend or total panel | OI change shown in a separate window | Unclear |
| OI-WALL | Prices with a large concentration of open interest | Possible liquidation clusters and magnets | Likely |
| HV BUY / HV SELL | High-volume buy and sell levels | Demand and supply zones | Likely |
| LVN LINES / HVN PROFILE | Lines at low-volume nodes and a profile of high-volume nodes | Targets, rejections and acceptance zones | Likely |
| MTF HEAT / MTF ABS / ABS ZONE | Multi-timeframe heat and absorption zones | Show where absorption on higher timeframes matters | Unclear |

## 3.6 Entry Setup indicators

### Smart Money Concepts

| Indicator | What it shows | Confidence |
| --- | --- | --- |
| CHoCH | Change of Character: first break of the opposite swing, an early reversal sign | Standard |
| BREAKER | A failed order block that flips role after price breaks through it | Standard |
| OB | Order Block: the last opposing candle before a strong move, treated as institutional entry | Standard |
| ZONE | Supply or demand zone | Standard |
| LIQ SWEEP | Price takes out a prior high or low and quickly reverses (stop hunt) | Standard |
| FAIR VAL | Fair value gap | Standard |

### Price Action

| Indicator | What it shows | Confidence |
| --- | --- | --- |
| PA SIGNAL | Price-action candle signals such as engulfing bars and pin bars | Likely |
| S.TREND | SuperTrend: an ATR-based trailing line that flips with trend direction | Standard |
| T.CLOUD | Trend cloud, usually two moving averages shaded between them | Likely |
| KELTNER | Keltner Channels: moving average with bands set by ATR | Standard |
| DONCHIAN | Donchian Channels: highest high and lowest low over N bars | Standard |

### Momentum & Divergence

| Indicator | What it shows | Confidence |
| --- | --- | --- |
| DIVERG | Divergence between price and an oscillator | Standard |
| MOMENTUM | Rate of change of price | Standard |
| D.STREAK | Probably a streak of consecutive same-direction delta bars | Unclear |
| CUM DIV | Divergence between price and cumulative delta | Likely |

### Volume Profile

| Indicator | What it shows | Confidence |
| --- | --- | --- |
| VPVR | Volume Profile Visible Range: profile of the candles on screen | Standard |
| RANGE | Profile over a chosen range | Likely |
| POC | Point of Control: the price with the most traded volume | Standard |
| SESS VWAP | Session VWAP (resets each session) | Standard |

### Auto Levels

| Indicator | What it shows | Confidence |
| --- | --- | --- |
| AUTO FIB | Automatically drawn Fibonacci retracement and extension levels | Standard |
| VOL MA | Moving average of volume, to judge whether the current bar's volume is above or below normal | Standard |

### Institutional

| Indicator | What it shows | Confidence |
| --- | --- | --- |
| S/D ZONE | Supply and demand zones | Standard |
| LIQ LVL | Liquidity levels (equal highs, equal lows, prior day high or low) | Standard |
| MKT STRUC | Market structure: swing highs and lows, break of structure | Standard |
| IMB MAP | Map of imbalances (FVGs or footprint imbalances) across the chart | Likely |
| TAPE SPD | Speed of the tape | Standard |

### Advanced Confluence

| Indicator | What it shows | Confidence |
| --- | --- | --- |
| HTF BIAS | Directional bias taken from a higher timeframe | Standard |
| TRENDLINE | Automatically drawn trendlines | Standard |
| VWAP DEV | VWAP standard-deviation bands | Standard |
| HVB | Unclear. Possibly a high-volume bar or high-volume balance level | Unclear |
| PIVOT | Pivot points | Standard |
| CONFLUENCE | A score or marker when several signals align at one price | Likely |

### Wyckoff / VSA

| Indicator | What it shows | Confidence |
| --- | --- | --- |
| SPRING | A brief break below range support that quickly recovers, a Wyckoff accumulation signal | Standard |
| UPTHRUST | A brief break above range resistance that fails, a Wyckoff distribution signal | Standard |
| CAUSE | Wyckoff's cause and effect: the size of the range predicts the size of the move | Standard |
| EFF/RES | Effort versus result (VSA): large volume with little price movement signals absorption or exhaustion | Standard |
| SCHEMATIC | An overlay of the Wyckoff accumulation or distribution diagram on the chart | Likely |

## 3.7 ICT Models

ICT (Inner Circle Trader) concepts are a Smart Money framework built around time windows, liquidity and price delivery. They are popular but rest on discretionary rules that are hard to test objectively.

| Indicator | What it likely shows | Confidence |
| --- | --- | --- |
| OTE | Optimal Trade Entry: the 62% to 79% Fibonacci retracement zone of a swing (70.5% is the midpoint) | Standard |
| PD ARRAY | Premium/discount array: the price delivery levels (order blocks, FVGs, breakers) sorted above or below the 50% equilibrium of a range | Standard |
| MSS | Market Structure Shift: a break of structure with displacement, the ICT version of a reversal confirmation | Standard |
| MMXM | Market Maker Buy and Sell Models: a full cycle of accumulation, manipulation, distribution and reversal | Standard |
| SILVER | Silver Bullet: a trade setup in fixed one-hour New York time windows, using an FVG after a liquidity sweep | Standard |
| JUDAS | Judas Swing: a false move at the open of a session that reverses to the real direction | Standard |
| AMD | Accumulation, Manipulation, Distribution: the three-phase daily or session cycle | Standard |
| NWOG | New Week Opening Gap: the gap between Friday's close and the new week's open | Standard |
| TMC | Not explained on the page. May abbreviate a named model. | Unclear |
| OPTEX | Not explained on the page. Treated as a proprietary or custom model | Unclear |
| PD MATRIX | Probably a grid view of premium and discount levels across timeframes | Unclear |
| POWER3 | ICT's name for the AMD cycle (accumulation, manipulation, distribution) | Standard |
| KILL ZONE | Time windows with the highest volume, such as London open and New York open | Standard |
| FVG CHAIN | Consecutive or stacked fair value gaps showing sustained displacement | Likely |
| HTF OB | A higher-timeframe order block | Standard |

### ICT order flow models

| Indicator | What it likely shows | Confidence |
| --- | --- | --- |
| OF SWEEP | A liquidity sweep confirmed by delta or absorption | Likely |
| OF OB | An order block backed by order-flow evidence such as heavy delta | Likely |
| OF FVG | A fair value gap backed by order-flow evidence | Likely |
| DELTA TRAP | Price breaks out but delta disagrees, trapping late traders | Likely |
| OF FULL ★ | The full model combining the above into one signal (the star suggests a premium or flagship tool) | Likely |

## 3.8 Pro Tools

| Indicator | What it likely shows | How traders use it | Confidence |
| --- | --- | --- | --- |
| ATR CH | ATR channel: bands built from average true range | Volatility-based stops and targets | Standard |
| B.BANDS | Bollinger Bands | Volatility expansion and mean reversion | Standard |
| SQUEEZE | Low-volatility compression, often Bollinger Bands inside Keltner Channels | Anticipates a breakout | Standard |
| HI/LO | Highs and lows of a chosen period | Range edges and breakout levels | Standard |
| RANGE EXT | Extensions of a range as projected targets | Profit targets after a breakout | Likely |
| MTF-ABS | Multi-timeframe absorption | Higher-timeframe absorption carries more weight | Likely |
| ABSORB | Absorption detection | Heavy aggression that fails to move price | Standard |
| AGG FLOW | Aggressive flow: net market-order buying or selling | Shows who is pushing the market | Likely |
| STK IMB | Stacked imbalances | See 3.2 | Standard |
| EXHAUST | Exhaustion: a volume or delta spike with no further price progress | Signals the end of a move | Standard |
| INIT ACT | Initiative activity (from Auction Market Theory): aggressive trading outside value, versus responsive trading back inside it | Judges whether a move has real conviction | Likely |
| HTF CANDLE | Higher-timeframe candle overlaid on a lower-timeframe chart | Keeps higher-timeframe context visible | Likely |
| MTF VWAP | VWAP from a higher timeframe | Higher-timeframe fair value | Likely |
| HTF EMA | Exponential moving average from a higher timeframe | Higher-timeframe trend filter | Likely |
| SESS H/L | Highs and lows of each trading session | Targets and sweep levels | Standard |
| TREND BAR | Candles coloured by trend | Quick trend read | Likely |
| MOM DIV | Momentum divergence | Warns of weakening trends | Standard |
| VOL SPIKE | Volume well above average | Marks climactic bars | Standard |
| CLV | Close Location Value: where the close sits within the candle's range | Shows buying or selling pressure within a bar | Standard |
| RNG BRK | Range breakout | Signals trend start after consolidation | Standard |
| TICK SPD | Tick speed: trades per second | Measures urgency | Likely |
| PUSH | A strong directional push, likely an impulse detector | Flags momentum bursts | Unclear |
| RSI MAP | RSI across multiple timeframes or a heat-map of RSI levels | Overbought and oversold at a glance | Unclear |

## 3.9 Overall assessment

### Strengths

- Very broad coverage: footprint, delta, CVD, liquidity, ICT, SMC, Wyckoff and open interest in a single browser tool.
- The CryptoSense FA Engine adds fundamentals and derivatives data that most order-flow tools lack.
- Replay mode and drawing tools support practice and review.
- Sinhala AI summaries make the analysis accessible to local users.

### Concerns to verify

- **Data source:** the page does not say which exchange feed supplies trades and order-book depth. Footprint, whale, iceberg, spoof and DOM tools are only as good as that feed. Several appear to be estimates.
- **Overlap:** many indicators measure the same thing (for example absorption appears as CG-ABS, ABS, ABSORB, MTF-ABS and ABS ZONE; imbalance appears as IMB, STK and STK IMB). More indicators do not mean more independent evidence.
- **Unexplained tools:** about 15 labels (SIAT, SK, TMC, OPTEX, D-FVH, HVB, ADA tracker and others) have no description, so a trader cannot judge them without testing.
- **No visible track record:** the page shows no backtest, signal statistics or win rates for its AI bot, confluence scores or "OF FULL" model.
- **Naming:** the page title uses the ATAS name. No affiliation with ATAS could be confirmed from the page.
- **Discretionary frameworks:** ICT, Elliott Wave and Wyckoff rely on subjective interpretation, so automatic labels should be checked by eye.
- **Not financial advice:** these tools describe market activity. They do not predict price, and trading crypto and derivatives carries a risk of loss.

### Suggested next step

Open the live tool and test the 15 or so unclear indicators one by one on BTC across two or three timeframes. Hovering over each button or opening its settings should confirm what it does, and the entries above marked Unclear can then be updated.
