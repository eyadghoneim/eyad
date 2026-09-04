import { Candle, SMCAnalysis, SMCZone } from '../types';
import { extractValidatedSwings } from './elliottWave';

/**
 * Calculates 14-period Average True Range (ATR)
 */
function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < 2) return candles[0]?.close * 0.015 || 500;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  const slice = trs.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

/**
 * Smart Money Concepts (SMC) Engine:
 * - ATR-filtered True Swing Highs/Lows for BOS / CHoCH
 * - Displacement-confirmed Order Blocks with Mitigation tracking
 * - Volume Delta Proxy (Candle Directional Volume Imbalance)
 */
export function analyzeSMC(candles: Candle[]): SMCAnalysis {
  if (!candles || candles.length < 25) {
    return {
      zones: [],
      marketStructure: 'RANGING',
      liquiditySwept: { highSwept: false, lowSwept: false },
      premiumDiscountZone: 'EQUILIBRIUM',
      volumeDeltaProxy: 0,
      summaryAr: 'بيانات غير كافية لتحليل المفاهيم المؤسسية (SMC)',
      summaryEn: 'Insufficient candle data for Smart Money Concepts analysis',
    };
  }

  const n = candles.length;
  const currentPrice = candles[n - 1].close;
  const atr = calculateATR(candles, 14);
  const avgVolume = candles.reduce((s, c) => s + c.volume, 0) / candles.length;

  const zones: SMCZone[] = [];

  // 1. Detect Fair Value Gaps (FVG) - 3-candle imbalance pattern
  for (let i = Math.max(2, n - 30); i < n - 1; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG: Low of c3 is strictly higher than High of c1 with an expanding body in c2
    if (c3.low > c1.high && c2.close > c2.open && (c2.close - c2.open) >= atr * 0.6) {
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
        strength: (topPrice - bottomPrice) >= atr * 0.8 && !isMitigated ? 'HIGH' : 'MEDIUM',
        descriptionAr: `فجوة قيمة عادلة شرائية (Bullish FVG) بين $${bottomPrice.toFixed(0)} و $${topPrice.toFixed(0)}`,
        descriptionEn: `Bullish Fair Value Gap between $${bottomPrice.toFixed(0)} and $${topPrice.toFixed(0)}`,
      });
    }

    // Bearish FVG: High of c3 is strictly lower than Low of c1
    if (c3.high < c1.low && c2.close < c2.open && (c2.open - c2.close) >= atr * 0.6) {
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
        strength: (topPrice - bottomPrice) >= atr * 0.8 && !isMitigated ? 'HIGH' : 'MEDIUM',
        descriptionAr: `فجوة قيمة عادلة بيعية (Bearish FVG) بين $${bottomPrice.toFixed(0)} و $${topPrice.toFixed(0)}`,
        descriptionEn: `Bearish Fair Value Gap between $${bottomPrice.toFixed(0)} and $${topPrice.toFixed(0)}`,
      });
    }
  }

  // 2. Detect Institutional Order Blocks (OB) with Displacement Filter
  for (let i = Math.max(5, n - 40); i < n - 3; i++) {
    const c = candles[i];
    const nextCandles = candles.slice(i + 1, i + 4);

    // Bullish OB: Last down candle before strong multi-candle displacement up move
    if (c.close < c.open) {
      const upDisplacement = nextCandles[nextCandles.length - 1].high - c.low;
      const displacementVolume = nextCandles.reduce((s, nc) => s + nc.volume, 0) / nextCandles.length;

      // Displacement requires move >= 1.2 * ATR and above-average volume
      if (upDisplacement >= atr * 1.2 && displacementVolume >= avgVolume * 0.9) {
        // Mitigation check: Did any subsequent candle pierce through the OB bottom or 50% midpoint?
        const subsequentCandles = candles.slice(i + 4);
        const obMidpoint = (c.open + c.low) / 2;
        const isMitigated = subsequentCandles.some((nc) => nc.low <= obMidpoint);

        zones.push({
          id: `ob_bull_${i}`,
          type: 'BULLISH_OB',
          topPrice: Number(c.open.toFixed(2)),
          bottomPrice: Number(c.low.toFixed(2)),
          timestamp: c.time,
          isMitigated,
          strength: isMitigated ? 'LOW' : 'HIGH',
          descriptionAr: `بلوك طلب مؤسسي (Bullish OB) عند $${c.low.toFixed(0)} - $${c.open.toFixed(0)} ${isMitigated ? '(تم اختباره)' : '(غير ملموس)'}`,
          descriptionEn: `Institutional Demand Order Block at $${c.low.toFixed(0)} - $${c.open.toFixed(0)} ${isMitigated ? '(Mitigated)' : '(Fresh)'}`,
        });
      }
    }

    // Bearish OB: Last up candle before strong displacement down move
    if (c.close > c.open) {
      const downDisplacement = c.high - nextCandles[nextCandles.length - 1].low;
      const displacementVolume = nextCandles.reduce((s, nc) => s + nc.volume, 0) / nextCandles.length;

      if (downDisplacement >= atr * 1.2 && displacementVolume >= avgVolume * 0.9) {
        const subsequentCandles = candles.slice(i + 4);
        const obMidpoint = (c.high + c.open) / 2;
        const isMitigated = subsequentCandles.some((nc) => nc.high >= obMidpoint);

        zones.push({
          id: `ob_bear_${i}`,
          type: 'BEARISH_OB',
          topPrice: Number(c.high.toFixed(2)),
          bottomPrice: Number(c.open.toFixed(2)),
          timestamp: c.time,
          isMitigated,
          strength: isMitigated ? 'LOW' : 'HIGH',
          descriptionAr: `بلوك عرض مؤسسي (Bearish OB) عند $${c.open.toFixed(0)} - $${c.high.toFixed(0)} ${isMitigated ? '(تم اختباره)' : '(غير ملموس)'}`,
          descriptionEn: `Institutional Supply Order Block at $${c.open.toFixed(0)} - $${c.high.toFixed(0)} ${isMitigated ? '(Mitigated)' : '(Fresh)'}`,
        });
      }
    }
  }

  // 3. Market Structure (BOS & CHoCH) using Validated ATR Swings
  const validatedSwings = extractValidatedSwings(candles.slice(-Math.min(100, n)), 3, 3, 0.75);
  const highSwings = validatedSwings.filter((s) => s.type === 'HIGH');
  const lowSwings = validatedSwings.filter((s) => s.type === 'LOW');

  let marketStructure: 'BOS_BULLISH' | 'BOS_BEARISH' | 'CHOCH_BULLISH' | 'CHOCH_BEARISH' | 'RANGING' = 'RANGING';
  let lastBOSPrice: number | undefined;
  let lastCHoCHPrice: number | undefined;

  if (highSwings.length >= 2 && lowSwings.length >= 2) {
    const prevMajorHigh = highSwings[highSwings.length - 1].price;
    const priorMajorHigh = highSwings[highSwings.length - 2].price;
    const prevMajorLow = lowSwings[lowSwings.length - 1].price;
    const priorMajorLow = lowSwings[lowSwings.length - 2].price;

    const isPriorUptrend = priorMajorHigh > highSwings[0].price && priorMajorLow > lowSwings[0].price;

    if (currentPrice > prevMajorHigh) {
      marketStructure = 'BOS_BULLISH';
      lastBOSPrice = prevMajorHigh;
    } else if (currentPrice < prevMajorLow) {
      marketStructure = 'BOS_BEARISH';
      lastBOSPrice = prevMajorLow;
    } else if (isPriorUptrend && currentPrice < priorMajorLow) {
      marketStructure = 'CHOCH_BEARISH';
      lastCHoCHPrice = priorMajorLow;
    } else if (!isPriorUptrend && currentPrice > priorMajorHigh) {
      marketStructure = 'CHOCH_BULLISH';
      lastCHoCHPrice = priorMajorHigh;
    }
  }

  // 4. Liquidity Sweeps
  const lastCandle = candles[n - 1];
  const recentHighs = candles.slice(-20, -1).map((c) => c.high);
  const recentLows = candles.slice(-20, -1).map((c) => c.low);
  const localPeak = Math.max(...recentHighs);
  const localValley = Math.min(...recentLows);

  const lowSwept = lastCandle.low < localValley && lastCandle.close > localValley;
  const highSwept = lastCandle.high > localPeak && lastCandle.close < localPeak;

  // 5. Volume Delta Proxy: candle direction * volume fraction
  let rawDelta = 0;
  const deltaWindow = candles.slice(-20);
  for (const c of deltaWindow) {
    const candleRange = c.high - c.low || 1;
    const bodyDirection = (c.close - c.open) / candleRange; // -1 to +1
    rawDelta += bodyDirection * c.volume;
  }
  const totalDeltaVol = deltaWindow.reduce((s, c) => s + c.volume, 0) || 1;
  const volumeDeltaProxy = Number(Math.min(100, Math.max(-100, (rawDelta / totalDeltaVol) * 100)).toFixed(1));

  // 6. Premium vs Discount Zone Calculation
  const highRange = highSwings.length > 0 ? Math.max(...highSwings.map((s) => s.price)) : Math.max(...candles.slice(-30).map((c) => c.high));
  const lowRange = lowSwings.length > 0 ? Math.min(...lowSwings.map((s) => s.price)) : Math.min(...candles.slice(-30).map((c) => c.low));
  const totalRange = Math.max(1, highRange - lowRange);

  let premiumDiscountZone: 'DEEP_DISCOUNT' | 'DISCOUNT' | 'EQUILIBRIUM' | 'PREMIUM' | 'DEEP_PREMIUM' = 'EQUILIBRIUM';
  const posRatio = (currentPrice - lowRange) / totalRange;

  if (posRatio < 0.25) premiumDiscountZone = 'DEEP_DISCOUNT';
  else if (posRatio < 0.45) premiumDiscountZone = 'DISCOUNT';
  else if (posRatio <= 0.55) premiumDiscountZone = 'EQUILIBRIUM';
  else if (posRatio <= 0.75) premiumDiscountZone = 'PREMIUM';
  else premiumDiscountZone = 'DEEP_PREMIUM';

  const unmitigatedOBCount = zones.filter((z) => !z.isMitigated && (z.type === 'BULLISH_OB' || z.type === 'BEARISH_OB')).length;
  const mitigatedOBCount = zones.filter((z) => z.isMitigated && (z.type === 'BULLISH_OB' || z.type === 'BEARISH_OB')).length;

  const summaryAr = `الهيكل المؤسسي: (${marketStructure}) مبني على قمم/قيعان ATR. منطقة السعر: (${premiumDiscountZone}). دلتا الفوليوم التقريبية: ${volumeDeltaProxy > 0 ? '+' : ''}${volumeDeltaProxy}%. كتل طلب/عرض نشطة: ${unmitigatedOBCount}.`;
  const summaryEn = `Market Structure: (${marketStructure}) based on ATR-filtered swings. Pricing: (${premiumDiscountZone}). Volume Delta Proxy: ${volumeDeltaProxy > 0 ? '+' : ''}${volumeDeltaProxy}%. Fresh OBs: ${unmitigatedOBCount}.`;

  return {
    zones: zones.slice(-8),
    marketStructure,
    liquiditySwept: {
      highSwept,
      lowSwept,
      lastSweepPrice: lowSwept ? lastCandle.low : highSwept ? lastCandle.high : undefined,
      lastSweepTime: (lowSwept || highSwept) ? lastCandle.time : undefined,
    },
    premiumDiscountZone,
    volumeDeltaProxy,
    lastBOSPrice,
    lastCHoCHPrice,
    mitigatedOBCount,
    unmitigatedOBCount,
    summaryAr,
    summaryEn,
  };
}
