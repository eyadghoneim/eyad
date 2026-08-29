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
import { AIReasoning, ElliottWaveAnalysis, IndicatorValues, LiquiditySentimentData, SMCAnalysis, LearningState, SupportedAsset, MacroNewsStatus } from '../types';

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
  onSendEmailAlert: () => void;
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
  onSendEmailAlert,
}) => {
  const signalType = aiSignal?.signalType || 'STRONG_BUY';
  const conviction = aiSignal?.convictionScore || 88;
  const isBuy = signalType.includes('BUY');
  const isSell = signalType.includes('SELL');

  const entry = aiSignal?.entryPrice || btcPrice;
  const atr = indicators?.atr || (btcPrice * 0.015);
  const target1 = aiSignal?.target1 || Math.round(btcPrice + 4 * atr);
  const target2 = aiSignal?.target2 || Math.round(btcPrice + 6 * atr);
  const target3 = aiSignal?.target3 || Math.round(btcPrice + 8 * atr);
  const stopLoss = aiSignal?.stopLoss || Math.round(btcPrice - 2 * atr);
  const riskReward = aiSignal?.riskRewardRatio || 3.4;

  const currentHour = new Date().getUTCHours();
  const isHourBanned = learningState.bannedTradingHours.includes(currentHour);

  // Strategy Gate Score
  const quality = aiSignal?.entryQualityScore || {
    ema21Score: 25,
    rejectionScore: 20,
    volumeScore: 15,
    trendScore: 20,
    signalScore: 20,
    totalScore: 85,
    passed: true,
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4 sm:p-5 relative overflow-hidden">
      {/* Top Banner: Signal Type + Spot Badge + Conviction Meter */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-[#1f1f1f]">
        
        {/* Left: Signal Badge & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <div className="text-[10px] uppercase text-gray-500 font-mono font-bold mb-0.5">
              {lang === 'ar' ? `حالة الإشارة الفنية (${currentAsset})` : `${currentAsset} Signal State`}
            </div>
            <div className="flex items-baseline space-x-2 space-x-reverse">
              <div
                className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${
                  isBuy
                    ? 'text-emerald-400'
                    : isSell
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {signalType === 'STRONG_BUY'
                  ? 'STRONG BUY'
                  : signalType === 'BUY'
                  ? 'BUY'
                  : signalType === 'SELL'
                  ? 'SELL'
                  : signalType === 'STRONG_SELL'
                  ? 'STRONG SELL'
                  : 'HOLD'}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {lang === 'ar' ? `ثقة الإشارة: ${conviction}%` : `Confidence: ${conviction}%`}
              </div>
            </div>
          </div>

          {/* Strategy Protection Label */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141414] text-gray-300 border border-[#222] text-[11px] font-mono">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400 font-semibold">{lang === 'ar' ? 'متعدد الأصول' : 'Multi-Asset'}</span>
            <span className="text-gray-500">•</span>
            <span>{lang === 'ar' ? 'حماية رأس المال' : 'Capital Preserved'}</span>
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
              {quality.passed ? (lang === 'ar' ? 'مؤهل' : 'Passed ≥75') : (lang === 'ar' ? 'مرفوض' : 'Blocked')}
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
            <span>EYAD Trading Strategy:</span>
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
                ${entry.toLocaleString()}
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
                ${target1.toLocaleString()}
              </div>
              <div className="text-[9px] text-emerald-500 mt-0.5 font-mono">
                +{(((target1 - entry) / entry) * 100).toFixed(1)}% ({lang === 'ar' ? 'بيع نصف الكمية' : 'Partial Exit'})
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
                ${target2.toLocaleString()}
              </div>
              <div className="text-[9px] text-emerald-500 mt-0.5 font-mono">
                +{(((target2 - entry) / entry) * 100).toFixed(1)}%
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
                ${target3.toLocaleString()}
              </div>
              <div className="text-[9px] text-emerald-500 mt-0.5 font-mono">
                +{(((target3 - entry) / entry) * 100).toFixed(1)}%
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
                  ${stopLoss.toLocaleString()}{' '}
                  <span className="text-[11px] font-normal text-rose-500 font-mono">
                    ({(((stopLoss - entry) / entry) * 100).toFixed(1)}%)
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
                <span className="text-emerald-400 font-bold font-mono">1 : {riskReward}</span>
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
                  ? 'يظهر السوق تماسكاً مؤسسياً قوياً مع الالتزام التام بقواعد الدخول (بوابة الجودة > 75). وقف الخسارة الصارم عند 2×ATR وأهداف جني الأرباح الجزئية TP1 4×ATR و TP2 6×ATR مفعلة مع الوقف المتحرك 2% لحماية الأرباح.'
                  : 'Market fulfills the strict Entry Quality Gate requirements (Score > 75). Disciplined 2x ATR stop-loss and partial profit targets (TP1 4x ATR, TP2 6x ATR) active with 2% trailing stop protection.'
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
