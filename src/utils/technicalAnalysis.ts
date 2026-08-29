import { Candle, IndicatorValues } from '../types';

export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Find first valid SMA
  let initialSma = 0;
  for (let i = 0; i < period; i++) {
    initialSma += data[i];
  }
  initialSma /= period;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      ema.push(initialSma);
    } else {
      const prevEma = ema[i - 1];
      const currentEma = (data[i] - prevEma) * multiplier + prevEma;
      ema.push(currentEma);
    }
  }
  return ema;
}

export function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let gains: number[] = [];
  let losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // First values are NaN
  for (let i = 0; i < period; i++) {
    rsi.push(NaN);
  }

  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + firstRs));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  const fastEma = calculateEMA(closes, fastPeriod);
  const slowEma = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEma[i]) || isNaN(slowEma[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEma[i] - slowEma[i]);
    }
  }

  // Calculate signal line as EMA of MACD line (ignoring initial NaNs)
  const validMacdStartIndex = macdLine.findIndex((v) => !isNaN(v));
  const validMacd = macdLine.slice(validMacdStartIndex);
  const signalSlice = calculateEMA(validMacd, signalPeriod);

  const signalLine: number[] = new Array(validMacdStartIndex).fill(NaN).concat(signalSlice);

  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }

  return { macdLine, signalLine, histogram };
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
) {
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const avg = middle[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upper.push(avg + stdDevMultiplier * stdDev);
    lower.push(avg - stdDevMultiplier * stdDev);
  }

  return { upper, middle, lower };
}

export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const highLow = candles[i].high - candles[i].low;
      const highClosePrev = Math.abs(candles[i].high - candles[i - 1].close);
      const lowClosePrev = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(highLow, highClosePrev, lowClosePrev));
    }
  }
  return calculateSMA(tr, period);
}

export function calculateSuperTrend(candles: Candle[], period: number = 10, multiplier: number = 3) {
  const atr = calculateATR(candles, period);
  const supertrend: Array<{ value: number; direction: 'BULLISH' | 'BEARISH' }> = [];

  let prevUpper = 0;
  let prevLower = 0;
  let prevDirection: 'BULLISH' | 'BEARISH' = 'BULLISH';

  for (let i = 0; i < candles.length; i++) {
    if (i < period || isNaN(atr[i])) {
      supertrend.push({ value: candles[i].close, direction: 'BULLISH' });
      continue;
    }

    const hl2 = (candles[i].high + candles[i].low) / 2;
    let basicUpper = hl2 + multiplier * atr[i];
    let basicLower = hl2 - multiplier * atr[i];

    let finalUpper = basicUpper;
    let finalLower = basicLower;

    if (i > 0) {
      finalUpper = basicUpper < prevUpper || candles[i - 1].close > prevUpper ? basicUpper : prevUpper;
      finalLower = basicLower > prevLower || candles[i - 1].close < prevLower ? basicLower : prevLower;
    }

    let direction: 'BULLISH' | 'BEARISH' = prevDirection;
    if (prevDirection === 'BULLISH' && candles[i].close < finalLower) {
      direction = 'BEARISH';
    } else if (prevDirection === 'BEARISH' && candles[i].close > finalUpper) {
      direction = 'BULLISH';
    }

    const value = direction === 'BULLISH' ? finalLower : finalUpper;
    supertrend.push({ value, direction });

    prevUpper = finalUpper;
    prevLower = finalLower;
    prevDirection = direction;
  }

  return supertrend;
}

export function calculateVWAP(candles: Candle[]): number[] {
  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;
  const vwap: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    cumulativeTypicalPriceVolume += typicalPrice * candles[i].volume;
    cumulativeVolume += candles[i].volume;

    vwap.push(cumulativeVolume > 0 ? cumulativeTypicalPriceVolume / cumulativeVolume : typicalPrice);
  }

  return vwap;
}

export function calculateADX(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period * 2) {
    return new Array(candles.length).fill(25);
  }

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      plusDM.push(0);
      minusDM.push(0);
      tr.push(candles[i].high - candles[i].low);
      continue;
    }

    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

    const highLow = candles[i].high - candles[i].low;
    const highClosePrev = Math.abs(candles[i].high - candles[i - 1].close);
    const lowClosePrev = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(highLow, highClosePrev, lowClosePrev));
  }

  const smoothTR = calculateEMA(tr, period);
  const smoothPlusDM = calculateEMA(plusDM, period);
  const smoothMinusDM = calculateEMA(minusDM, period);

  const dx: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const trVal = smoothTR[i] || 1;
    const plusDI = ((smoothPlusDM[i] || 0) / trVal) * 100;
    const minusDI = ((smoothMinusDM[i] || 0) / trVal) * 100;
    const sum = plusDI + minusDI;
    const diff = Math.abs(plusDI - minusDI);
    dx.push(sum > 0 ? (diff / sum) * 100 : 20);
  }

  return calculateEMA(dx, period);
}

