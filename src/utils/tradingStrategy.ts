/**
 * ══════════════════════════════════════════════════════════════
 * 🤖 EYAD Research — Multi-Asset Research Strategy (Single File)
 * ══════════════════════════════════════════════════════════════
 * 
 * ده ملف الاستراتيجية الكامل — كل قواعد التحليل في مكان واحد
 * آخر تحديث: August 2026
 * 
 * الأصول: BTC, ETH, PAXG
 * ══════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════════
// 📋 القواعد العامة
// ══════════════════════════════════════════════════════════════

export const GENERAL_RULES = {
  tradingType: "SPOT",                    // لا فيوتشرز
  allowShort: false,                       // لا Short Selling
  assets: ["BTC", "ETH", "PAXG"] as const,// الأصول المتاحة
  maxOpenPositions: 3,                     // حالات بحث مفتوحة في نفس الوقت
  maxTradesPerAssetPerDay: 1,             // إشارة واحدة بس في اليوم لكل أصل
  cooldownBetweenTrades: "24 hours",       // فاصل زمني بين إشارتين لنفس الأصل
  notificationCooldown: "4 hours",         // 4 ساعات بين كل إشعار
  sendOnNeutral: false,                    // لا يبعت على neutral
  sendOnNonActionable: false,             // لا يبعت لو actionable = false
};

export type SupportedAsset = typeof GENERAL_RULES.assets[number];

// ══════════════════════════════════════════════════════════════
// 🔍 فلتر جودة الدخول (Entry Quality Gate)
// ══════════════════════════════════════════════════════════════

export const ENTRY_QUALITY = {
  minimumScore: 75,                        // الحد الأدنى لجودة الدخول (كان55)
  
  components: {
    priceNearEma21: 25,                    // السعر قريب من EMA21 (ارتداد)
    rejectionCandle: 20,                   // شمعة رفض عند الدعم
    volumeConfirmation: 15,                // حجم تداول عالي
    trendAlignment: 20,                    // توافق الاتجاه العام (4H/1D)
    signalStrength: 20,                    // قوة الإشارة
  },
  
  stages: {
    ideal: "دخول مثالي — مؤشرات متوافقة وارتداد عند الدعم",
    good: "دخول جيد — مؤشرات متوافقة",
    wait: "انتظار — السعر بعيد عن الدعم",
    skip: "لا دخول — جدار سيولة أو مؤشرات متعارضة",
  },
};

// ══════════════════════════════════════════════════════════════
// 📊 المؤشرات الفنية المستخدمة
// ══════════════════════════════════════════════════════════════

export const INDICATORS = {
  momentum: {
    rsi: { period: 14, oversold: 30, overbought: 70 },
    macd: { fast: 12, slow: 26, signal: 9 },
  },
  movingAverages: {
    ema9: 9,
    ema21: 21,
    ema50: 50,
    // لو السعر فوق EMA50 على 4H → صاعد
    // لو السعر تحت EMA50 على 4H → هابط
  },
  volatility: {
    bollingerBands: { period: 20, stdDev: 2 },
    atr: { period: 14 },
  },
  adx: {
    period: 14,
    strongTrend: 25,                       // ADX ≥ 25 = اتجاه قوي
    weakTrend: 20,                         // ADX < 20 = سوق جانبي
  },
  supertrend: { period: 10, multiplier: 3 },
  elliottWave: {
    // لو الموجة4 هابطة → البوت بستنى الموجة الخامسة
    // لو الموجة3 صاهرة → البوت بيتبع الاتجاه
  },
};

// ══════════════════════════════════════════════════════════════
// 🛑 إدارة المخاطر (Risk Management)
// ══════════════════════════════════════════════════════════════

export const RISK_MANAGEMENT = {
  riskPerTrade: "2% من الرصيد",
  
  stopLoss: {
    atrMultiplier: 2,                      // وقف = السعر - 2×ATR (كان1.5)
  },
  
  takeProfit: {
    tp1Multiplier: 4,                      // TP1 = السعر + 4×ATR
    tp2Multiplier: 6,                      // TP2 = السعر + 6×ATR
    strongTrendTp2Multiplier: 8,           // في اتجاه قوي → TP2 = 8×ATR
  },
  
  trailingStop: {
    percentage: "2%",                      // بعد TP1 → وقف متحرك2%
  },
  
  partialProfit: {
    tp1SellPercentage: 50,                 // لما TP1 يتحقق → يبيع50%
  },
  
  dailyDrawdownLimit: "5% من الرصيد",
  // لو خسر3 صفقات ورا بعض → وضع الحماية24 ساعة
};

// ══════════════════════════════════════════════════════════════
// 🧠 طبقات الحماية (Protection Layers)
// ══════════════════════════════════════════════════════════════

export const PROTECTION_LAYERS = [
  {
    id: "entry_quality_gate",
    name: "Entry Quality Gate",
    nameAr: "بوابة جودة الدخول",
    description: "لو جودة الدخول أقل من 75 → يرفض فتح الصفقة",
    threshold: 75,
    icon: "ShieldCheck",
  },
  {
    id: "order_book_wall",
    name: "Order Book Wall Detector",
    nameAr: "كاشف جدار السيولة والبيع",
    description: "لو فيه جدار بيع ضخم → يلغي إشارة الشراء",
    wallRatioThreshold: 3,
    icon: "Layers",
  },
  {
    id: "choppy_market",
    name: "Choppy Market Detector",
    nameAr: "كاشف السوق المتذبذب",
    description: "لو خسر 3 صفقات ورا بعض → وضع الحماية 24 ساعة",
    consecutiveLossLimit: 3,
    cooldownDuration: "24 hours",
    icon: "AlertTriangle",
  },
  {
    id: "daily_cooldown",
    name: "24-Hour Cooldown",
    nameAr: "فاصل 24 ساعة لكل أصل",
    description: "صفقة واحدة بس في اليوم لكل أصل",
    cooldown: "24 hours per asset",
    icon: "Clock",
  },
  {
    id: "news_filter",
    name: "High-Impact News Filter",
    nameAr: "فلتر الأخبار الاقتصادية القوية",
    description: "لو فيه حدث اقتصادي قوي → يمنع أي صفقة",
    lookbackHours: 6,
    keywords: ["CPI", "FOMC", "rate decision", "inflation", "employment"],
    icon: "Newspaper",
  },
  {
    id: "adx_filter",
    name: "ADX Trend Filter",
    nameAr: "فلتر قوة الاتجاه ADX",
    description: "ADX < 20 → سوق جانبي — لا تداول",
    minimumADX: 20,
    icon: "TrendingUp",
  },
  {
    id: "gemini_veto",
    name: "Gemini Second Opinion",
    nameAr: "فيتو الذكاء الاصطناعي Gemini",
    description: "Gemini بيراجع — لو معارض، البوت يلغي الدخول",
    vetoEnabled: true,
    icon: "BrainCircuit",
  },
  {
    id: "trend_alignment",
    name: "4H/1D Trend Alignment",
    nameAr: "توافق الاتجاه العام 4H/1D",
    description: "الاتجاه على فريم 4H/1D لازم يوافق الدخول (سعر فوق EMA50)",
    timeframes: ["4H", "1D"],
    icon: "GitMerge",
  },
];

// ══════════════════════════════════════════════════════════════
// 🐋 تتبع الحيتان
// ══════════════════════════════════════════════════════════════

export const WHALE_TRACKING = {
  source: "blockchain.com",
  thresholds: { BTC: 100, ETH: 1000, PAXG: 50 },
};

// ══════════════════════════════════════════════════════════════
// 📰 فلتر الأخبار
// ══════════════════════════════════════════════════════════════

export const NEWS_FILTER = {
  source: "Google News RSS",
  highImpactKeywords: [
    "CPI", "FOMC", "rate decision", "inflation",
    "employment", "jobs report", "Fed", "ECB",
    "regulation", "ban", "ETF approval",
  ],
  lookbackHours: 6,
};

// ══════════════════════════════════════════════════════════════
// 🧠 التعلم الذاتي
// ══════════════════════════════════════════════════════════════

export const SELF_LEARNING = {
  directionEvaluation: { timeframe: "6 hours" },
  conditionLearning: { minSamplesPerBucket: 3 },
  aiReview: { throttle: "once every 6 hours" },
};

// ══════════════════════════════════════════════════════════════
// 📈 الأداء المتوقع (Not Validated)
// ══════════════════════════════════════════════════════════════

export const EXPECTED_PERFORMANCE = {
  BTC: { return: "NOT VALIDATED", winRate: "NOT VALIDATED", avgDuration: "-", sharpe: "-" },
  ETH: { return: "NOT VALIDATED", winRate: "NOT VALIDATED", avgDuration: "-", sharpe: "-" },
  PAXG: { return: "NOT VALIDATED", winRate: "NOT VALIDATED", avgDuration: "-", sharpe: "-" },
};

// ══════════════════════════════════════════════════════════════
// 🔄 تكرار الكرون
// ══════════════════════════════════════════════════════════════

export const CRON_SCHEDULE = {
  marketScan: "every 30 minutes",
  exchangeReconcile: "every 30 minutes",
  whaleScan: "every 2 hours",
  lessonGeneration: "every 6 hours",
  dailyReport: "daily at 07:30 UTC",
  backtestRefresh: "daily at 02:30 UTC",
};

// ══════════════════════════════════════════════════════════════
// 🎯 القاعدة الذهبية
// ══════════════════════════════════════════════════════════════

export const GOLDEN_RULE = `
1. لا تقم بالرصد في سوق جانبي (ADX < 20)
2. لا تتبع السعر — استنى ارتداد عند الدعم
3. لا ترصد إشارة لو فيه جدار بيع ضخم
4. لا ترصد إشارة لو فيه حدث اقتصادي قوي
5. لو فشل الرصد 3 مرات ورا بعض → اوقف 24 ساعة
6. الهدف أبعد من الوقف 2.7 مرة — رابح حتى لو 50%
7. تعلم من أخطائك — البوت بيعدّل ثقته تلقائياً
8. لا يوجد Short — البوت بس بيرصد الشراء أو البيع
9. إشارة واحدة بس في اليوم لكل أصل
10. الوقف المتحرك بياخد الربح — متمسكش في الرصد
`;

export const GOLDEN_RULES_LIST = [
  { num: 1, textAr: "لا ترصد في سوق جانبي (ADX < 20)", textEn: "Never monitor in a choppy/ranging market (ADX < 20)" },
  { num: 2, textAr: "لا تتبع السعر — استنى ارتداد عند الدعم وEMA21", textEn: "Never chase green candles — wait for support & EMA21 retest" },
  { num: 3, textAr: "لا ترصد إشارة لو فيه جدار بيع ضخم في دفتر الأوامر", textEn: "Avoid signaling against heavy ask wall barriers" },
  { num: 4, textAr: "لا ترصد إشارة أثناء الأحداث الاقتصادية الكبرى (CPI, FOMC)", textEn: "Freeze entries around high-impact macro news releases" },
  { num: 5, textAr: "لو فشل الرصد 3 مرات متتالية → وضع الحماية والتوقف 24 ساعة", textEn: "3 consecutive invalidations triggers 24h protection cooldown" },
  { num: 6, textAr: "الهدف أبعد من الوقف بـ 2.7 مرة على الأقل (2x ATR SL مقابل 4x/6x ATR TP)", textEn: "Reward-to-risk minimum 2.7 (2x ATR SL vs 4x/6x ATR TP)" },
  { num: 7, textAr: "تعلم من أخطائك — المحرك بيعدل ثقته تلقائياً ويوثق الدروس", textEn: "Self-correcting AI memory logs mistakes and adapts rules" },
  { num: 8, textAr: "لا يوجد Short إطلاقاً — المحرك يرصد السبوت فقط", textEn: "Strictly Spot analysis only — zero shorting or liquidation risk" },
  { num: 9, textAr: "إشارة واحدة فقط في اليوم لكل أصل بفاصل 24 ساعة", textEn: "Maximum 1 signal per asset per 24 hours" },
  { num: 10, textAr: "الوقف المتحرك (2%) وجني الأرباح الجزئي (50% عند TP1) يضمنان الحماية", textEn: "Trailing stop (2%) and 50% partial exit at TP1 lock in gains" },
];

/**
 * Evaluates the Entry Quality Gate Score (0-100)
 */
