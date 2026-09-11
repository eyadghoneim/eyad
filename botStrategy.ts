import type { AIReasoning, Candle, LiquidityRegimeScorecard, SupportedAsset } from './src/types';
import { analyzeElliottWave } from './src/utils/elliottWave';
import { analyzeSMC } from './src/utils/smcAnalysis';
import { calculateAllIndicators } from './src/utils/technicalAnalysis';

export interface DeterministicSignalContext {
  asset: SupportedAsset;
  candles: Candle[];
  change24h: number;
  liquidityRegime?: LiquidityRegimeScorecard | null;
  higherTimeframeCandles?: Candle[] | null; // 4h candles for macro confluence
  derivativesData?: {
    fundingRatePercent?: number;
    openInterestUsd?: number;
    sentiment?: string;
  } | null;
}

export interface DeterministicSignalResult {
  signal: AIReasoning & { status?: 'READY' | 'DEGRADED' };
  indicators: ReturnType<typeof calculateAllIndicators>;
  smc: ReturnType<typeof analyzeSMC>;
  elliott: ReturnType<typeof analyzeElliottWave>;
  reasons: string[];
  dedupHash: string;
}

const assetNameMap: Record<SupportedAsset, { ar: string; en: string }> = {
  BTC: { ar: 'البيتكوين', en: 'Bitcoin' },
  ETH: { ar: 'الإيثريوم', en: 'Ethereum' },
  PAXG: { ar: 'باكس جولد - الذهب الرقمي', en: 'Pax Gold' },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function buildDeterministicSignal({
  asset,
  candles,
  change24h,
  liquidityRegime,
  higherTimeframeCandles,
  derivativesData,
}: DeterministicSignalContext): DeterministicSignalResult {
  const indicators = calculateAllIndicators(candles);
  const smc = analyzeSMC(candles);
  const elliott = analyzeElliottWave(candles);
  const price = candles[candles.length - 1]?.close || 0;
  const atr = indicators.atr || Math.max(price * 0.015, 1);

  let score = 50;
  const reasons: string[] = [];

  // 1. Primary Trend & Momentum (1h)
  if (indicators.emaTrend === 'STRONG_BULLISH' || indicators.emaTrend === 'GOLDEN_CROSS') {
    score += 14;
    reasons.push('Bullish EMA alignment (1h)');
  } else if (indicators.emaTrend === 'STRONG_BEARISH' || indicators.emaTrend === 'DEATH_CROSS') {
    score -= 14;
    reasons.push('Bearish EMA structure (1h)');
  }

  if (indicators.macd.trend === 'BULLISH_CROSS' || indicators.macd.trend === 'BULLISH') {
    score += 12;
    reasons.push('Positive MACD momentum');
  } else {
    score -= 12;
    reasons.push('Negative MACD momentum');
  }

  if (indicators.rsi <= 34) {
    score += 8;
    reasons.push('RSI near oversold rebound zone');
  } else if (indicators.rsi >= 70) {
    score -= 10;
    reasons.push('RSI overbought');
  }

  // 2. Regime Gate: Directional Strength vs. Chop (ADX)
  const isChopRegime = indicators.adx < 18;
  if (indicators.adx >= 25) {
    score += 6;
    reasons.push(`ADX confirms strong directional trend (${indicators.adx.toFixed(1)})`);
  } else if (isChopRegime) {
    score -= 12;
    reasons.push(`ADX identifies choppy consolidation range (${indicators.adx.toFixed(1)} < 18)`);
  }

  // 3. Smart Money Concepts (SMC)
  if (smc.marketStructure === 'BOS_BULLISH' || smc.marketStructure === 'CHOCH_BULLISH') {
    score += 10;
    reasons.push('Bullish market structure (SMC BOS/CHOCH)');
  } else if (smc.marketStructure === 'BOS_BEARISH' || smc.marketStructure === 'CHOCH_BEARISH') {
    score -= 14;
    reasons.push('Bearish market structure (SMC BOS/CHOCH)');
  }

  if (smc.premiumDiscountZone === 'DEEP_DISCOUNT' || smc.premiumDiscountZone === 'DISCOUNT') {
    score += 10;
    reasons.push('Price positioned in discount zone');
  } else if (smc.premiumDiscountZone === 'PREMIUM' || smc.premiumDiscountZone === 'DEEP_PREMIUM') {
    score -= 10;
    reasons.push('Price positioned in premium zone');
  }

  if (smc.liquiditySwept.lowSwept) {
    score += 6;
    reasons.push('Recent downside liquidity sweep recovered');
  }
  if (smc.liquiditySwept.highSwept) {
    score -= 6;
    reasons.push('Recent upside liquidity sweep failed');
  }

  // 4. Elliott Wave Context
  if (elliott.currentWave === 'WAVE_3' || elliott.currentWave === 'WAVE_4') {
    score += 8;
    reasons.push('Constructive Elliott wave context (Wave 3/4)');
  } else if (elliott.currentWave === 'WAVE_C') {
    score -= 10;
    reasons.push('Corrective Elliott wave context (Wave C)');
  }

  // 5. 24h Price Momentum
  if (change24h >= 2.5) {
    score += 4;
    reasons.push('24h momentum positive');
  } else if (change24h <= -2.5) {
    score -= 4;
    reasons.push('24h momentum negative');
  }

  // 6. Relative Volume (RVOL) Confirmation (20-period baseline)
  let rvol = 1;
  let isLowVolumeFakeout = false;
  if (candles.length >= 21) {
    const recentCandles = candles.slice(-21, -1);
    const avgVolume = recentCandles.reduce((s, c) => s + (c.volume || 0), 0) / (recentCandles.length || 1);
    const currentVolume = candles[candles.length - 1]?.volume || 0;
    rvol = avgVolume > 0 ? Number((currentVolume / avgVolume).toFixed(2)) : 1;

    if (rvol >= 1.3) {
      score += 6;
      reasons.push(`High relative volume confirmation (RVOL: ${rvol}x avg)`);
    } else if (rvol <= 0.6) {
      score -= 8;
      reasons.push(`Low relative volume exhaustion warning (RVOL: ${rvol}x avg)`);
      if (rvol < 0.45) {
        isLowVolumeFakeout = true;
      }
    }
  }

  // 7. Multi-Timeframe 4h Confluence (Higher Timeframe Macro Confluence)
  let multiTimeframeBias: 'BULLISH_CONFLUENCE' | 'BEARISH_COUNTERTREND' | 'NEUTRAL' = 'NEUTRAL';
  let isHtfBearishCountertrend = false;

  if (higherTimeframeCandles && higherTimeframeCandles.length >= 20) {
    const htfIndicators = calculateAllIndicators(higherTimeframeCandles);
    const htfPrice = higherTimeframeCandles[higherTimeframeCandles.length - 1]?.close || 0;

    const isHtfBearish =
      htfIndicators.emaTrend === 'STRONG_BEARISH' ||
      htfIndicators.emaTrend === 'DEATH_CROSS' ||
      (htfPrice > 0 && htfIndicators.ema200 > 0 && htfPrice < htfIndicators.ema200 && htfIndicators.macd.trend === 'BEARISH');

    const isHtfBullish =
      htfIndicators.emaTrend === 'STRONG_BULLISH' ||
      htfIndicators.emaTrend === 'GOLDEN_CROSS' ||
      (htfPrice > 0 && htfIndicators.ema50 > 0 && htfPrice > htfIndicators.ema50 && htfIndicators.macd.trend !== 'BEARISH_CROSS');

    if (isHtfBearish) {
      multiTimeframeBias = 'BEARISH_COUNTERTREND';
      isHtfBearishCountertrend = true;
      score -= 18;
      reasons.push('Counter-trend alert: 4h higher timeframe is firmly bearish (Price < 4h EMA200 / Bearish structure)');
    } else if (isHtfBullish) {
      multiTimeframeBias = 'BULLISH_CONFLUENCE';
      score += 8;
      reasons.push('Multi-timeframe confluence: 4h higher timeframe is strongly aligned bullish');
    }
  }

  // 8. Derivatives Sentiment & Funding Squeeze Filter
  if (derivativesData) {
    const funding = derivativesData.fundingRatePercent ?? 0;
    if (funding >= 0.04) {
      score -= 12;
      reasons.push(`Derivatives risk: Overheated positive funding (+${funding.toFixed(3)}% / 8h) warns of long liquidation cascade`);
    } else if (funding <= -0.02) {
      score += 6;
      reasons.push(`Derivatives tailwind: Negative funding (${funding.toFixed(3)}% / 8h) fuels potential short squeeze`);
    }
  }

  // 9. Liquidity Regime Overlay (DefiLlama bridge/stablecoin/macro)
  if (liquidityRegime) {
    score += liquidityRegime.totalAdjustment;
    reasons.push(`Liquidity regime overlay ${liquidityRegime.totalAdjustment >= 0 ? '+' : ''}${liquidityRegime.totalAdjustment}: ${liquidityRegime.summaryEn}`);
    liquidityRegime.highlightsEn.slice(0, 2).forEach((highlight) => reasons.push(`Liquidity: ${highlight}`));
  }

  score = clamp(Math.round(score), 0, 100);

  let signalType: AIReasoning['signalType'] | 'NO_TRADE' = 'HOLD';
  let spotAction: AIReasoning['spotAction'] = 'SPOT_HOLD';
  let summaryAr = '';
  let summaryEn = '';
  let regimeGateStatus: 'CLEAR' | 'CHOP_BLOCKED' | 'SQUEEZE_BLOCKED' | 'HTF_BLOCKED' | 'RVOL_BLOCKED' = 'CLEAR';

  const hardBearish = indicators.emaTrend === 'STRONG_BEARISH' && (smc.marketStructure === 'BOS_BEARISH' || indicators.macd.trend === 'BEARISH_CROSS');
  const hardBullish = score >= 82 && indicators.adx >= 20 && indicators.macd.trend !== 'BEARISH_CROSS' && !isHtfBearishCountertrend && !isChopRegime;

  if (hardBearish || score <= 32) {
    signalType = score <= 20 ? 'STRONG_SELL' : 'SELL';
    spotAction = 'SPOT_SELL_ALL';
    summaryAr = `إشارة دفاعية على ${assetNameMap[asset].ar}: تراجع التوافق الفني والمؤسسي، لذلك الأفضل حماية رأس المال والخروج الكامل من مراكز السبوت.`;
    summaryEn = `Defensive ${assetNameMap[asset].en} signal: technical and institutional confluence deteriorated, so spot capital should rotate to cash.`;
  } else if (isChopRegime && (score >= 56 || score + 14 >= 70)) {
    // HARD REGIME GATE:
    // Even if other indicators are optimistic, buying in chop is the #1 killer due to spread and commission churn!
    signalType = 'NO_TRADE';
    spotAction = 'SPOT_HOLD';
    regimeGateStatus = 'CHOP_BLOCKED';
    summaryAr = `حظر الدخول بفعل السوق العرضي (Regime Gate) على ${assetNameMap[asset].ar}: بالرغم من توفر بعض المؤشرات الإيجابية، إلا أن مؤشر قوة الاتجاه ضعيف جداً (ADX: ${indicators.adx.toFixed(1)} < 18). التداول في سوق مسطح يبتلع رأس المال بالعمولات والذبذبات الوهمية، لذا تم إلغاء الشراء كإجراء احترازي.`;
    summaryEn = `Hard Regime Gate Triggered on ${assetNameMap[asset].en}: ADX indicates severe sideways chop (${indicators.adx.toFixed(1)} < 18). Trading in range consolidations leads to commission churn and false breakouts. Buy signal halted.`;
  } else if (isHtfBearishCountertrend && (score >= 58 || score + 12 >= 70)) {
    // MULTI-TIMEFRAME HIGHER TIMEFRAME GATE:
    // 1h bouncing while 4h is in a hard bear trend is a classic liquidity sucker
    signalType = 'NO_TRADE';
    spotAction = 'SPOT_HOLD';
    regimeGateStatus = 'HTF_BLOCKED';
    summaryAr = `حظر الشراء المعاكس للاتجاه الأكبر (Multi-Timeframe 4h Guard) على ${assetNameMap[asset].ar}: إطار الـ 4 ساعات في اتجاه هابط صريح أسفل المتوسطات الرئيسية. أي صعود على فريم الساعة يُعد ارتداداً تصحيحياً عالي المخاطر تم الامتناع عن ملاحقته.`;
    summaryEn = `Multi-Timeframe 4h Guard on ${assetNameMap[asset].en}: 4h higher timeframe is strictly bearish below macro EMAs. Short-term 1h bounces against the dominant 4h trend are high-risk bull traps. Entry prevented.`;
  } else if (isLowVolumeFakeout && (score >= 62 || score + 8 >= 70)) {
    // LOW VOLUME RVOL GATE:
    signalType = 'NO_TRADE';
    spotAction = 'SPOT_HOLD';
    regimeGateStatus = 'RVOL_BLOCKED';
    summaryAr = `حظر الكسر ضعيف الفوليوم (RVOL Guard) على ${assetNameMap[asset].ar}: حجم التداول الحالي ضعيف جداً (${rvol}x من المتوسط)، مما يدل على غياب السيولة المؤسسية وخطر الفخاخ السعرية.`;
    summaryEn = `Low-Volume Fakeout Guard on ${assetNameMap[asset].en}: Current volume is heavily depleted (${rvol}x of 20-period average). Lack of institutional volume indicates high risk of a bull trap.`;
  } else if (hardBullish || score >= 70) {
    signalType = score >= 82 ? 'STRONG_BUY' : 'BUY';
    spotAction = 'SPOT_BUY';
    summaryAr = `إشارة شراء على ${assetNameMap[asset].ar}: توافق قوي بين الاتجاه والزخم وتأكيد الحجم وهيكل الفريمات المتعددة، مع أفضلية مدروسة للدخول في السبوت.`;
    summaryEn = `Accumulation setup on ${assetNameMap[asset].en}: trend, momentum, volume, and multi-timeframe structure are aligned for a disciplined spot-only entry.`;
  } else if (score < 45) {
    signalType = 'NO_TRADE';
    spotAction = 'SPOT_HOLD';
    summaryAr = `لا توجد أفضلية واضحة على ${assetNameMap[asset].ar}: السوق غير نظيف بما يكفي لفتح صفقة جديدة.`;
    summaryEn = `No clean edge on ${assetNameMap[asset].en}: conditions are not reliable enough for a fresh spot position.`;
  } else {
    signalType = 'HOLD';
    spotAction = 'SPOT_HOLD';
    summaryAr = `حالة انتظار على ${assetNameMap[asset].ar}: بعض العوامل إيجابي لكن التوافق غير مكتمل بعد.`;
    summaryEn = `Hold/Wait state on ${assetNameMap[asset].en}: some factors are constructive, but confluence is not complete yet.`;
  }

  if (liquidityRegime) {
    summaryAr += ` ${liquidityRegime.summaryAr}`;
    summaryEn += ` ${liquidityRegime.summaryEn}`;
  }

  const entryPrice = Number(price.toFixed(2));
  const isCandidateOrActiveBuy = spotAction === 'SPOT_BUY' || regimeGateStatus !== 'CLEAR';
  const stopLoss = isCandidateOrActiveBuy
    ? Number(Math.max(price - atr * 2, price * 0.92).toFixed(2))
    : spotAction === 'SPOT_SELL_ALL'
      ? Number((price * 1.02).toFixed(2))
      : 0;
  const target1 = isCandidateOrActiveBuy ? Number((price + atr * 2.5).toFixed(2)) : 0;
  const target2 = isCandidateOrActiveBuy ? Number((price + atr * 4).toFixed(2)) : 0;
  const target3 = isCandidateOrActiveBuy ? Number((price + atr * 5.5).toFixed(2)) : 0;
  const riskRewardRatio = isCandidateOrActiveBuy && stopLoss > 0
    ? Number((((target2 - price) / Math.max(price - stopLoss, 1)) || 0).toFixed(2))
    : 0;

  const entryQualityStage: 'ideal' | 'good' | 'wait' | 'skip' = score >= 82 ? 'ideal' : score >= 70 ? 'good' : score >= 45 ? 'wait' : 'skip';

  const signal: AIReasoning & { status?: 'READY' | 'DEGRADED' } = {
    convictionScore: score,
    signalType,
    spotAction,
    entryPrice,
    target1,
    target2,
    target3,
    stopLoss,
    riskRewardRatio,
    summaryAr,
    summaryEn,
    confluenceFactors: reasons,
    riskWarningAr: liquidityRegime?.verdict === 'RISK_OFF'
      ? 'السيولة الكلية ضعيفة نسبياً: إن تم الدخول فيكون بحجم أصغر مع تشديد وقف الخسارة. سبوت فقط.'
      : 'سبوت فقط — لا فتح لصفقات برافعة، والالتزام بوقف الخسارة إلزامي.',
    riskWarningEn: liquidityRegime?.verdict === 'RISK_OFF'
      ? 'Macro liquidity is soft: if entering, reduce size and tighten risk controls. Spot only.'
      : 'Spot only — no leverage, and stop-loss discipline is mandatory.',
    modelUsed: liquidityRegime
      ? 'EYAD Deterministic Strategy Engine v3.0 (MTF+Regime+RVOL+Funding) + Liquidity'
      : 'EYAD Deterministic Strategy Engine v3.0 (MTF+Regime+RVOL+Funding)',
    generatedAt: Date.now(),
    asset,
    entryQualityScore: score,
    entryQualityPassed: score >= 70 && spotAction === 'SPOT_BUY',
    entryQualityStage,
    whaleSentiment: change24h >= 1.5 ? 'ACCUMULATION' : change24h <= -2 ? 'DISTRIBUTION' : 'NEUTRAL',
    adxTrend: indicators.adx >= 25 ? 'STRONG_TREND' : 'WEAK_CHOPPY',
    multiTimeframeBias,
    regimeGateStatus,
    relativeVolume: rvol,
    status: 'READY' as const,
    liquidityRegime: liquidityRegime || undefined,
  };

  // Stable deduplication signature representing the discrete trading decision
  const dedupHash = [
    asset,
    signal.spotAction,
    signal.signalType,
    signal.entryQualityStage || 'SETUP',
    regimeGateStatus,
  ].join('|');

  return {
    signal,
    indicators,
    smc,
    elliott,
    reasons,
    dedupHash,
  };
}
