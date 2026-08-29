import { Candle, SMCAnalysis, SMCZone } from '../types';

export function analyzeSMC(candles: Candle[]): SMCAnalysis {
  if (!candles || candles.length < 20) {
    return {
      zones: [],
      marketStructure: 'RANGING',
      liquiditySwept: { highSwept: false, lowSwept: false },
      premiumDiscountZone: 'EQUILIBRIUM',
      summaryAr: 'بيانات غير كافية لتحليل المفاهيم المؤسسية (SMC)',
      summaryEn: 'Insufficient data for Smart Money Concepts analysis',
    };
  }

  const zones: SMCZone[] = [];
  const n = candles.length;
  const currentPrice = candles[n - 1].close;

  // 1. Detect Fair Value Gaps (FVG) - 3-candle pattern
  for (let i = n - 25; i < n - 1; i++) {
    if (i < 2) continue;
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG: Low of c3 is strictly higher than High of c1
    if (c3.low > c1.high && c2.close > c2.open) {
      const topPrice = c3.low;
      const bottomPrice = c1.high;
      const isMitigated = candles.slice(i + 1).some((c) => c.low <= bottomPrice);

      zones.push({
        id: `fvg_bull_${i}`,
        type: 'BULLISH_FVG',
        topPrice: Number(topPrice.toFixed(2)),
        bottomPrice: Number(bottomPrice.toFixed(2)),
        timestamp: c2.time,
        isMitigated,
        strength: (topPrice - bottomPrice) / currentPrice > 0.008 ? 'HIGH' : 'MEDIUM',
        descriptionAr: `فجوة قيمة عادلة شرائية (Bullish FVG) بين ${bottomPrice.toFixed(0)}$ و ${topPrice.toFixed(0)}$`,
        descriptionEn: `Bullish Fair Value Gap between $${bottomPrice.toFixed(0)} and $${topPrice.toFixed(0)}`,
      });
    }

    // Bearish FVG: High of c3 is strictly lower than Low of c1
    if (c3.high < c1.low && c2.close < c2.open) {
      const topPrice = c1.low;
      const bottomPrice = c3.high;
      const isMitigated = candles.slice(i + 1).some((c) => c.high >= topPrice);

      zones.push({
        id: `fvg_bear_${i}`,
        type: 'BEARISH_FVG',
        topPrice: Number(topPrice.toFixed(2)),
        bottomPrice: Number(bottomPrice.toFixed(2)),
        timestamp: c2.time,
        isMitigated,
        strength: (topPrice - bottomPrice) / currentPrice > 0.008 ? 'HIGH' : 'MEDIUM',
        descriptionAr: `فجوة قيمة عادلة بيعية (Bearish FVG) بين ${bottomPrice.toFixed(0)}$ و ${topPrice.toFixed(0)}$`,
        descriptionEn: `Bearish Fair Value Gap between $${bottomPrice.toFixed(0)} and $${topPrice.toFixed(0)}`,
      });
    }
  }

  // 2. Detect Order Blocks (OB)
  for (let i = n - 35; i < n - 3; i++) {
    if (i < 5) continue;
    const c = candles[i];
    const nextCandles = candles.slice(i + 1, i + 4);

    // Bullish OB: Last down candle before strong multi-candle up move
    if (c.close < c.open) {
      const upMoveMagnitude = nextCandles[nextCandles.length - 1].high - c.low;
      if (upMoveMagnitude / c.close > 0.015 && nextCandles.every((nc) => nc.close > c.open)) {
        const isMitigated = candles.slice(i + 4).some((nc) => nc.low <= c.low);
        zones.push({
          id: `ob_bull_${i}`,
          type: 'BULLISH_OB',
          topPrice: Number(c.open.toFixed(2)),
          bottomPrice: Number(c.low.toFixed(2)),
          timestamp: c.time,
          isMitigated,
          strength: isMitigated ? 'LOW' : 'HIGH',
          descriptionAr: `بلوك طلب مؤسسي (Bullish Order Block) عند ${c.low.toFixed(0)}$ - ${c.open.toFixed(0)}$`,
          descriptionEn: `Institutional Demand Order Block at $${c.low.toFixed(0)} - $${c.open.toFixed(0)}`,
        });
      }
    }

    // Bearish OB: Last up candle before strong multi-candle down move
    if (c.close > c.open) {
      const downMoveMagnitude = c.high - nextCandles[nextCandles.length - 1].low;
      if (downMoveMagnitude / c.close > 0.015 && nextCandles.every((nc) => nc.close < c.open)) {
        const isMitigated = candles.slice(i + 4).some((nc) => nc.high >= c.high);
        zones.push({
          id: `ob_bear_${i}`,
          type: 'BEARISH_OB',
          topPrice: Number(c.high.toFixed(2)),
          bottomPrice: Number(c.open.toFixed(2)),
          timestamp: c.time,
          isMitigated,
          strength: isMitigated ? 'LOW' : 'HIGH',
          descriptionAr: `بلوك عرض مؤسسي (Bearish Order Block) عند ${c.open.toFixed(0)}$ - ${c.high.toFixed(0)}$`,
          descriptionEn: `Institutional Supply Order Block at $${c.open.toFixed(0)} - $${c.high.toFixed(0)}`,
        });
      }
    }
  }

  // 3. Market Structure & Break of Structure (BOS) / Change of Character (CHoCH)
  const recentHighs = candles.slice(-20).map((c) => c.high);
  const recentLows = candles.slice(-20).map((c) => c.low);
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  const rangeMid = (highestHigh + lowestLow) / 2;

  let marketStructure: 'BOS_BULLISH' | 'BOS_BEARISH' | 'CHOCH_BULLISH' | 'CHOCH_BEARISH' | 'RANGING' = 'RANGING';
  
  const last3 = candles.slice(-3);
  const prevPeak = Math.max(...candles.slice(-15, -3).map((c) => c.high));
  const prevValley = Math.min(...candles.slice(-15, -3).map((c) => c.low));

  if (last3[last3.length - 1].close > prevPeak) {
    marketStructure = 'BOS_BULLISH';
  } else if (last3[last3.length - 1].close < prevValley) {
    marketStructure = 'BOS_BEARISH';
  } else if (last3[0].low < prevValley && last3[last3.length - 1].close > last3[0].open) {
    marketStructure = 'CHOCH_BULLISH';
  } else if (last3[0].high > prevPeak && last3[last3.length - 1].close < last3[0].open) {
    marketStructure = 'CHOCH_BEARISH';
  }

  // 4. Liquidity Sweeps
  const lastCandle = candles[n - 1];
  const prev10Low = Math.min(...candles.slice(-12, -2).map((c) => c.low));
  const prev10High = Math.max(...candles.slice(-12, -2).map((c) => c.high));

  const lowSwept = lastCandle.low < prev10Low && lastCandle.close > prev10Low;
  const highSwept = lastCandle.high > prev10High && lastCandle.close < prev10High;

  // 5. Premium / Discount Zone calculation (Smart Money accumulates in Discount, distributes in Premium)
  let premiumDiscountZone: 'DEEP_DISCOUNT' | 'DISCOUNT' | 'EQUILIBRIUM' | 'PREMIUM' | 'DEEP_PREMIUM' = 'EQUILIBRIUM';
  const range = highestHigh - lowestLow;
  if (range > 0) {
    const positionInRange = (currentPrice - lowestLow) / range;
    if (positionInRange < 0.25) premiumDiscountZone = 'DEEP_DISCOUNT';
    else if (positionInRange < 0.45) premiumDiscountZone = 'DISCOUNT';
    else if (positionInRange <= 0.55) premiumDiscountZone = 'EQUILIBRIUM';
    else if (positionInRange <= 0.75) premiumDiscountZone = 'PREMIUM';
    else premiumDiscountZone = 'DEEP_PREMIUM';
  }

  let summaryAr = '';
  let summaryEn = '';

  if (marketStructure.includes('BULLISH') || premiumDiscountZone.includes('DISCOUNT')) {
    summaryAr = `الهيكل المؤسسي إيجابي (${marketStructure})، السعر حالياً في منطقة خصم مؤسسية (${premiumDiscountZone}) مع توفر مناطق طلب OB غير ملموسة.`;
    summaryEn = `Bullish institutional market structure (${marketStructure}), price is resting in ${premiumDiscountZone} with unmitigated demand blocks.`;
  } else {
    summaryAr = `الهيكل المؤسسي حذر (${marketStructure})، السعر في منطقة تسعير مرتفعة (${premiumDiscountZone}) قرب مناطق سيولة بيعية.`;
    summaryEn = `Cautionary institutional structure (${marketStructure}), trading in ${premiumDiscountZone} near supply blocks.`;
  }

  return {
    zones: zones.slice(-8), // keep most relevant recent 8 zones
    marketStructure,
    liquiditySwept: {
      highSwept,
      lowSwept,
      lastSweepPrice: lowSwept ? lastCandle.low : highSwept ? lastCandle.high : undefined,
      lastSweepTime: (lowSwept || highSwept) ? lastCandle.time : undefined,
    },
    premiumDiscountZone,
    summaryAr,
    summaryEn,
  };
}
