import type { AIReasoning, Candle, LiquidityRegimeScorecard, SupportedAsset } from './src/types';
import { analyzeElliottWave } from './src/utils/elliottWave';
import { analyzeSMC } from './src/utils/smcAnalysis';
import { calculateAllIndicators } from './src/utils/technicalAnalysis';

export interface DeterministicSignalContext {
  asset: SupportedAsset;
  candles: Candle[];
  change24h: number;
  liquidityRegime?: LiquidityRegimeScorecard | null;
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

export function buildDeterministicSignal({ asset, candles, change24h, liquidityRegime }: DeterministicSignalContext): DeterministicSignalResult {
  const indicators = calculateAllIndicators(candles);
  const smc = analyzeSMC(candles);
  const elliott = analyzeElliottWave(candles);
  const price = candles[candles.length - 1]?.close || 0;
  const atr = indicators.atr || Math.max(price * 0.015, 1);

  let score = 50;
  const reasons: string[] = [];

  if (indicators.emaTrend === 'STRONG_BULLISH' || indicators.emaTrend === 'GOLDEN_CROSS') {
    score += 14;
    reasons.push('Bullish EMA alignment');
  } else if (indicators.emaTrend === 'STRONG_BEARISH' || indicators.emaTrend === 'DEATH_CROSS') {
    score -= 14;
    reasons.push('Bearish EMA structure');
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

  if (indicators.adx >= 25) {
    score += 6;
    reasons.push('ADX confirms directional strength');
  } else if (indicators.adx < 18) {
    score -= 8;
    reasons.push('ADX shows choppy range');
  }

  if (smc.marketStructure === 'BOS_BULLISH' || smc.marketStructure === 'CHOCH_BULLISH') {
    score += 10;
    reasons.push('Bullish market structure');
  } else if (smc.marketStructure === 'BOS_BEARISH' || smc.marketStructure === 'CHOCH_BEARISH') {
    score -= 14;
    reasons.push('Bearish market structure');
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

  if (elliott.currentWave === 'WAVE_3' || elliott.currentWave === 'WAVE_4') {
    score += 8;
    reasons.push('Constructive Elliott wave context');
  } else if (elliott.currentWave === 'WAVE_C') {
    score -= 10;
    reasons.push('Corrective Elliott wave context');
  }

  if (change24h >= 2.5) {
    score += 4;
    reasons.push('24h momentum positive');
  } else if (change24h <= -2.5) {
    score -= 4;
    reasons.push('24h momentum negative');
  }

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

  const hardBearish = indicators.emaTrend === 'STRONG_BEARISH' && (smc.marketStructure === 'BOS_BEARISH' || indicators.macd.trend === 'BEARISH_CROSS');
  const hardBullish = score >= 82 && indicators.adx >= 20 && indicators.macd.trend !== 'BEARISH_CROSS';

  if (hardBearish || score <= 32) {
    signalType = score <= 20 ? 'STRONG_SELL' : 'SELL';
    spotAction = 'SPOT_SELL_ALL';
    summaryAr = `إشارة دفاعية على ${assetNameMap[asset].ar}: تراجع التوافق الفني والمؤسسي، لذلك الأفضل حماية رأس المال والخروج الكامل من مراكز السبوت.`;
    summaryEn = `Defensive ${assetNameMap[asset].en} signal: technical and institutional confluence deteriorated, so spot capital should rotate to cash.`;
  } else if (hardBullish || score >= 70) {
    signalType = score >= 82 ? 'STRONG_BUY' : 'BUY';
    spotAction = 'SPOT_BUY';
    summaryAr = `إشارة شراء على ${assetNameMap[asset].ar}: يوجد توافق جيد بين الاتجاه والزخم وهيكل السوق مع أفضلية للدخول المدروس في السبوت فقط.`;
    summaryEn = `Accumulation setup on ${assetNameMap[asset].en}: trend, momentum, and market structure are aligned for a spot-only entry.`;
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
  const stopLoss = spotAction === 'SPOT_BUY'
    ? Number(Math.max(price - atr * 2, price * 0.92).toFixed(2))
    : spotAction === 'SPOT_SELL_ALL'
      ? Number((price * 1.02).toFixed(2))
      : 0;
  const target1 = spotAction === 'SPOT_BUY' ? Number((price + atr * 2.5).toFixed(2)) : 0;
  const target2 = spotAction === 'SPOT_BUY' ? Number((price + atr * 4).toFixed(2)) : 0;
  const target3 = spotAction === 'SPOT_BUY' ? Number((price + atr * 5.5).toFixed(2)) : 0;
  const riskRewardRatio = spotAction === 'SPOT_BUY' && stopLoss > 0
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
    modelUsed: liquidityRegime ? 'EYAD Server Deterministic Strategy Engine + Liquidity Regime' : 'EYAD Server Deterministic Strategy Engine',
    generatedAt: Date.now(),
    asset,
    entryQualityScore: score,
    entryQualityPassed: score >= 70,
    entryQualityStage,
    whaleSentiment: change24h >= 1.5 ? 'ACCUMULATION' : change24h <= -2 ? 'DISTRIBUTION' : 'NEUTRAL',
    adxTrend: indicators.adx >= 25 ? 'STRONG_TREND' : 'WEAK_CHOPPY',
    status: 'READY' as const,
    liquidityRegime: liquidityRegime || undefined,
  };

  const dedupHash = [
    asset,
    signal.signalType,
    signal.spotAction,
    signal.entryQualityStage,
    Math.round(change24h * 10),
    liquidityRegime?.signature || 'no-liquidity-regime',
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