export function evaluateEntryQualityScore(
  price: number,
  ema21: number,
  atr: number,
  adx: number,
  trend4h: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  rsi: number,
  volumeRatio: number, // currentVolume / avgVolume
  hasRejectionWick: boolean
) {
  let score = 0;
  
  // 1. Price near EMA21 (25 pts max)
  const distPercent = Math.abs(price - ema21) / ema21 * 100;
  let priceNearEma21Score = 0;
  if (distPercent <= 0.8) priceNearEma21Score = 25;
  else if (distPercent <= 1.8) priceNearEma21Score = 18;
  else if (distPercent <= 3.0) priceNearEma21Score = 10;
  score += priceNearEma21Score;

  // 2. Rejection candle at support (20 pts max)
  let rejectionScore = 0;
  if (hasRejectionWick) rejectionScore = 20;
  else if (rsi <= 35) rejectionScore = 15;
  else if (rsi <= 45) rejectionScore = 10;
  score += rejectionScore;

  // 3. Volume confirmation (15 pts max)
  let volumeScore = 0;
  if (volumeRatio >= 1.4) volumeScore = 15;
  else if (volumeRatio >= 1.0) volumeScore = 10;
  else volumeScore = 5;
  score += volumeScore;

  // 4. Trend alignment (4H/1D above EMA50) (20 pts max)
  let trendScore = 0;
  if (trend4h === 'BULLISH') trendScore = 20;
  else if (trend4h === 'NEUTRAL') trendScore = 8;
  else trendScore = 0;
  score += trendScore;

  // 5. Signal Strength (ADX >= 25 & SuperTrend & RSI not overbought) (20 pts max)
  let signalStrengthScore = 0;
  if (adx >= 25 && rsi < 65) signalStrengthScore = 20;
  else if (adx >= 20 && rsi < 70) signalStrengthScore = 14;
  else if (adx < 20) signalStrengthScore = 0; // Market is choppy
  score += signalStrengthScore;

  const totalScore = Math.min(100, Math.max(0, score));

  let stage: 'ideal' | 'good' | 'wait' | 'skip' = 'skip';
  if (totalScore >= 85) stage = 'ideal';
  else if (totalScore >= 75) stage = 'good';
  else if (totalScore >= 55) stage = 'wait';
  else stage = 'skip';

  return {
    totalScore,
    isActionable: totalScore >= ENTRY_QUALITY.minimumScore,
    stage,
    stageText: ENTRY_QUALITY.stages[stage],
    breakdown: {
      priceNearEma21: priceNearEma21Score,
      rejectionCandle: rejectionScore,
      volumeConfirmation: volumeScore,
      trendAlignment: trendScore,
      signalStrength: signalStrengthScore,
    },
  };
}

