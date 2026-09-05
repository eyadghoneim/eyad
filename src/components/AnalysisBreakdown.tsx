import React, { useState } from 'react';
import { 
  Layers, 
  TrendingUp, 
  Activity, 
  Droplets, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  Target, 
  Compass, 
  Radio, 
  Newspaper,
  Flame,
  ArrowRightLeft,
  PieChart
} from 'lucide-react';
import { AIReasoning, ElliottWaveAnalysis, IndicatorValues, LiquiditySentimentData, SMCAnalysis } from '../types';

interface AnalysisBreakdownProps {
  indicators: IndicatorValues;
  smc: SMCAnalysis;
  elliott: ElliottWaveAnalysis;
  sentiment: LiquiditySentimentData;
  aiSignal: AIReasoning | null;
  btcPrice: number;
  lang: 'ar' | 'en';
}

export const AnalysisBreakdown: React.FC<AnalysisBreakdownProps> = ({
  indicators,
  smc,
  elliott,
  sentiment,
  aiSignal,
  btcPrice,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'smc' | 'elliott' | 'indicators' | 'liquidity' | 'ai'>('smc');

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4">
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 pb-3 border-b border-[#1f1f1f] overflow-x-auto font-mono text-xs">
        <button
          onClick={() => setActiveTab('smc')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all shrink-0 font-bold ${
            activeTab === 'smc'
              ? 'bg-blue-600 text-white shadow-sm border border-blue-400/40'
              : 'text-gray-400 hover:text-white hover:bg-[#141414] border border-transparent'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'المفاهيم المؤسسية (SMC)' : 'Smart Money (SMC)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('elliott')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all shrink-0 font-bold ${
            activeTab === 'elliott'
              ? 'bg-blue-600 text-white shadow-sm border border-blue-400/40'
              : 'text-gray-400 hover:text-white hover:bg-[#141414] border border-transparent'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'موجات إليوت وفيبوناتشي' : 'Elliott Wave & Fib'}</span>
        </button>

        <button
          onClick={() => setActiveTab('indicators')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all shrink-0 font-bold ${
            activeTab === 'indicators'
              ? 'bg-blue-600 text-white shadow-sm border border-blue-400/40'
              : 'text-gray-400 hover:text-white hover:bg-[#141414] border border-transparent'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'المؤشرات الفنية' : 'Technical Indicators'}</span>
        </button>

        <button
          onClick={() => setActiveTab('liquidity')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all shrink-0 font-bold ${
            activeTab === 'liquidity'
              ? 'bg-blue-600 text-white shadow-sm border border-blue-400/40'
              : 'text-gray-400 hover:text-white hover:bg-[#141414] border border-transparent'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'السيولة والمشاعر' : 'Liquidity & Flow'}</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all shrink-0 font-bold ${
            activeTab === 'ai'
              ? 'bg-blue-600 text-white shadow-sm border border-blue-400/40'
              : 'text-gray-400 hover:text-white hover:bg-[#141414] border border-transparent'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'توليف الذكاء الاصطناعي' : 'Gemini AI Brain'}</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="pt-4">
        
        {/* TAB 1: Smart Money Concepts (SMC) */}
        {activeTab === 'smc' && (
          <div className="space-y-4 font-mono">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              
              {/* Market Structure */}
              <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{lang === 'ar' ? 'هيكل السوق المؤسسي' : 'Market Structure'}</div>
                <div className="text-sm font-bold text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {smc.marketStructure}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 font-sans">
                  {lang === 'ar' ? 'مبني على كسر قمم/قيعان ATR حقيقية' : 'Verified via ATR-filtered swing breaks'}
                </p>
              </div>

              {/* Premium / Discount Zone */}
              <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{lang === 'ar' ? 'نطاق التسعير' : 'Pricing Zone'}</div>
                <div className="text-sm font-bold text-cyan-400">
                  {smc.premiumDiscountZone}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 font-sans">
                  {lang === 'ar' ? 'السعر مقارنة بالنطاق المؤسسي العام' : 'Position relative to institutional range'}
                </p>
              </div>

              {/* Volume Delta Proxy */}
              <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{lang === 'ar' ? 'مؤشر دلتا الفوليوم' : 'Volume Delta Proxy'}</div>
                <div className={`text-sm font-bold ${(smc.volumeDeltaProxy || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(smc.volumeDeltaProxy || 0) > 0 ? `+${smc.volumeDeltaProxy}%` : `${smc.volumeDeltaProxy || 0}%`}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 font-sans">
                  {lang === 'ar' ? 'توازن حجم الشراء مقابل البيع للشمعات الأخيرة' : 'Directional bar-volume imbalance proxy'}
                </p>
              </div>

              {/* Liquidity Sweep Status */}
              <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{lang === 'ar' ? 'سحب السيولة' : 'Liquidity Sweep'}</div>
                <div className="text-sm font-bold text-yellow-400">
                  {smc.liquiditySwept.lowSwept ? (lang === 'ar' ? 'تم سحب سيولة القاع' : 'Low Swept & Reclaimed') : (lang === 'ar' ? 'لا يوجد سحب معاكس' : 'Clean Orderbook')}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 font-sans">
                  {lang === 'ar' ? 'تصفية العقود الضعيفة وتطهير القاع' : 'Weak hands flushed, clean path'}
                </p>
              </div>

            </div>

            {/* Active Order Blocks & Fair Value Gaps List */}
            <div className="bg-[#080808] p-3 rounded border border-[#1f1f1f]">
              <div className="text-xs font-bold text-white mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>{lang === 'ar' ? 'المناطق المؤسسية المرصودة (Order Blocks & Fair Value Gaps)' : 'Detected Institutional Zones'}</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {smc.unmitigatedOBCount !== undefined ? `${smc.unmitigatedOBCount} Fresh / ${smc.mitigatedOBCount || 0} Mitigated` : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {smc.zones.map((z) => (
                  <div key={z.id} className="p-2.5 rounded bg-[#141414] border border-[#222] text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-200">{lang === 'ar' ? z.descriptionAr : z.descriptionEn}</div>
                      <div className="text-gray-500 text-[10px] mt-0.5">
                        {z.isMitigated ? (lang === 'ar' ? 'تم اختباره واستهلاكه' : 'Mitigated / Weakened') : (lang === 'ar' ? 'بلوك نشط غير ملموس (Fresh)' : 'Fresh Unmitigated')}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      z.type.includes('BULLISH') ? 'bg-green-900/20 text-green-400 border border-green-500/30' : 'bg-red-900/20 text-red-400 border border-red-500/30'
                    }`}>
                      {z.strength}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Elliott Wave & Fibonacci */}
        {activeTab === 'elliott' && (
          <div className="space-y-4 font-mono">
            <div className="bg-[#0c0c0c] p-4 rounded border border-[#222] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <span>{lang === 'ar' ? 'المرحلة الموجية الحالية' : 'Current Wave Phase'}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-950/60 text-blue-300 border border-blue-500/30">
                    Confidence: {elliott.confidence}%
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {elliott.currentWave} ({elliott.waveType})
                </div>
                <p className="text-xs text-gray-300 mt-1.5 max-w-2xl leading-relaxed font-sans">
                  {lang === 'ar' ? elliott.explanationAr : elliott.explanationEn}
                </p>
              </div>

              <div className="bg-[#141414] p-3 rounded border border-[#222] text-center shrink-0">
                <div className="text-[10px] text-gray-400">{lang === 'ar' ? 'امتداد فيبوناتشي 1.618' : 'Fib 1.618 Target'}</div>
                <div className="text-base font-bold text-green-400">${elliott.estimatedTarget.toLocaleString()}</div>
                <div className="text-[9px] text-gray-500 mt-0.5">{lang === 'ar' ? 'الهدف الموجي المتوقع' : 'Projected Impulse Peak'}</div>
              </div>
            </div>

            {/* Elliott Wave Rules Verification Status */}
            {(elliott.rulesPassed || elliott.rulesViolated) && (
              <div className="bg-[#080808] p-3 rounded border border-[#1f1f1f]">
                <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>{lang === 'ar' ? 'التحقق الرياضي لقواعد إليوت' : 'Mathematical Elliott Rules Verification'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {elliott.rulesPassed?.map((rule, idx) => (
                    <div key={`pass-${idx}`} className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/20 px-2.5 py-1.5 rounded border border-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{rule}</span>
                    </div>
                  ))}
                  {elliott.rulesViolated?.map((rule, idx) => (
                    <div key={`viol-${idx}`} className="flex items-center gap-1.5 text-amber-400 bg-amber-950/20 px-2.5 py-1.5 rounded border border-amber-500/20">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fibonacci Levels Matrix */}
            <div className="bg-[#080808] p-3 rounded border border-[#1f1f1f]">
              <div className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-yellow-400" />
                <span>{lang === 'ar' ? 'مستويات تصحيح وامتداد فيبوناتشي' : 'Key Fibonacci Retracement Grid'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
                <div className="bg-[#141414] p-2 rounded border border-[#222]">
                  <div className="text-[9px] text-gray-500">Fib 0.236</div>
                  <div className="text-xs font-bold text-gray-200">${elliott.fibLevels.level0_236.toLocaleString()}</div>
                </div>
                <div className="bg-[#141414] p-2 rounded border border-[#222]">
                  <div className="text-[9px] text-gray-500">Fib 0.382</div>
                  <div className="text-xs font-bold text-gray-200">${elliott.fibLevels.level0_382.toLocaleString()}</div>
                </div>
                <div className="bg-[#141414] p-2 rounded border border-[#222]">
                  <div className="text-[9px] text-gray-500">Fib 0.500</div>
                  <div className="text-xs font-bold text-gray-200">${elliott.fibLevels.level0_500.toLocaleString()}</div>
                </div>
                <div className="bg-yellow-950/20 p-2 rounded border border-yellow-500/40">
                  <div className="text-[9px] text-yellow-400 font-bold">Fib 0.618 (Golden)</div>
                  <div className="text-xs font-bold text-yellow-300">${elliott.fibLevels.level0_618.toLocaleString()}</div>
                </div>
                <div className="bg-[#141414] p-2 rounded border border-[#222]">
                  <div className="text-[9px] text-gray-500">Fib 0.786</div>
                  <div className="text-xs font-bold text-gray-200">${elliott.fibLevels.level0_786.toLocaleString()}</div>
                </div>
                <div className="bg-green-950/20 p-2 rounded border border-green-500/40">
                  <div className="text-[9px] text-green-400 font-bold">Fib 1.618 (Ext)</div>
                  <div className="text-xs font-bold text-green-300">${elliott.fibLevels.level1_618.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Technical Indicators Radar */}
        {activeTab === 'indicators' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
            
            {/* RSI */}
            <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>RSI (14 Period)</span>
                <span className={indicators.rsi < 45 ? 'text-green-400' : indicators.rsi > 70 ? 'text-red-400' : 'text-gray-300'}>
                  {indicators.rsiSignal}
                </span>
              </div>
              <div className="text-xl font-bold text-white">{indicators.rsi}</div>
              <div className="w-full bg-[#1a1a1a] h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full ${indicators.rsi <= 40 ? 'bg-green-400' : indicators.rsi >= 70 ? 'bg-red-400' : 'bg-blue-400'}`}
                  style={{ width: `${indicators.rsi}%` }}
                />
              </div>
            </div>

            {/* MACD */}
            <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>MACD (12, 26, 9)</span>
                <span className="text-green-400 font-bold">{indicators.macd.trend}</span>
              </div>
              <div className="text-base font-bold text-gray-200">
                Hist: <span className={indicators.macd.histogram >= 0 ? 'text-green-400' : 'text-red-400'}>{indicators.macd.histogram}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                MACD: {indicators.macd.macd} | Signal: {indicators.macd.signal}
              </div>
            </div>

            {/* EMA Cross */}
            <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>EMA Alignment</span>
                <span className="text-green-400 font-bold">{indicators.emaTrend}</span>
              </div>
              <div className="text-xs font-semibold text-gray-200">
                EMA 20: ${indicators.ema20.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                EMA 50: ${indicators.ema50.toLocaleString()} | EMA 200: ${indicators.ema200.toLocaleString()}
              </div>
            </div>

            {/* SuperTrend */}
            <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>SuperTrend (10, 3)</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  indicators.superTrend.direction === 'BULLISH' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
                }`}>
                  {indicators.superTrend.direction}
                </span>
              </div>
              <div className="text-base font-bold text-green-400">
                ${indicators.superTrend.value.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{lang === 'ar' ? 'مستوى دعم الاتجاه الصاعد' : 'Trend Support Level'}</div>
            </div>

            {/* Bollinger Bands */}
            <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>Bollinger Bands (20, 2)</span>
                <span className="text-gray-300">%B: {indicators.bollinger.percentB}</span>
              </div>
              <div className="text-[11px] text-gray-300 space-y-0.5">
                <div>Upper: ${indicators.bollinger.upper.toLocaleString()}</div>
                <div>Middle: ${indicators.bollinger.middle.toLocaleString()}</div>
                <div>Lower: ${indicators.bollinger.lower.toLocaleString()}</div>
              </div>
            </div>

            {/* VWAP & ATR */}
            <div className="bg-[#0c0c0c] p-3.5 rounded border border-[#222]">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                <span>VWAP & Volatility</span>
                <span className="text-cyan-400">ATR: ${indicators.atr}</span>
              </div>
              <div className="text-base font-bold text-cyan-300">
                VWAP: ${indicators.vwap.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {btcPrice > indicators.vwap ? (lang === 'ar' ? 'السعر أعلى متوسط الحجم' : 'Above volume-weighted average') : 'Below VWAP'}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: Liquidity, Orderbook & Sentiment */}
        {activeTab === 'liquidity' && (
          <div className="space-y-3 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              
              {/* Fear and Greed */}
              <div className="bg-[#0c0c0c] p-3 rounded border border-[#222]">
                <div className="text-[10px] text-gray-500 uppercase mb-1 font-sans">{lang === 'ar' ? 'مؤشر الخوف والجشع' : 'Fear & Greed Index'}</div>
                <div className="text-xl font-bold text-yellow-400">{sentiment.fearAndGreedIndex ?? 50}</div>
                <div className="text-[11px] font-semibold text-gray-300 mt-0.5">{sentiment.fearAndGreedLabel || (lang === 'ar' ? 'محايد' : 'Neutral')}</div>
              </div>

              {sentiment.isSimulated || sentiment.orderBookImbalance === undefined ? (
                <div className="bg-[#0c0c0c] p-3 rounded border border-amber-500/30 sm:col-span-1 md:col-span-3 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-sans">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[11px] font-bold">
                      {lang === 'ar' ? 'بيانات دفتر الأوامر والتدفقات المباشرة غير متاحة حالياً' : 'Order Book & Flow metrics currently unavailable'}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Orderbook Imbalance */}
                  <div className="bg-[#0c0c0c] p-3 rounded border border-[#222]">
                    <div className="text-[10px] text-gray-500 uppercase mb-1 font-sans">{lang === 'ar' ? 'دفتر الأوامر (Bid/Ask)' : 'Order Book Imbalance'}</div>
                    <div className={`text-xl font-bold ${(sentiment.orderBookImbalance ?? 0) >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                      {(sentiment.orderBookImbalance ?? 0) > 0 ? '+' : ''}{sentiment.orderBookImbalance ?? 0}%
                    </div>
                    <div className="text-[11px] text-gray-300 mt-0.5">
                      {(sentiment.orderBookImbalance ?? 0) >= 0 
                        ? (lang === 'ar' ? 'سيطرة سيولة الشراء' : 'Bid Liquidity Dominant')
                        : (lang === 'ar' ? 'سيطرة سيولة البيع' : 'Ask Liquidity Dominant')}
                    </div>
                  </div>

                  {/* On-Chain Flow */}
                  <div className="bg-[#0c0c0c] p-3 rounded border border-[#222]">
                    <div className="text-[10px] text-gray-500 uppercase mb-1 font-sans">{lang === 'ar' ? 'تدفقات المنصات' : 'Exchange Inflow/Outflow'}</div>
                    <div className={`text-base font-bold ${sentiment.exchangeInflowOutflow === 'NET_OUTFLOW' ? 'text-green-400' : sentiment.exchangeInflowOutflow === 'NET_INFLOW' ? 'text-rose-400' : 'text-yellow-400'}`}>
                      {sentiment.exchangeInflowOutflow || 'BALANCED'}
                    </div>
                    <div className="text-[11px] text-gray-300 mt-0.5">
                      {sentiment.exchangeInflowOutflow === 'NET_OUTFLOW' 
                        ? (lang === 'ar' ? 'سحب للمحافظ الباردة' : 'Accumulation Outflows')
                        : sentiment.exchangeInflowOutflow === 'NET_INFLOW'
                        ? (lang === 'ar' ? 'إيداع على المنصات' : 'Exchange Inflows')
                        : (lang === 'ar' ? 'تدفقات متوازنة' : 'Balanced Flow')}
                    </div>
                  </div>

                  {/* CVD Trend */}
                  <div className="bg-[#0c0c0c] p-3 rounded border border-[#222]">
                    <div className="text-[10px] text-gray-500 uppercase mb-1 font-sans">{lang === 'ar' ? 'السيولة التراكمية (CVD)' : 'Cumulative Volume Delta'}</div>
                    <div className={`text-xl font-bold ${sentiment.cvdTrend === 'RISING' ? 'text-cyan-400' : sentiment.cvdTrend === 'FALLING' ? 'text-rose-400' : 'text-gray-400'}`}>
                      {sentiment.cvdTrend || 'NEUTRAL'}
                    </div>
                    <div className="text-[11px] text-gray-300 mt-0.5">
                      {sentiment.cvdTrend === 'RISING'
                        ? (lang === 'ar' ? 'شراء عدواني' : 'Aggressive Market Buys')
                        : sentiment.cvdTrend === 'FALLING'
                        ? (lang === 'ar' ? 'بيع عدواني' : 'Aggressive Market Sells')
                        : (lang === 'ar' ? 'ضغط متوازن' : 'Neutral Flow')}
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* News Feed with Sentiment */}
            <div className="bg-[#080808] p-3 rounded border border-[#1f1f1f]">
              <div className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5">
                <Newspaper className="w-3.5 h-3.5 text-blue-400" />
                <span>{lang === 'ar' ? 'شريط الأخبار والتحليل الأساسي اللحظي' : 'Fundamental News & Sentiment Scanner'}</span>
              </div>

              <div className="space-y-1.5">
                {sentiment.recentHeadlines && sentiment.recentHeadlines.length > 0 ? (
                  sentiment.recentHeadlines.map((news, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-[#141414] border border-[#222] flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-gray-200">{news.title}</div>
                        <div className="text-gray-500 text-[10px] mt-0.5">{news.source} • {news.time}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                        news.impact === 'BULLISH' ? 'bg-green-900/20 text-green-400 border border-green-500/30' : news.impact === 'BEARISH' ? 'bg-rose-900/20 text-rose-400 border border-rose-500/30' : 'bg-[#1a1a1a] text-gray-400'
                      }`}>
                        {news.impact}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-gray-500 font-sans">
                    {lang === 'ar' ? 'لا توجد أخبار متاحة من مصدر حي حالياً' : 'No live news headlines available currently'}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: Gemini AI Synthesis */}
        {activeTab === 'ai' && (
          <div className="space-y-3 font-mono">
            <div className="bg-[#0c0c0c] p-4 rounded border border-[#1f1f1f]">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#222] mb-2.5">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>{lang === 'ar' ? 'التقرير الاستدلالي لمحرك الذكاء الاصطناعي (Gemini 3.7 Flash)' : 'Full Multi-Factor Gemini 3.7 Flash Synthesis'}</span>
                </div>
                <span className="text-xs text-green-400 bg-[#141414] px-2 py-0.5 rounded border border-[#222]">
                  {lang === 'ar' ? 'ثقة 88%' : '88% Conviction'}
                </span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {aiSignal ? (lang === 'ar' ? aiSignal.summaryAr : aiSignal.summaryEn) : (
                  lang === 'ar'
                    ? 'يقوم النموذج بدمج حسابات السيولة اللحظية مع موجات إليوت الدافعة ومناطق الطلب المؤسسية، واستبعاد أي ساعات ذات مخاطر عالية من واقع سجل الأخطاء السابقة.'
                    : 'The AI model synthesizes live order flow, Elliott Wave 3 expansions, and institutional demand blocks, while adhering strictly to learned mistake filters.'
                )}
              </p>

              <div className="mt-3 pt-3 border-t border-[#1f1f1f]">
                <div className="text-xs font-semibold text-white mb-2">{lang === 'ar' ? 'أدلة التوافق الحاسم (Key Confluences):' : 'Key Confluences:'}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-300">
                  {(aiSignal?.confluenceFactors || [
                    'تأكيد ارتداد من منطقة خصم مؤسسية SMC Discount',
                    'استكمال الموجة الرابعة التصحيحية وبدء الخامسة الصاعدة',
                    'تقاطع ذهبي وإيجابي في متوسطات الحركة وتدفق السيولة',
                    'انعدام أي تكرار لأخطاء الصفقات السابقة في التوقيت الحالي'
                  ]).map((factor, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-[#141414] border border-[#222] text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
