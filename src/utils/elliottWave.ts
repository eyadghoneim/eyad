import { Candle, ElliottWaveAnalysis } from '../types';

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

export interface ValidatedSwing {
  index: number;
  type: 'HIGH' | 'LOW';
  price: number;
  time: number;
  volume: number;
}

/**
 * Robust Swing Identification using clean 3-bar left / 3-bar right fractal window
 * and strict ATR-distance threshold between alternating high and low pivots.
 */
export function extractValidatedSwings(candles: Candle[], leftBars = 3, rightBars = 3, atrMultiplier = 0.8): ValidatedSwing[] {
  if (candles.length < leftBars + rightBars + 1) return [];

  const atr = calculateATR(candles, 14);
  const minDistance = atr * atrMultiplier;
  const rawSwings: ValidatedSwing[] = [];

  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const c = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= leftBars; j++) {
      if (candles[i - j].high >= c.high) isHigh = false;
      if (candles[i - j].low <= c.low) isLow = false;
    }
    for (let j = 1; j <= rightBars; j++) {
      if (candles[i + j].high >= c.high) isHigh = false;
      if (candles[i + j].low <= c.low) isLow = false;
    }

    if (isHigh) {
      rawSwings.push({ index: i, type: 'HIGH', price: c.high, time: c.time, volume: c.volume });
    } else if (isLow) {
      rawSwings.push({ index: i, type: 'LOW', price: c.low, time: c.time, volume: c.volume });
    }
  }

  // Strictly alternate HIGH and LOW with minimum ATR price distance
  const alternatingSwings: ValidatedSwing[] = [];

  for (const swing of rawSwings) {
    if (alternatingSwings.length === 0) {
      alternatingSwings.push(swing);
      continue;
    }

    const last = alternatingSwings[alternatingSwings.length - 1];

    if (last.type === swing.type) {
      if (swing.type === 'HIGH' && swing.price > last.price) {
        alternatingSwings[alternatingSwings.length - 1] = swing;
      } else if (swing.type === 'LOW' && swing.price < last.price) {
        alternatingSwings[alternatingSwings.length - 1] = swing;
      }
    } else {
      const priceDistance = Math.abs(swing.price - last.price);
      if (priceDistance >= minDistance) {
        alternatingSwings.push(swing);
      }
    }
  }

  return alternatingSwings;
}

/**
 * Calculates average candle volume between two swing indices (Leg Volume)
 */
function getLegAverageVolume(candles: Candle[], startIdx: number, endIdx: number): number {
  const from = Math.max(0, Math.min(startIdx, endIdx));
  const to = Math.min(candles.length - 1, Math.max(startIdx, endIdx));
  if (to <= from) return candles[from]?.volume || 1;
  const legCandles = candles.slice(from, to + 1);
  return legCandles.reduce((s, c) => s + c.volume, 0) / legCandles.length;
}

/**
 * Elliott Wave Theory Engine:
 * Labels waves strictly from validated swing sequences and mathematical rules.
 */
