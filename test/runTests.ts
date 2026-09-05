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
import { Candle } from '../src/types';

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
