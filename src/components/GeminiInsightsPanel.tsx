import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  Award,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Clock,
  Zap,
  Target,
  Copy,
  Check,
  BarChart3,
  Cpu,
  Flame,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import { SupportedAsset } from '../types';

export interface ActionableInsightData {
  executiveSummaryAr: string;
  executiveSummaryEn: string;
  overallQualityScore: number;
  successDrivers: Array<{
    titleAr: string;
    titleEn: string;
    detailAr: string;
    detailEn: string;
    impact: string;
  }>;
  drawdownFactors: Array<{
    titleAr: string;
    titleEn: string;
    detailAr: string;
    detailEn: string;
    preventionAr?: string;
  }>;
  volatilityImpactAnalysis: {
    summaryAr: string;
    summaryEn: string;
    atrLevel: string;
    liquiditySweepObservationAr: string;
    sessionVolatilityNotesAr: string;
  };
  actionableLessons: Array<{
    category: 'RISK_MANAGEMENT' | 'ENTRY_TIMING' | 'VOLATILITY_BUFFER' | 'MACRO_CONFLUENCE';
    lessonAr: string;
    lessonEn: string;
    ruleAr: string;
    ruleEn: string;
  }>;
  optimalExecutionTips: {
    recommendedHoursAr: string;
    bannedHoursAr: string;
    recommendedStopLossBuffer: string;
    minimumConvictionThreshold: number;
  };
  modelUsed: string;
  timestamp: number;
  evaluatedSignalsCount: number;
  asset: string;
}

interface GeminiInsightsPanelProps {
  lang: 'ar' | 'en';
  currentAsset: SupportedAsset;
}