export function analyzeElliottWave(candles: Candle[]): ElliottWaveAnalysis {
  if (!candles || candles.length < 35) {
    const p = candles?.[candles.length - 1]?.close || 88000;
    return {
      currentWave: 'UNDEFINED',
      waveType: 'TRANSITION',
      estimatedTarget: p * 1.02,
      invalidationPrice: p * 0.96,
      fibLevels: {
        level0_236: p * 0.98,
        level0_382: p * 0.96,
        level0_500: p * 0.95,
        level0_618: p * 0.93,
        level0_786: p * 0.91,
        level1_618: p * 1.06,
      },
      confidence: 20,
      rulesPassed: [],
      rulesViolated: ['Insufficient candle sample (< 35 bars)'],
      impulseVolumeRatio: 1.0,
      validatedSwingsCount: 0,
      explanationAr: 'العينة غير كافية لعدّ موجات إليوت، تم إرجاع حالة غير محددة (UNDEFINED) وثقة 20%.',
      explanationEn: 'Insufficient candle data for Elliott Wave sequence detection. Assigned UNDEFINED with base 20% confidence.',
    };
  }

  const n = candles.length;
  const currentPrice = candles[n - 1].close;
  const swings = extractValidatedSwings(candles, 3, 3, 0.75);

  let currentWave: ElliottWaveAnalysis['currentWave'] = 'UNDEFINED';
  let waveType: 'IMPULSE' | 'CORRECTIVE' | 'TRANSITION' = 'TRANSITION';
  let estimatedTarget = currentPrice * 1.05;
  let invalidationPrice = currentPrice * 0.95;
  let confidence = 25; // Base confidence
  const rulesPassed: string[] = [];
  const rulesViolated: string[] = [];
  let legVolumeRatio = 1.0;

  // Need at least 3 validated swings for any wave structure
  if (swings.length < 3) {
    return {
      currentWave: 'UNDEFINED',
      waveType: 'TRANSITION',
      estimatedTarget: Number(estimatedTarget.toFixed(2)),
      invalidationPrice: Number(invalidationPrice.toFixed(2)),
      fibLevels: {
        level0_236: currentPrice * 0.98,
        level0_382: currentPrice * 0.96,
        level0_500: currentPrice * 0.95,
        level0_618: currentPrice * 0.93,
        level0_786: currentPrice * 0.91,
        level1_618: currentPrice * 1.06,
      },
      confidence: 20,
      rulesPassed: [],
      rulesViolated: ['Insufficient validated swings (< 3 swings)'],
      impulseVolumeRatio: 1.0,
      validatedSwingsCount: swings.length,
      explanationAr: 'لا توجد سوينغات كافية معتمدة عبر ATR لتشكيل تسلسل موجي، الحالة غير محددة.',
      explanationEn: 'Insufficient validated ATR swings to form a wave sequence, status UNDEFINED.',
    };
  }

  // Search for the most recent Bullish Impulse sequence (LOW -> HIGH -> LOW ...)
  const recentSwings = swings.slice(-6);
  const firstLowIdx = recentSwings.findIndex((s) => s.type === 'LOW');

  if (firstLowIdx !== -1 && recentSwings.length - firstLowIdx >= 3) {
    const seq = recentSwings.slice(firstLowIdx); // starts with LOW

    // s0 = Low0 (Origin of Wave 1)
    // s1 = High1 (Peak of Wave 1)
    // s2 = Low2 (Bottom of Wave 2)
    const s0 = seq[0];
    const s1 = seq[1];
    const s2 = seq[2];

    const wave1Len = s1 && s0 ? s1.price - s0.price : 0;

    // RULE 1 Verification: Wave 2 must NOT retrace past the start of Wave 1
    const rule1Passed = s2 && s0 && s2.price > s0.price;
    if (rule1Passed) {
      rulesPassed.push('Rule 1: Wave 2 held strictly above Wave 1 origin');
    } else {
      rulesViolated.push('Rule 1 VIOLATION: Wave 2 breached origin of Wave 1');
    }

    if (seq.length === 3 && rule1Passed) {
      // Structure: Low0 -> High1 -> Low2
      if (currentPrice >= s2.price && currentPrice <= s1.price) {
        currentWave = 'WAVE_2';
        waveType = 'CORRECTIVE';
        invalidationPrice = s0.price;
        // Fibonacci based directly on Wave 1
        estimatedTarget = s2.price + wave1Len * 1.618;
        confidence = 45;
      } else if (currentPrice > s1.price) {
        // Price broke above Wave 1 peak, initiating Wave 3
        currentWave = 'WAVE_3';
        waveType = 'IMPULSE';
        invalidationPrice = s1.price;
        estimatedTarget = s2.price + wave1Len * 1.618;
        confidence = 50;
      }
    } else if (seq.length >= 4 && rule1Passed) {
      // Structure: Low0 -> High1 -> Low2 -> High3
      const s3 = seq[3];
      const wave3Len = s3.price - s2.price;

      // RULE 2 (Preliminary): Wave 3 expansion is robust and not shorter than Wave 1
      const rule2Passed = wave3Len >= wave1Len * 0.95;
      if (rule2Passed) {
        rulesPassed.push('Rule 2 (Preliminary): Wave 3 extension is robust');
      } else {
        rulesViolated.push('Rule 2 VIOLATION: Wave 3 is shorter than Wave 1');
      }

      // Calculate True Leg Volume Ratio: Wave 3 Leg Volume / Wave 2 Leg Volume
      const wave3Vol = getLegAverageVolume(candles, s2.index, s3.index);
      const wave2Vol = getLegAverageVolume(candles, s1.index, s2.index);
      legVolumeRatio = Number((wave3Vol / Math.max(1, wave2Vol)).toFixed(2));

      if (seq.length === 4) {
        if (currentPrice >= s3.price * 0.97 && rule2Passed) {
          currentWave = 'WAVE_3';
          waveType = 'IMPULSE';
          invalidationPrice = s1.price;
          estimatedTarget = s2.price + wave1Len * 1.618;
          confidence = 55;
        } else {
          // Pulling back from Wave 3 peak into developing Wave 4
          currentWave = 'WAVE_4';
          waveType = 'CORRECTIVE';
          invalidationPrice = s1.price; // Wave 4 must not enter Wave 1
          estimatedTarget = s3.price * 1.06;
          confidence = 45;
        }
      } else if (seq.length >= 5) {
        // Structure: Low0 -> High1 -> Low2 -> High3 -> Low4
        const s4 = seq[4];
        
        // RULE 3: Wave 4 does NOT overlap with Wave 1 price territory
        const rule3Passed = s4.price > s1.price;
        if (rule3Passed) {
          rulesPassed.push('Rule 3: Wave 4 bottom strictly above Wave 1 peak');
        } else {
          rulesViolated.push('Rule 3 VIOLATION: Wave 4 overlapped into Wave 1 territory');
        }

        if (seq.length === 5 && rule3Passed && rule2Passed) {
          if (currentPrice > s3.price) {
            // Broke above Wave 3 peak -> Entering Wave 5
            currentWave = 'WAVE_5';
            waveType = 'IMPULSE';
            invalidationPrice = s4.price;
            estimatedTarget = s3.price + wave1Len;
            confidence = 60;
          } else {
            currentWave = 'WAVE_4';
            waveType = 'CORRECTIVE';
            invalidationPrice = s1.price;
            estimatedTarget = s3.price * 1.05;
            confidence = 50;
          }
        } else if (seq.length >= 6 && rule3Passed && rule2Passed) {
          currentWave = 'WAVE_5';
          waveType = 'IMPULSE';
          invalidationPrice = s4.price;
          estimatedTarget = s3.price + wave1Len * 0.8;
          confidence = 58;
        } else {
          // Rules broken, structure collapsed
          currentWave = 'UNDEFINED';
          waveType = 'TRANSITION';
          confidence = 25;
        }
      }
    }
  }

  // If not in a bullish impulse, check for clean ABC corrective structure (High0 -> Low1 -> High2 -> Low3)
  if (currentWave === 'UNDEFINED') {
    const firstHighIdx = recentSwings.findIndex((s) => s.type === 'HIGH');
    if (firstHighIdx !== -1 && recentSwings.length - firstHighIdx >= 3) {
      const cSeq = recentSwings.slice(firstHighIdx);
      const h0 = cSeq[0];
      const l1 = cSeq[1];
      const h2 = cSeq[2];

      if (h2.price < h0.price && currentPrice < l1.price) {
        currentWave = 'WAVE_C';
        waveType = 'CORRECTIVE';
        invalidationPrice = h2.price;
        estimatedTarget = l1.price - (h0.price - l1.price) * 0.618;
        confidence = 45;
        rulesPassed.push('Corrective ABC sequence verified (Lower Highs + Lower Lows)');
      } else if (h2.price < h0.price && currentPrice >= l1.price) {
        currentWave = 'WAVE_B';
        waveType = 'CORRECTIVE';
        invalidationPrice = h0.price;
        estimatedTarget = l1.price;
        confidence = 35;
        rulesPassed.push('Corrective Wave B counter-trend bounce');
      }
    }
  }

  // Apply Leg Volume Adjustment
  if (legVolumeRatio >= 1.2) {
    confidence += 8;
    rulesPassed.push(`Leg Volume Expansion confirmed (Wave 3/2 Vol = ${legVolumeRatio}x)`);
  } else if (legVolumeRatio < 0.9 && (currentWave === 'WAVE_3' || currentWave === 'WAVE_5')) {
    confidence -= 8;
    rulesViolated.push(`Weak Impulse Volume (Wave 3/2 Vol = ${legVolumeRatio}x < 0.9)`);
  }

  // Deduct heavily for rule violations
  if (rulesViolated.length > 0) {
    confidence -= rulesViolated.length * 10;
    if (currentWave === 'WAVE_3' || currentWave === 'WAVE_5') {
      currentWave = 'UNDEFINED';
    }
  }

  // Bounded strictly between 20% and 70%
  confidence = Math.min(70, Math.max(20, Math.round(confidence)));

  // Fibonacci Grid drawn from active anchor origin to peak
  const anchorOrigin = swings[0]?.price || currentPrice * 0.95;
  const anchorPeak = swings[swings.length - 1]?.price || currentPrice * 1.05;
  const fDiff = Math.max(1, Math.abs(anchorPeak - anchorOrigin));
  const fBase = Math.min(anchorOrigin, anchorPeak);
  const fTop = Math.max(anchorOrigin, anchorPeak);

  const fibLevels = {
    level0_236: Number((fTop - fDiff * 0.236).toFixed(2)),
    level0_382: Number((fTop - fDiff * 0.382).toFixed(2)),
    level0_500: Number((fTop - fDiff * 0.5).toFixed(2)),
    level0_618: Number((fTop - fDiff * 0.618).toFixed(2)),
    level0_786: Number((fTop - fDiff * 0.786).toFixed(2)),
    level1_618: Number((fTop + fDiff * 0.618).toFixed(2)),
  };

  const coreRulesCount = (rulesPassed.some((r) => r.includes('Rule 1')) ? 1 : 0) +
                         (rulesPassed.some((r) => r.includes('Rule 2')) ? 1 : 0) +
                         (rulesPassed.some((r) => r.includes('Rule 3')) ? 1 : 0);

  const explanationAr = currentWave === 'UNDEFINED'
    ? `لا يتطابق السعر حالياً مع تسلسل موجي مكتمل أو وُجد كسر بالقواعد الأساسية (${rulesViolated.length} انتهاك). الحالة: غير محددة (UNDEFINED) بثقة ${confidence}%.`
    : `العدّ الموجي الهيكلي: (${currentWave}) استوفى ${coreRulesCount}/3 من قواعد إليوت الأساسية، نسبة حجم تداول الأرجل ${legVolumeRatio}x، والثقة المحسوبة ${confidence}%.`;

  const explanationEn = currentWave === 'UNDEFINED'
    ? `No compliant Elliott sequence found or core rules violated (${rulesViolated.length} violations). Status: UNDEFINED (Confidence: ${confidence}%).`
    : `Structural Elliott Count: (${currentWave}) satisfied ${coreRulesCount}/3 core rules, leg volume ratio ${legVolumeRatio}x, confidence ${confidence}%.`;

  return {
    currentWave,
    waveType,
    estimatedTarget: Number(estimatedTarget.toFixed(2)),
    invalidationPrice: Number(invalidationPrice.toFixed(2)),
    fibLevels,
    confidence,
    rulesPassed,
    rulesViolated,
    impulseVolumeRatio: legVolumeRatio,
    validatedSwingsCount: swings.length,
    explanationAr,
    explanationEn,
  };
}

export const analyzeElliottWaves = analyzeElliottWave;
