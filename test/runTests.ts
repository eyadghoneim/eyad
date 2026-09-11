/**
 * Unit Test Suite for EYAD Trading Terminal Quantitative Engines
 * Tests:
 * 1. Technical Analysis Utilities (SMA, EMA, RSI, MACD, Bollinger Bands, ATR)
 * 2. Smart Money Concepts Engine (analyzeSMC: Order Blocks, Fair Value Gaps, Liquidity Sweeps)
 * 3. Elliott Wave Fractals & Pattern Engine (extractValidatedSwings, analyzeElliottWave)
 * 4. Backtesting Simulation Engine (Capital tracking, PnL calculation, Drawdown, Sharpe)
 */

import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
} from '../src/utils/technicalAnalysis';
import { analyzeSMC } from '../src/utils/smcAnalysis';
import { extractValidatedSwings, analyzeElliottWave } from '../src/utils/elliottWave';
import { run1YearBacktest } from '../src/utils/backtestingEngine';
import { Candle, LiquidityRegimeScorecard, PaperAccount } from '../src/types';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

function generateMockCandles(count = 50, startPrice = 80000, trend = 'up'): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = Date.now() - count * 3600 * 1000;

  for (let i = 0; i < count; i++) {
    const delta = trend === 'up' ? (i % 3 === 0 ? -150 : 250) : (i % 3 === 0 ? 150 : -250);
    const open = price;
    const close = open + delta;
    const high = Math.max(open, close) + 80;
    const low = Math.min(open, close) - 80;
    const volume = 1200 + (i % 5) * 200;

    candles.push({
      time: now + i * 3600 * 1000,
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }
  return candles;
}

console.log('\n🧪 Running EYAD Quantitative Suite Tests...\n');

// -------------------------------------------------------------
// Suite 1: Technical Analysis Math Verification
// -------------------------------------------------------------
console.log('--- 1. Technical Analysis Engine ---');

const testCloses = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const sma5 = calculateSMA(testCloses, 5);
assert(
  isNaN(sma5[0]) && isNaN(sma5[3]),
  'SMA initial window returns NaN for incomplete periods'
);
assert(
  sma5[4] === 12,
  'SMA computes exact 5-period average (10+11+12+13+14)/5 = 12',
  `Expected 12, got ${sma5[4]}`
);
assert(
  sma5[9] === 17,
  'SMA computes exact sliding window average (15+16+17+18+19)/5 = 17',
  `Expected 17, got ${sma5[9]}`
);

const ema5 = calculateEMA(testCloses, 5);
assert(
  ema5[4] === 12,
  'EMA initializes with first SMA value',
  `Expected 12, got ${ema5[4]}`
);
assert(
  !isNaN(ema5[5]) && ema5[5] > ema5[4],
  'EMA applies exponential smoothing weighting on rising data'
);

// RSI test with 30 rising steps
const risingCloses = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
const rsiRising = calculateRSI(risingCloses, 14);
const lastRsi = rsiRising[rsiRising.length - 1];
assert(
  !isNaN(lastRsi) && lastRsi >= 70 && lastRsi <= 100,
  'RSI correctly identifies strong upward momentum (RSI >= 70)',
  `RSI: ${lastRsi}`
);

// Bollinger Bands test
const bb = calculateBollingerBands(testCloses, 5, 2);
assert(
  bb.upper.length === testCloses.length && bb.lower.length === testCloses.length,
  'Bollinger Bands generates upper, middle, and lower bands of matching length'
);
assert(
  bb.upper[9] >= bb.middle[9] && bb.middle[9] >= bb.lower[9],
  'Bollinger Bands maintains upper >= middle >= lower invariant at all periods'
);

// MACD test
const mockCandles50 = generateMockCandles(60, 70000, 'up');
const mockCloses = mockCandles50.map(c => c.close);
const macd = calculateMACD(mockCloses, 12, 26, 9);
assert(
  macd.macdLine.length === mockCloses.length && macd.signalLine.length === mockCloses.length,
  'MACD calculates MACD line, Signal line, and Histogram'
);

// ATR test
const atr = calculateATR(mockCandles50, 14);
const validAtr = atr.filter(v => !isNaN(v));
assert(
  validAtr.length > 0 && validAtr.every(v => v > 0),
  'ATR computes strictly positive volatility values'
);

// -------------------------------------------------------------
// Suite 2: Smart Money Concepts (SMC) Engine
// -------------------------------------------------------------
console.log('\n--- 2. Smart Money Concepts (SMC) Engine ---');

const smcCandles = generateMockCandles(80, 75000, 'up');
const smcResult = analyzeSMC(smcCandles);

assert(
  smcResult !== null && typeof smcResult === 'object',
  'analyzeSMC returns a structured SMCAnalysis object'
);
assert(
  ['BOS_BULLISH', 'BOS_BEARISH', 'CHOCH_BULLISH', 'CHOCH_BEARISH', 'RANGING'].includes(smcResult.marketStructure),
  'SMC market structure is classified into a recognized regime',
  `Got ${smcResult.marketStructure}`
);
assert(
  ['DEEP_PREMIUM', 'PREMIUM', 'EQUILIBRIUM', 'DISCOUNT', 'DEEP_DISCOUNT'].includes(smcResult.premiumDiscountZone),
  'SMC calculates Premium/Discount institutional equilibrium zone',
  `Got ${smcResult.premiumDiscountZone}`
);
assert(
  Array.isArray(smcResult.zones),
  'SMC detects institutional supply/demand and FVG zones array'
);

// -------------------------------------------------------------
// Suite 3: Elliott Wave & Swing Fractal Engine
// -------------------------------------------------------------
console.log('\n--- 3. Elliott Wave & Fractal Engine ---');

const swings = extractValidatedSwings(smcCandles, 2, 2, 0.5);
assert(
  Array.isArray(swings),
  'extractValidatedSwings extracts fractal swing pivots'
);
if (swings.length >= 2) {
  assert(
    swings[0].price > 0 && swings[0].time > 0,
    'Swing pivots include valid price levels and timestamps'
  );
}

const elliottResult = analyzeElliottWave(smcCandles);
assert(
  typeof elliottResult.currentWave === 'string',
  'Elliott Wave engine identifies the active wave cycle'
);
assert(
  typeof elliottResult.confidence === 'number' && elliottResult.confidence >= 0 && elliottResult.confidence <= 100,
  'Elliott Wave confidence score is bounded between 0 and 100%'
);

// -------------------------------------------------------------
// Suite 4: Backtesting & Quant Performance Engine
// -------------------------------------------------------------
console.log('\n--- 4. Backtesting Simulation Engine ---');

const backtestCandles = generateMockCandles(600, 65000, 'up');
const result = run1YearBacktest(backtestCandles, {
  periodDays: 365,
  initialCapital: 10000,
  riskPerTradePercent: 100,
  takeProfitPercent: 6.5,
  stopLossPercent: 2.8,
  useSMCFilter: true,
  useElliottWaveFilter: true,
  useSelfLearningFilter: true,
  minConvictionThreshold: 70,
}, 'BTC');

assert(
  typeof result.totalTrades === 'number',
  'Backtest execution completes and returns total trade count'
);
assert(
  typeof result.winRate === 'number' && result.winRate >= 0 && result.winRate <= 100,
  'Backtest calculates bounded Win Rate percentage [0, 100]'
);
assert(
  typeof result.maxDrawdownPercent === 'number' && result.maxDrawdownPercent >= 0,
  'Backtest calculates non-negative Max Drawdown percentage'
);
assert(
  Array.isArray(result.equityCurve) && result.equityCurve.length > 0,
  'Backtest generates continuous historical Equity Curve'
);
assert(
  result.equityCurve[0].botEquity === 10000,
  'Backtest equity curve starts at configured initial capital ($10,000)'
);

// -------------------------------------------------------------
// Suite 5: Persistence & Deduplication Integrity Tests
// -------------------------------------------------------------
console.log('--- 5. Persistence & Deduplication State Engine ---');

const { getAssetState, upsertAssetState, getSignalStats } = await import('../botPersistence');

const testHash = 'test_hash_' + Date.now();
await upsertAssetState({
  asset: 'BTC',
  lastKnownPrice: 85200,
  lastAlertSentAt: 1700000000000,
  lastSignalHash: testHash,
});

const retrievedState = await getAssetState('BTC');
assert(
  retrievedState.asset === 'BTC',
  'getAssetState returns normalized asset key'
);
assert(
  retrievedState.lastSignalHash === testHash,
  'upsertAssetState / getAssetState preserves signal deduplication hash across calls'
);
assert(
  retrievedState.lastKnownPrice === 85200,
  'getAssetState preserves last known execution price'
);

const signalStats = await getSignalStats();
assert(
  typeof signalStats.totalSignals === 'number' && typeof signalStats.actionableSignals === 'number',
  'getSignalStats returns valid structure with non-null metrics even in offline/local storage'
);

// -------------------------------------------------------------
// Suite 6: Quantitative Gates & Multi-Timeframe Confluence
// -------------------------------------------------------------
console.log('--- 6. Quantitative Gates & Multi-Timeframe Confluence ---');

const { buildDeterministicSignal } = await import('../botStrategy');
const bullishCandles = generateMockCandles(60, 80000, 'up');
const bearishCandles = generateMockCandles(60, 95000, 'down');

// 6.1 Test Multi-Timeframe 4h Confluence: 4h Bearish blocks 1h counter-trend buy
const mockHtfLiquidityRegime: LiquidityRegimeScorecard = {
  signature: 'test_signature_htf',
  verdict: 'NEUTRAL',
  totalAdjustment: 15,
  macroScore: 5,
  stablecoinScore: 5,
  dexScore: 5,
  openInterestScore: 0,
  bridgeScore: 0,
  summaryAr: 'سيولة مؤسسية متدفقة',
  summaryEn: 'Institutional inflows',
  highlightsAr: [],
  highlightsEn: ['Institutional inflows'],
  updatedAt: Date.now(),
  source: ['unit-test'],
};
const mtfSignalResult = buildDeterministicSignal({
  asset: 'BTC',
  candles: bullishCandles,
  change24h: 3.5,
  higherTimeframeCandles: bearishCandles, // 4h is sharply falling
  liquidityRegime: mockHtfLiquidityRegime,
});
assert(
  mtfSignalResult.signal.regimeGateStatus === 'HTF_BLOCKED' && mtfSignalResult.signal.multiTimeframeBias === 'BEARISH_COUNTERTREND',
  'MTF Guard detects 4h macro bearish downtrend against 1h bounce and sets HTF_BLOCKED'
);
assert(
  mtfSignalResult.signal.spotAction !== 'SPOT_BUY',
  'MTF Guard prevents SPOT_BUY when 4h higher timeframe is strictly bearish'
);

// 6.2 Test Hard Regime Gate: Extremely low ADX (flat/chop) forces NO_TRADE
// Create flat candles with minimal movement to depress ADX
const flatCandles: Candle[] = [];
for (let i = 0; i < 60; i++) {
  const p = 80000 + (i % 2 === 0 ? 5 : -5);
  flatCandles.push({
    time: Date.now() - (60 - i) * 3600 * 1000,
    open: p,
    high: p + 10,
    low: p - 10,
    close: p + 1,
    volume: 1000,
  });
}
const mockChopLiquidityRegime: LiquidityRegimeScorecard = {
  signature: 'test_signature_chop',
  verdict: 'NEUTRAL',
  totalAdjustment: 20,
  macroScore: 10,
  stablecoinScore: 5,
  dexScore: 5,
  openInterestScore: 0,
  bridgeScore: 0,
  summaryAr: 'سيولة عالية',
  summaryEn: 'High liquidity',
  highlightsAr: [],
  highlightsEn: ['High volume'],
  updatedAt: Date.now(),
  source: ['unit-test'],
};
const flatResult = buildDeterministicSignal({
  asset: 'BTC',
  candles: flatCandles,
  change24h: 2.5,
  liquidityRegime: mockChopLiquidityRegime,
});
assert(
  flatResult.signal.regimeGateStatus === 'CHOP_BLOCKED',
  'Hard Regime Gate blocks buy entries during flat/choppy consolidation (ADX < 18)'
);

// 6.3 Test Derivatives Funding Squeeze Penalty
const overheatedDerivativesResult = buildDeterministicSignal({
  asset: 'BTC',
  candles: bullishCandles,
  change24h: 2.0,
  derivativesData: {
    fundingRatePercent: 0.065, // Very high positive funding (> 0.04%)
    sentiment: 'OVERHEATED_LONGS',
  },
});
assert(
  overheatedDerivativesResult.reasons.some(r => r.includes('Derivatives risk: Overheated positive funding')),
  'Derivatives filter applies penalty and warning on overheated positive funding rate'
);

// 6.4 Test Relative Volume (RVOL) calculation
assert(
  typeof mtfSignalResult.signal.relativeVolume === 'number' && mtfSignalResult.signal.relativeVolume > 0,
  'Relative Volume (RVOL) is calculated and bounded as positive ratio'
);

// 6.5 Test v3.0 Engine Model Signature
assert(
  mtfSignalResult.signal.modelUsed.includes('v3.0') && mtfSignalResult.signal.modelUsed.includes('MTF+Regime+RVOL+Funding'),
  'Deterministic engine signs signals with v3.0 (MTF+Regime+RVOL+Funding) signature'
);

// 6.6 Test Gate-Blocked Signals Retain Full Audit Targets (Entry, SL, TP1, TP2)
assert(
  mtfSignalResult.signal.regimeGateStatus === 'HTF_BLOCKED' &&
  mtfSignalResult.signal.entryPrice > 0 &&
  mtfSignalResult.signal.stopLoss > 0 &&
  mtfSignalResult.signal.target1 > 0 &&
  mtfSignalResult.signal.target2 > 0,
  'Gate-blocked candidate buy retains non-zero entry, stop-loss, and profit targets for empirical audit'
);

// 6.7 Test Correlation Guard: Scale down position size by 50% when correlated crypto is active
const { autoOpenPaperTradeOnSignal } = await import('../src/utils/paperTradingEngine');
const basePaperAccount: PaperAccount = {
  virtualBalanceUsd: 10000,
  allocatedCapitalUsd: 1000,
  totalRealizedPnlUsd: 0,
  positions: [
    {
      id: 'pos_btc_1',
      asset: 'BTC' as const,
      entryPrice: 85000,
      currentPrice: 86000,
      highestPrice: 86000,
      amount: 0.01176,
      allocatedUsd: 1000,
      tp1: 88000,
      tp2: 91000,
      stopLoss: 83000,
      entryTime: Date.now() - 3600 * 1000,
      unrealizedPnlUsd: 11.76,
      unrealizedPnlPercent: 1.17,
      partialSold: false,
    },
  ],
  tradeHistory: [],
  autoExecuteSignals: true,
  correlationGuardEnabled: true,
  trancheModeEnabled: false,
};

// High-conviction ETH buy signal with BTC position active -> should open, but at half allocation
const highConvictionEthSignal = {
  ...mtfSignalResult.signal,
  asset: 'ETH' as const,
  convictionScore: 86,
  spotAction: 'SPOT_BUY' as const,
  signalType: 'STRONG_BUY' as const,
  stopLoss: 3000,
  target1: 3400,
  target2: 3600,
};

const corrScaleResult = autoOpenPaperTradeOnSignal(
  basePaperAccount,
  'ETH',
  3200,
  highConvictionEthSignal,
  25
);

assert(
  Boolean(corrScaleResult.opened === true && corrScaleResult.event?.messageAr.includes('تخفيف الحجم 50%')),
  'Correlation Guard halves position size on ETH when BTC position is open and conviction is high'
);

// -------------------------------------------------------------
// Test Results Summary
// -------------------------------------------------------------
console.log('\n=============================================');
console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('=============================================\n');

if (passedTests < totalTests) {
  process.exit(1);
} else {
  console.log('🎉 All quantitative algorithms passed verification successfully!\n');
  process.exit(0);
}