/**
 * Calculates exact ATR-based Stop Loss & Take Profits
 */
export function calculateStrategyRiskTargets(price: number, atr: number, isStrongTrend: boolean = false) {
  const effectiveAtr = atr > 0 ? atr : price * 0.015;
  const stopLoss = Math.round(price - 2 * effectiveAtr);
  const tp1 = Math.round(price + 4 * effectiveAtr);
  const tp2Multiplier = isStrongTrend ? 8 : 6;
  const tp2 = Math.round(price + tp2Multiplier * effectiveAtr);
  const tp3 = Math.round(price + 10 * effectiveAtr);

  const slRiskPercent = Number((((price - stopLoss) / price) * 100).toFixed(2));
  const tp1RewardPercent = Number((((tp1 - price) / price) * 100).toFixed(2));
  const tp2RewardPercent = Number((((tp2 - price) / price) * 100).toFixed(2));
  const riskRewardRatio = Number((tp1RewardPercent / slRiskPercent).toFixed(2));

  return {
    stopLoss,
    slRiskPercent,
    tp1,
    tp1RewardPercent,
    tp2,
    tp2RewardPercent,
    tp3,
    riskRewardRatio: Math.max(2.0, riskRewardRatio || 2.7),
    trailingStopPercent: 2.0,
    partialSellPercent: 50,
  };
}