export function getCompleteIndicators(candles: Candle[]): IndicatorValues {
  if (!candles || candles.length < 30) {
    const lastClose = candles?.[candles.length - 1]?.close || 88000;
    return {
      rsi: 50,
      rsiSignal: 'NEUTRAL',
      macd: { macd: 0, signal: 0, histogram: 0, trend: 'BULLISH' },
      ema9: lastClose,
      ema21: lastClose,
      ema20: lastClose,
      ema50: lastClose,
      ema200: lastClose,
      emaTrend: 'NEUTRAL',
      bollinger: { upper: lastClose * 1.03, middle: lastClose, lower: lastClose * 0.97, percentB: 0.5 },
      superTrend: { value: lastClose * 0.96, direction: 'BULLISH' },
      atr: lastClose * 0.015,
      adx: 26,
      vwap: lastClose,
      stochRsi: { k: 50, d: 50, status: 'NEUTRAL' },
    };
  }

  const closes = candles.map((c) => c.close);
  const n = closes.length - 1;

  const rsiArr = calculateRSI(closes, 14);
  const currentRsi = Number((rsiArr[n] || 50).toFixed(1));

  const macdData = calculateMACD(closes);
  const currentMacd = Number((macdData.macdLine[n] || 0).toFixed(2));
  const currentSignal = Number((macdData.signalLine[n] || 0).toFixed(2));
  const currentHist = Number((macdData.histogram[n] || 0).toFixed(2));
  const prevHist = Number((macdData.histogram[n - 1] || 0).toFixed(2));

  let macdTrend: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'BULLISH' | 'BEARISH' = 'NEUTRAL' as any;
  if (prevHist < 0 && currentHist > 0) macdTrend = 'BULLISH_CROSS';
  else if (prevHist > 0 && currentHist < 0) macdTrend = 'BEARISH_CROSS';
  else if (currentHist > 0) macdTrend = 'BULLISH';
  else macdTrend = 'BEARISH';

  const ema9Arr = calculateEMA(closes, 9);
  const ema21Arr = calculateEMA(closes, 21);
  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const ema200Arr = calculateEMA(closes, Math.min(200, closes.length - 1));

  const ema9 = Number((ema9Arr[n] || closes[n]).toFixed(2));
  const ema21 = Number((ema21Arr[n] || closes[n]).toFixed(2));
  const ema20 = Number((ema20Arr[n] || closes[n]).toFixed(2));
  const ema50 = Number((ema50Arr[n] || closes[n]).toFixed(2));
  const ema200 = Number((ema200Arr[n] || closes[n]).toFixed(2));

  let emaTrend: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'STRONG_BULLISH' | 'STRONG_BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (ema20 > ema50 && ema50 > ema200) emaTrend = 'STRONG_BULLISH';
  else if (ema20 < ema50 && ema50 < ema200) emaTrend = 'STRONG_BEARISH';
  else if (ema50 > ema200 && (ema50Arr[n - 1] || 0) <= (ema200Arr[n - 1] || 0)) emaTrend = 'GOLDEN_CROSS';
  else if (ema50 < ema200 && (ema50Arr[n - 1] || 0) >= (ema200Arr[n - 1] || 0)) emaTrend = 'DEATH_CROSS';

  const bb = calculateBollingerBands(closes, 20, 2);
  const upper = Number((bb.upper[n] || closes[n] * 1.02).toFixed(2));
  const middle = Number((bb.middle[n] || closes[n]).toFixed(2));
  const lower = Number((bb.lower[n] || closes[n] * 0.98).toFixed(2));
  const percentB = upper !== lower ? Number(((closes[n] - lower) / (upper - lower)).toFixed(2)) : 0.5;

  const st = calculateSuperTrend(candles);
  const currentSt = st[st.length - 1] || { value: closes[n] * 0.97, direction: 'BULLISH' };

  const atrArr = calculateATR(candles);
  const currentAtr = Number((atrArr[n] || closes[n] * 0.015).toFixed(2));

  const adxArr = calculateADX(candles);
  const currentAdx = Number((adxArr[n] || 26).toFixed(1));

  const vwapArr = calculateVWAP(candles);
  const currentVwap = Number((vwapArr[n] || closes[n]).toFixed(2));

  let rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' | 'BULLISH_DIVERGENCE' | 'BEARISH_DIVERGENCE' = 'NEUTRAL';
  if (currentRsi <= 30) rsiSignal = 'OVERSOLD';
  else if (currentRsi >= 70) rsiSignal = 'OVERBOUGHT';

  // Stoch RSI estimate
  const stochK = Math.min(100, Math.max(0, Number(((currentRsi - 25) / 50 * 100).toFixed(1))));
  const stochD = Math.min(100, Math.max(0, Number((stochK * 0.95).toFixed(1))));

  return {
    rsi: currentRsi,
    rsiSignal,
    macd: {
      macd: currentMacd,
      signal: currentSignal,
      histogram: currentHist,
      trend: macdTrend,
    },
    ema9,
    ema21,
    ema20,
    ema50,
    ema200,
    emaTrend,
    bollinger: {
      upper,
      middle,
      lower,
      percentB,
    },
    superTrend: {
      value: Number(currentSt.value.toFixed(2)),
      direction: currentSt.direction,
    },
    atr: currentAtr,
    adx: currentAdx,
    vwap: currentVwap,
    stochRsi: {
      k: stochK,
      d: stochD,
      status: stochK < 20 ? 'OVERSOLD' : stochK > 80 ? 'OVERBOUGHT' : 'NEUTRAL',
    },
  };
}

export const calculateAllIndicators = getCompleteIndicators;