export const GeminiInsightsPanel: React.FC<GeminiInsightsPanelProps> = ({
  lang,
  currentAsset,
}) => {
  const [insights, setInsights] = useState<ActionableInsightData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>(currentAsset);
  const [copied, setCopied] = useState(false);

  // Sync with prop when prop changes
  useEffect(() => {
    setSelectedAssetFilter(currentAsset);
  }, [currentAsset]);

  const fetchInsights = useCallback(async (assetToQuery: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/gemini/actionable-insights?asset=${assetToQuery}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const json = await response.json();
      if (json.success && json.data) {
        setInsights(json.data);
      } else {
        throw new Error(json.error || 'Failed to parse AI insights');
      }
    } catch (err: any) {
      console.error('Failed to load Gemini actionable insights:', err);
      setError(
        lang === 'ar'
          ? 'تعذر جلب التحليل الفوري، يرجى المحاولة مجدداً.'
          : 'Failed to retrieve real-time insights, please retry.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchInsights(selectedAssetFilter);
  }, [fetchInsights, selectedAssetFilter]);

  const handleCopyReport = () => {
    if (!insights) return;
    const reportText = `🧠 [EYAD Trading - Gemini Flash 3.8 Actionable Insights Report]
📌 Asset: ${insights.asset} | Quality Score: ${insights.overallQualityScore}/100
🤖 Model: ${insights.modelUsed}
⏰ Generated: ${new Date(insights.timestamp).toLocaleString()}

📋 EXECUTIVE VERDICT:
${lang === 'ar' ? insights.executiveSummaryAr : insights.executiveSummaryEn}

✅ SUCCESS DRIVERS:
${insights.successDrivers.map((d, i) => `${i + 1}. ${lang === 'ar' ? d.titleAr : d.titleEn}\n   ${lang === 'ar' ? d.detailAr : d.detailEn}`).join('\n')}

🛡️ DRAWDOWN PREVENTION & EXIT FACTORS:
${insights.drawdownFactors.map((d, i) => `${i + 1}. ${lang === 'ar' ? d.titleAr : d.titleEn}\n   ${lang === 'ar' ? d.detailAr : d.detailEn}`).join('\n')}

🌊 HISTORICAL VOLATILITY IMPACT:
${lang === 'ar' ? insights.volatilityImpactAnalysis.summaryAr : insights.volatilityImpactAnalysis.summaryEn}
• Liquidity Sweeps: ${insights.volatilityImpactAnalysis.liquiditySweepObservationAr}
• Session Spikes: ${insights.volatilityImpactAnalysis.sessionVolatilityNotesAr}

💡 ACTIONABLE RULES & LESSONS:
${insights.actionableLessons.map((l, i) => `[${l.category}] ${lang === 'ar' ? l.ruleAr : l.ruleEn}`).join('\n')}

🎯 EXECUTION PROTOCOL:
• Best Hours: ${insights.optimalExecutionTips.recommendedHoursAr}
• Blackout Hours: ${insights.optimalExecutionTips.bannedHoursAr}
• Recommended SL Buffer: ${insights.optimalExecutionTips.recommendedStopLossBuffer}
• Min Conviction: ${insights.optimalExecutionTips.minimumConvictionThreshold}%`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'ENTRY_TIMING':
        return lang === 'ar' ? 'توقيت واقتناص الدخول' : 'Entry Timing';
      case 'VOLATILITY_BUFFER':
        return lang === 'ar' ? 'هامش تقلبات السعر' : 'Volatility Buffer';
      case 'RISK_MANAGEMENT':
        return lang === 'ar' ? 'إدارة المخاطر وتأمين المكاسب' : 'Risk Management';
      case 'MACRO_CONFLUENCE':
        return lang === 'ar' ? 'توافق السيولة الكلية' : 'Macro Confluence';
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ENTRY_TIMING':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
      case 'VOLATILITY_BUFFER':
        return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
      case 'RISK_MANAGEMENT':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
      case 'MACRO_CONFLUENCE':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
      default:
        return 'border-gray-500/30 bg-gray-500/10 text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#0d1117] via-[#0f141c] to-[#0d1117] border border-blue-500/20 rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Gemini Flash 3.8</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                {lang === 'ar' ? 'تحليل تدقيق استرجاعي' : 'Retrospective Trade Audit'}
              </span>
              {insights?.evaluatedSignalsCount ? (
                <span className="text-[11px] font-mono text-gray-400">
                  {lang === 'ar' ? `فحص ${insights.evaluatedSignalsCount} إشارة سابقة` : `Audited ${insights.evaluatedSignalsCount} signals`}
                </span>
              ) : null}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <span>
                {lang === 'ar'
                  ? 'أداة الدروس المستفادة والتحليل النوعي للصفقات (Gemini 3.8 Flash)'
                  : 'Gemini Flash 3.8 Actionable Insights & Retrospective Engine'}
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-gray-400 max-w-3xl leading-relaxed">
              {lang === 'ar'
                ? 'استخلاص الدروس النوعية وتفسير نجاح صفقات الشراء والتراكم وأسباب الخروج الدفاعي، مع تفكيك أثر تقلبات السوق التاريخية (ATR وسحب السيولة) على أداء الإشارات.'
                : 'Extract actionable lessons, explain why buy accumulation signals succeeded or defensive liquidation was executed, and analyze historical market volatility (ATR & liquidity sweeps).'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Asset Selector */}
            <div className="flex items-center gap-1 bg-black/40 border border-[#262626] rounded-lg p-1">
              {(['BTC', 'ETH', 'PAXG', 'ALL'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setSelectedAssetFilter(a)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    selectedAssetFilter === a
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopyReport}
              disabled={!insights}
              className="px-3 py-1.5 rounded-lg border border-[#2a2a2a] bg-[#141414] hover:bg-[#1a1a1a] text-gray-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
              <span>{copied ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ التقرير' : 'Copy Report')}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchInsights(selectedAssetFilter)}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{lang === 'ar' ? 'تحديث التحليل' : 'Re-run Analysis'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
          <div className="space-y-1">
            <div className="font-bold">{lang === 'ar' ? 'تنبيه النظام' : 'System Notice'}</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Loading Skeleton or Content */}
      {isLoading && !insights ? (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
          <div className="text-white font-bold text-sm">
            {lang === 'ar'
              ? 'جاري تشغيل محرك Gemini Flash 3.8 وتدقيق سجل الصفقات التاريخي...'
              : 'Synthesizing trade logs and historical volatility with Gemini Flash 3.8...'}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            Analyzing Smart Money order blocks, ATR distributions, and liquidity dynamics...
          </div>
        </div>
      ) : insights ? (
        <div className="space-y-4">
          {/* Executive Verdict + Quality Score Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-mono uppercase tracking-wider text-gray-400 font-bold">
                    {lang === 'ar' ? 'الخلاصة التنفيذية والتقييم النوعي' : 'Executive Retrospective Verdict'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-gray-500">
                  {insights.timestamp ? new Date(insights.timestamp).toLocaleTimeString() : '--'}
                </div>
              </div>

              <div className="text-sm leading-relaxed text-gray-200 bg-[#0d0d0f] border border-[#222] rounded-lg p-3.5">
                {lang === 'ar' ? insights.executiveSummaryAr : insights.executiveSummaryEn}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>Model:</span>
                  <span className="text-white font-bold">{insights.modelUsed}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Target Asset:</span>
                  <span className="text-white font-bold">{insights.asset}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Signals Tested:</span>
                  <span className="text-white font-bold">{insights.evaluatedSignalsCount}</span>
                </div>
              </div>
            </div>

            {/* Quality Score Gauge Card */}
            <div className="lg:col-span-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-gray-400 font-bold mb-1">
                  {lang === 'ar' ? 'مؤشر جودة الإشارات' : 'Signal Quality Index'}
                </div>
                <div className="text-[11px] text-gray-500">
                  {lang === 'ar'
                    ? 'تقييم توافق الدخول مع هيكل السوق وإدارة المخاطر'
                    : 'Execution compliance & risk-reward integrity'}
                </div>
              </div>

              <div className="flex items-center justify-center py-2">
                <div className="relative flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                        {insights.overallQualityScore}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase">/ 100 Score</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2.5 text-center">
                <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {insights.overallQualityScore >= 90
                      ? (lang === 'ar' ? 'انضباط مؤسسي استثنائي' : 'Institutional Grade Compliance')
                      : (lang === 'ar' ? 'أداء منضبط ومقبول' : 'Disciplined Execution')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dual Columns: Why Signals Succeeded vs Why Drawdown/Exits Occurred */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Why Buy Signals Succeeded */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {lang === 'ar' ? 'لماذا نجحت إشارات الشراء والتراكم؟' : 'Why Accumulation Signals Succeeded'}
                    </h3>
                    <div className="text-[11px] text-gray-400">
                      {lang === 'ar' ? 'عوامل الدخول الموفقة وتطابق المفاهيم المؤسسية' : 'SMC confluence & high-probability mechanics'}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  {insights.successDrivers.length} {lang === 'ar' ? 'عوامل نجاح' : 'Drivers'}
                </span>
              </div>

              <div className="space-y-3">
                {insights.successDrivers.map((driver, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3.5 space-y-1.5 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs sm:text-sm text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>{lang === 'ar' ? driver.titleAr : driver.titleEn}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                        {driver.impact}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed pl-5">
                      {lang === 'ar' ? driver.detailAr : driver.detailEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Defensive Exits Occurred */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {lang === 'ar' ? 'أسباب الخروج الدفاعي وتفادي الخسائر' : 'Defensive Exits & Drawdown Prevention'}
                    </h3>
                    <div className="text-[11px] text-gray-400">
                      {lang === 'ar' ? 'كيف حمت إشارات الخروج المحفظة من الهبوط؟' : 'How capital preservation sidestepped traps'}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  {insights.drawdownFactors.length} {lang === 'ar' ? 'عوامل دفاعية' : 'Factors'}
                </span>
              </div>

              <div className="space-y-3">
                {insights.drawdownFactors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3.5 space-y-2 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="font-bold text-xs sm:text-sm text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>{lang === 'ar' ? factor.titleAr : factor.titleEn}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed pl-5">
                      {lang === 'ar' ? factor.detailAr : factor.detailEn}
                    </p>
                    {factor.preventionAr && (
                      <div className="ml-5 mt-1 text-[11px] bg-black/40 rounded p-2 border border-amber-500/20 text-amber-200/90 font-mono">
                        <span className="text-amber-400 font-bold">{lang === 'ar' ? 'الإجراء الوقائي: ' : 'Preventative Rule: '}</span>
                        {factor.preventionAr}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Historical Market Volatility Analysis */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {lang === 'ar' ? 'تحليل تأثير تقلبات السوق التاريخية (Volatility & Liquidity Dynamics)' : 'Historical Market Volatility Impact'}
                  </h3>
                  <div className="text-[11px] text-gray-400">
                    {lang === 'ar' ? 'تفاعل الصفقات مع مؤشر ATR، سحب السيولة الوهمي، وجلسات افتتاح نيويورك' : 'Interaction with ATR ranges, liquidity sweeps, and session opens'}
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300">
                ATR: {insights.volatilityImpactAnalysis.atrLevel}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-[#222] bg-[#0c0c0e] p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>{lang === 'ar' ? 'طبيعة التذبذب الحالي' : 'Volatility Regime'}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {lang === 'ar' ? insights.volatilityImpactAnalysis.summaryAr : insights.volatilityImpactAnalysis.summaryEn}
                </p>
              </div>

              <div className="rounded-lg border border-[#222] bg-[#0c0c0e] p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>{lang === 'ar' ? 'سحب السيولة ومصائد القيعان' : 'Liquidity Sweep Patterns'}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {insights.volatilityImpactAnalysis.liquiditySweepObservationAr}
                </p>
              </div>

              <div className="rounded-lg border border-[#222] bg-[#0c0c0e] p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ar' ? 'تقلبات الجلسات (ساعات الحظر)' : 'Session Volatility'}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {insights.volatilityImpactAnalysis.sessionVolatilityNotesAr}
                </p>
              </div>
            </div>
          </div>

          {/* Actionable Lessons & Tactical Rules (الدروس المستفادة) */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {lang === 'ar' ? 'الدروس المستفادة والقواعد التنفيذية (Actionable Rules)' : 'Actionable Lessons & Tactical Rules'}
                  </h3>
                  <div className="text-[11px] text-gray-400">
                    {lang === 'ar' ? 'قواعد إجرائية مستخلصة للحد من الأخطاء وتعظيم نسبة النجاح' : 'Systematic rules extracted to prevent recurrence and boost edge'}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono text-gray-400">
                {insights.actionableLessons.length} {lang === 'ar' ? 'قواعد معتمدة' : 'Rules'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {insights.actionableLessons.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[#222] bg-[#0c0c0e] p-4 space-y-2.5 hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getCategoryColor(
                        item.category
                      )}`}
                    >
                      {getCategoryLabel(item.category)}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500">#{idx + 1}</span>
                  </div>

                  <div className="text-xs text-gray-200 leading-relaxed">
                    <span className="text-gray-400 font-bold block mb-1">
                      {lang === 'ar' ? 'الدرس المستفاد:' : 'Extracted Lesson:'}
                    </span>
                    {lang === 'ar' ? item.lessonAr : item.lessonEn}
                  </div>

                  <div className="rounded-lg bg-black/50 border border-[#2a2a2a] p-3 text-xs text-emerald-300 font-mono">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 mb-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'القاعدة الذهبية المعتمدة:' : 'Enforced Golden Rule:'}</span>
                    </div>
                    <div>{lang === 'ar' ? item.ruleAr : item.ruleEn}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimal Execution Protocol Card */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#1f1f1f] pb-3">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                {lang === 'ar' ? 'بروتوكول شروط التنفيذ المثلى للمتداول' : 'Optimal Execution & Timing Protocol'}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="rounded-lg border border-[#222] bg-[#0c0c0e] p-3">
                <div className="text-gray-500 mb-1">{lang === 'ar' ? 'الساعات المفضلة للتداول' : 'Optimal Hours'}</div>
                <div className="text-emerald-300 font-bold leading-tight">
                  {insights.optimalExecutionTips.recommendedHoursAr}
                </div>
              </div>

              <div className="rounded-lg border border-[#222] bg-[#0c0c0e] p-3">
                <div className="text-gray-500 mb-1">{lang === 'ar' ? 'ساعات الحظر والتذبذب' : 'Blackout Hours'}</div>
                <div className="text-rose-300 font-bold leading-tight">
                  {insights.optimalExecutionTips.bannedHoursAr}
                </div>
              </div>

              <div className="rounded-lg border border-[#222] bg-[#0c0c0e] p-3">
                <div className="text-gray-500 mb-1">{lang === 'ar' ? 'هامش وقف الخسارة الموصى به' : 'Recommended SL Buffer'}</div>
                <div className="text-blue-300 font-bold leading-tight">
                  {insights.optimalExecutionTips.recommendedStopLossBuffer}
                </div>
              </div>

              <div className="rounded-lg border border-[#222] bg-[#0c0c0e] p-3">
                <div className="text-gray-500 mb-1">{lang === 'ar' ? 'أدنى ثقة مطلوبة للدخول' : 'Min Conviction Gate'}</div>
                <div className="text-white text-base font-bold">
                  {insights.optimalExecutionTips.minimumConvictionThreshold}%
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
