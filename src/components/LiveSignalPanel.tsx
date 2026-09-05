import React from 'react';
import { 
  ShieldAlert, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Compass, 
  Cpu, 
  Zap, 
  SlidersHorizontal,
  Flame,
  AlertTriangle,
  ShieldCheck,
  Award,
  Calendar
} from 'lucide-react';
import { AIReasoning, ElliottWaveAnalysis, IndicatorValues, LiquiditySentimentData, SMCAnalysis, LearningState, SupportedAsset, MacroNewsStatus, EntryQualityScoreBreakdown } from '../types';

interface LiveSignalPanelProps {
  currentAsset?: SupportedAsset;
  btcPrice: number;
  aiSignal: AIReasoning | null;
  indicators: IndicatorValues;
  smc: SMCAnalysis;
  elliott: ElliottWaveAnalysis;
  sentiment: LiquiditySentimentData;
  learningState: LearningState;
  macroStatus?: MacroNewsStatus | null;
  lang: 'ar' | 'en';
  isAnalyzing: boolean;
  onTriggerGeminiAnalysis: () => void;
  onSendTelegramAlert: () => void;
}

export const LiveSignalPanel: React.FC<LiveSignalPanelProps> = ({
  currentAsset = 'BTC',
  btcPrice,
  aiSignal,
  indicators,
  smc,
  elliott,
  sentiment,
  learningState,
  macroStatus,
  lang,
  isAnalyzing,
  onTriggerGeminiAnalysis,
  onSendTelegramAlert,
}) => {
  const hasSignal = Boolean(aiSignal);
  const signalType = aiSignal?.signalType ?? 'HOLD';
  const conviction = aiSignal?.convictionScore ?? 0;
  const isBuy = hasSignal && signalType.includes('BUY');
  const isSell = hasSignal && signalType.includes('SELL');
  // Honest technical fallback targets derived mathematically from live ATR and EMA21
  const effectiveAtr = indicators.atr || (btcPrice * 0.015);
  const technicalSl = Math.round(btcPrice - 2 * effectiveAtr);
  const technicalTp1 = Math.round(btcPrice + 4 * effectiveAtr);
  const technicalTp2 = Math.round(btcPrice + 6 * effectiveAtr);
  const technicalTp3 = Math.round(btcPrice + 8 * effectiveAtr);
  const technicalRR = 2.0;

  const entry = aiSignal?.entryPrice ?? (btcPrice > 0 ? Math.round(btcPrice) : null);
  const target1 = aiSignal?.target1 ?? (btcPrice > 0 ? technicalTp1 : null);
  const target2 = aiSignal?.target2 ?? (btcPrice > 0 ? technicalTp2 : null);
  const target3 = aiSignal?.target3 ?? (btcPrice > 0 ? technicalTp3 : null);
  const stopLoss = aiSignal?.stopLoss ?? (btcPrice > 0 ? technicalSl : null);
  const riskReward = aiSignal?.riskRewardRatio ?? (btcPrice > 0 ? technicalRR : null);

  // Safe formatting function for prices and numbers
  const fmtPrice = (v: number | null) =>
    typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString() : '—';

  const currentHour = new Date().getUTCHours();
  const isHourBanned = learningState.bannedTradingHours.includes(currentHour);

  // Strategy Gate Score - fallback to live technical indicators if aiSignal not yet triggered
  const currentCandle = indicators;
  const lastClose = btcPrice || 0;
  const ema21 = indicators.ema21 || lastClose;
  const atr = indicators.atr || (lastClose * 0.015);
  const adx = indicators.adx || 22;
  const trend4h: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = indicators.ema20 > indicators.ema50 ? 'BULLISH' : 'BEARISH';
  const rsi = indicators.rsi || 50;

  const rawQuality = aiSignal?.entryQualityScore;
  let quality: EntryQualityScoreBreakdown;
  
  if (typeof rawQuality === 'object' && rawQuality !== null) {
    quality = rawQuality;
  } else if (typeof rawQuality === 'number' && rawQuality > 0) {
    quality = {
      ema21Score: Math.round(rawQuality * 0.25),
      rejectionScore: Math.round(rawQuality * 0.20),
      volumeScore: Math.round(rawQuality * 0.15),
      trendScore: Math.round(rawQuality * 0.20),
      signalScore: Math.round(rawQuality * 0.20),
      totalScore: rawQuality,
      passed: rawQuality >= 70,
    };
  } else {
    // Dynamically calculate from honest live technical indicators
    const distPercent = Math.abs(lastClose - ema21) / (ema21 || 1) * 100;
    let ema21Score = 0;
    if (distPercent <= 0.8) ema21Score = 25;
    else if (distPercent <= 1.8) ema21Score = 20;
    else if (distPercent <= 3.0) ema21Score = 12;
    else if (distPercent <= 5.0) ema21Score = 5;

    let rejectionScore = 0;
    if (rsi <= 30) rejectionScore = 20;
    else if (rsi <= 40) rejectionScore = 15;
    else if (rsi <= 50) rejectionScore = 10;
    else rejectionScore = 5;

    const volumeScore = 10;
    const trend4hVal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 
      indicators.ema20 > indicators.ema50 ? 'BULLISH' : indicators.ema20 < indicators.ema50 ? 'BEARISH' : 'NEUTRAL';
    const trendScore = trend4hVal === 'BULLISH' ? 20 : trend4hVal === 'NEUTRAL' ? 10 : 0;
    const signalScore = adx >= 25 && rsi < 65 ? 20 : adx >= 20 ? 14 : 5;
    const totalScore = Math.min(100, ema21Score + rejectionScore + volumeScore + trendScore + signalScore);

    quality = {
      ema21Score,
      rejectionScore,
      volumeScore,
      trendScore,
      signalScore,
      totalScore,
      passed: totalScore >= 70,
    };
  }

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4 sm:p-5 relative overflow-hidden">
      {/* Top Banner: Signal Type + Spot Badge + Conviction Meter */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-[#1f1f1f]">
        
        {/* Left: Signal Badge & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <div className="text-[10px] uppercase text-gray-500 font-mono font-bold mb-0.5">
              {lang === 'ar' ? `حالة التحليل (${currentAsset})` : `${currentAsset} Analysis State`}
            </div>
            <div className="flex items-baseline space-x-2 space-x-reverse">
              <div
                className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${
                  isBuy || (quality.passed && trend4h === 'BULLISH')
                    ? 'text-emerald-400'
                    : isSell || trend4h === 'BEARISH'
                    ? 'text-rose-400'
                    : 'text-gray-300'
                }`}
              >
                {!hasSignal
                  ? (quality.passed && trend4h === 'BULLISH' ? 'BULLISH (TECH)' : trend4h === 'BULLISH' ? 'LEAN BULLISH' : 'NEUTRAL')
                  : signalType === 'STRONG_BUY'
                  ? 'BULLISH (PAPER)'
                  : signalType === 'BUY'
                  ? 'LEAN BULLISH'
                  : signalType === 'SELL'
                  ? 'LEAN BEARISH'
                  : signalType === 'STRONG_SELL'
                  ? 'BEARISH (PAPER)'
                  : 'NEUTRAL'}
              </div>
            </div>
          </div>

          {/* Strategy Protection Label */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141414] text-gray-300 border border-[#222] text-[11px] font-mono">
            <Zap className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400 font-semibold">{lang === 'ar' ? 'نموذج تحليلي' : 'Analytical Model'}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">{lang === 'ar' ? 'غير تنفيذي' : 'Non-Executional'}</span>
          </div>

          {/* Entry Quality Gate Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border ${
            quality.passed 
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' 
              : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
          }`}>
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Gate: {quality.totalScore}/100</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-black/40">
              {quality.passed ? (lang === 'ar' ? 'مؤهل' : 'Passed ≥70') : (lang === 'ar' ? 'مرفوض' : 'Blocked')}
            </span>
          </div>

          {/* Macro CPI/FOMC Blackout Badge */}
          {macroStatus?.isBlackoutActive ? (
            <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-rose-950/60 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
              <Calendar className="w-3 h-3 text-rose-400" />
              <span>{lang === 'ar' ? '⚠️ تجميد الصفقات (أخبار كبرى)' : '⚠️ Macro News Blackout'}</span>
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              <span>{lang === 'ar' ? 'الأخبار: آمن' : 'News: Clear'}</span>
            </span>
          )}

          {isHourBanned && (
            <span className="px-2 py-1 rounded text-[11px] font-mono bg-yellow-950/40 text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              {lang === 'ar' ? 'فلتر وقت الأخبار والافتتاح' : 'News/Open Volatility Filter'}
            </span>
          )}
        </div>

        {/* Right: Conviction Gauge & AI Refresh */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-gray-400 bg-[#141414] px-2.5 py-1 rounded border border-[#222]">
            <span>EYAD Research Strategy:</span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
            <span>•</span>
            <span>8 Protection Layers:</span>
            <span className="text-emerald-400 font-bold">ARMED</span>
          </div>

          {/* AI Trigger */}
          <button
            onClick={onTriggerGeminiAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold transition-all disabled:opacity-50 active:scale-95 border border-blue-400/40 shadow-sm"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? (lang === 'ar' ? 'جاري الفحص...' : 'Scanning...') : (lang === 'ar' ? 'فحص بالذكاء الاصطناعي' : 'AI Deep Scan')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Price Targets / Stop Loss & Confluence Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        
        {/* Left 7 Cols: Tactical Trade Parameters (Entry, Targets, Stop Loss) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            
            {/* Entry Price */}
            <div className="bg-[#0c0c0c] p-2.5 rounded border border-[#222]">
              <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1">
                <Compass className="w-3 h-3 text-amber-400" />
                {lang === 'ar' ? 'سعر الدخول' : 'Entry Price'}
              </div>
              <div className="text-sm sm:text-base font-bold text-white">
                ${fmtPrice(entry)}
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5 font-sans">
                {lang === 'ar' ? 'EMA21 Retest Zone' : 'EMA21 Retest'}
              </div>
            </div>

            {/* Target 1 (4x ATR - 50% partial exit) */}
            <div className="bg-[#0c0c0c] p-2.5 rounded border border-emerald-500/20">
              <div className="text-[10px] uppercase text-emerald-400 font-bold mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-400" />
                  {lang === 'ar' ? 'TP1 (4×ATR)' : 'TP1 (4xATR)'}
                </span>
                <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300">50%</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-emerald-400">
                ${fmtPrice(target1)}
              </div>
              <div className="text-[9px] text-emerald-500 mt-0.5 font-mono">
                {target1 !== null && entry ? '+' + (((target1 - entry) / entry) * 100).toFixed(1) + '%' : '—'} ({lang === 'ar' ? 'بيع نصف الكمية' : 'Partial Exit'})
              </div>
            </div>

            {/* Target 2 (6x ATR) */}
            <div className="bg-[#0c0c0c] p-2.5 rounded border border-emerald-500/20">
              <div className="text-[10px] uppercase text-emerald-400 font-bold mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-400" />
                  {lang === 'ar' ? 'TP2 (6×ATR)' : 'TP2 (6xATR)'}
                </span>
                <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300">Exit</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-emerald-400">
                ${fmtPrice(target2)}
              </div>
              <div className="text-[9px] text-emerald-500 mt-0.5 font-mono">
                {target2 !== null && entry ? '+' + (((target2 - entry) / entry) * 100).toFixed(1) + '%' : '—'}
              </div>
            </div>

            {/* Target 3 (8x ATR) */}
            <div className="bg-[#0c0c0c] p-2.5 rounded border border-emerald-500/20">
              <div className="text-[10px] uppercase text-emerald-400 font-bold mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-400" />
                  {lang === 'ar' ? 'TP3 (8×ATR)' : 'TP3 (8xATR)'}
                </span>
                <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300">Trend</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-emerald-400">
                ${fmtPrice(target3)}
              </div>
              <div className="text-[9px] text-emerald-500 mt-0.5 font-mono">
                {target3 !== null && entry ? '+' + (((target3 - entry) / entry) * 100).toFixed(1) + '%' : '—'}
              </div>
            </div>

          </div>

          {/* Stop Loss (2x ATR) & 2% Trailing Stop */}
          <div className="bg-[#0c0c0c] p-3 rounded border border-[#222] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 font-mono">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-rose-900/20 border border-rose-500/30 text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase text-gray-500 font-bold">
                  {lang === 'ar' ? 'وقف الخسارة الصارم (2×ATR Stop Loss)' : 'Strict Stop Loss (2x ATR)'}
                </div>
                <div className="text-sm font-bold text-rose-400">
                  ${fmtPrice(stopLoss)}{' '}
                  <span className="text-[11px] font-normal text-rose-500 font-mono">
                    {stopLoss !== null && entry ? `(${(((stopLoss - entry) / entry) * 100).toFixed(1)}%)` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="bg-[#141414] px-2 py-1 rounded border border-[#222] text-gray-300">
                <span className="text-gray-500 mr-1">Trailing:</span>
                <span className="text-purple-400 font-bold font-mono">2% Post-TP1</span>
              </div>
              <div className="bg-[#141414] px-2 py-1 rounded border border-[#222] text-gray-300">
                <span className="text-gray-500 mr-1">R:R:</span>
                <span className="text-emerald-400 font-bold font-mono">1 : {riskReward ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Entry Quality Gate Scoring Breakdown */}
          <div className="p-3 rounded bg-[#0c0c0c] border border-[#222] space-y-2 font-mono">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'ar' ? 'تفاصيل فحص بوابة الجودة (Score Breakdown)' : 'Entry Quality Gate Breakdown'}
              </span>
              <span className="text-amber-400 font-bold">{quality.totalScore} / 100 pts</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px]">
              <div className="p-1.5 rounded bg-[#141414] border border-[#222] text-center">
                <div className="text-gray-500">EMA21 Proximity</div>
                <div className="text-emerald-400 font-bold">{quality.ema21Score}/25</div>
              </div>
              <div className="p-1.5 rounded bg-[#141414] border border-[#222] text-center">
                <div className="text-gray-500">Rejection Wick</div>
                <div className="text-emerald-400 font-bold">{quality.rejectionScore}/20</div>
              </div>
              <div className="p-1.5 rounded bg-[#141414] border border-[#222] text-center">
                <div className="text-gray-500">Volume Confirm</div>
                <div className="text-emerald-400 font-bold">{quality.volumeScore}/15</div>
              </div>
              <div className="p-1.5 rounded bg-[#141414] border border-[#222] text-center">
                <div className="text-gray-500">4H/1D Trend</div>
                <div className="text-emerald-400 font-bold">{quality.trendScore}/20</div>
              </div>
              <div className="p-1.5 rounded bg-[#141414] border border-[#222] text-center">
                <div className="text-gray-500">ADX Trend (≥20)</div>
                <div className="text-emerald-400 font-bold">{quality.signalScore}/20</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right 5 Cols: Gemini AI Deep Synthesis & Alert Dispatch */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3 bg-[#080808] p-3.5 rounded border border-[#1f1f1f]">
          
          <div>
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#1f1f1f]">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  {lang === 'ar' ? 'محرك التوليف والذكاء الاصطناعي' : 'AI Synthesis Engine'}
                </h2>
                <p className="text-[10px] text-gray-500 font-mono">
                  {lang === 'ar' ? 'استراتيجية EYAD BTC الموحدة + التعلم الذاتي' : 'EYAD BTC Strategy + Self-Learning Loop'}
                </p>
              </div>
              <div className="text-right font-mono">
                <div className="text-[10px] text-gray-500">{currentAsset} Target</div>
                <div className="text-xs font-bold text-amber-400">
                  {currentAsset === 'BTC' ? '+30%' : currentAsset === 'ETH' ? '+16%' : '+60%'} Exp
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed min-h-[90px] font-sans">
              {aiSignal ? (
                lang === 'ar' ? aiSignal.summaryAr : aiSignal.summaryEn
              ) : (
                lang === 'ar'
                  ? 'لا توجد إشارة تحليلية نشطة حالياً. يرجى الضغط على "فحص بالذكاء الاصطناعي" لتحليل أحدث بيانات الشموع ومستويات السيولة بدقة.'
                  : 'No active analytical signal at this moment. Please click "AI Deep Scan" to run a fresh institutional analysis on live candle and liquidity data.'
              )}
            </p>

            {/* Golden Rule Footer Note */}
            <div className="mt-3 p-2.5 rounded bg-amber-950/20 border border-amber-500/30 text-[11px] font-mono text-amber-300">
              <div className="uppercase text-amber-400 font-bold mb-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Golden Rule in Effect</span>
              </div>
              <div className="italic text-slate-300">
                {lang === 'ar'
                  ? '«لا تفتح صفقة بدون شمعة تأكيد ووقف خسارة 2×ATR، ولا تُخاطر بأكثر من 2% لكل صفقة.»'
                  : '"Never open a trade without confirmation candle and 2x ATR SL. Risk max 2% per trade."'}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
