import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Filter,
  Flame,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { LearningState, TradeRecord } from '../types';
import { GeminiLessonsLearnedCard } from './GeminiLessonsLearnedCard';

interface SelfLearningJournalProps {
  learningState: LearningState;
  trades: TradeRecord[];
  paperTrades?: any[];
  currentAsset?: string;
  lang: 'ar' | 'en';
  onTriggerAILearning: () => void;
  isLearning: boolean;
  onApplyAdaptiveRule?: (rule: any) => void;
  onApplyBannedHours?: (hours: number[]) => void;
}

export const SelfLearningJournal: React.FC<SelfLearningJournalProps> = ({
  learningState,
  trades,
  paperTrades = [],
  currentAsset = 'BTC',
  lang,
  onTriggerAILearning,
  isLearning,
  onApplyAdaptiveRule,
  onApplyBannedHours,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'LOSSES' | 'WINS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrades = trades.filter((t) => {
    if (filterType === 'LOSSES' && t.status !== 'CLOSED_LOSS') return false;
    if (filterType === 'WINS' && t.status !== 'CLOSED_WIN') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCause = (t.lossRootCause || '').toLowerCase().includes(q);
      const matchDate = t.dateFormatted.includes(q);
      return matchCause || matchDate;
    }
    return true;
  });

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4 space-y-4 font-mono">
      
      {/* Top Header: AI Brain & Learning Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#1f1f1f]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {lang === 'ar' ? 'نظام التعلم الذاتي وتسجيل الأخطاء والصفقات' : 'AI Self-Learning & Mistake Memory Engine'}
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5 font-sans">
                {lang === 'ar'
                  ? 'تسجيل دقيق لتوقيت كل صفقة (الساعة كام واليوم) وتحليل أسباب الخسارة لمنع تكرارها آلياً'
                  : 'Logs exact trade hours, root causes of loss, and updates adaptive filter rules'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onTriggerAILearning}
          disabled={isLearning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold border border-blue-400/40 transition-all active:scale-95 disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isLearning ? 'animate-spin' : ''}`} />
          <span>{isLearning ? (lang === 'ar' ? 'جاري تدقيق الخسائر...' : 'Learning...') : (lang === 'ar' ? 'تفعيل دورة تعلم الذكاء' : 'Trigger AI Learning Cycle')}</span>
        </button>
      </div>

      {/* DEDICATED CARD: Gemini Flash 3.8 Trade History Deep Analyzer & Lessons Learned */}
      <GeminiLessonsLearnedCard
        trades={trades}
        paperTrades={paperTrades}
        currentAsset={currentAsset}
        lang={lang}
        onApplyAdaptiveRule={onApplyAdaptiveRule}
        onApplyBannedHours={onApplyBannedHours}
      />

      {/* 24-Hour Win/Loss Heatmap Matrix (كانت الساعة كام؟) */}
      <div className="bg-[#0c0c0c] p-3 rounded border border-[#222] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{lang === 'ar' ? 'مصفوفة أداء الساعات على مدار اليوم (24-Hour UTC Matrix)' : '24-Hour Performance Matrix (UTC)'}</span>
          </div>
          <span className="text-[10px] text-gray-500">
            {lang === 'ar' ? 'تحديد الساعات عالية الخسارة لمنع الدخول فيها' : 'Pinpointing loss-prone market hours'}
          </span>
        </div>

        {/* 24 Hour blocks */}
        <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1 text-center">
          {Array.from({ length: 24 }).map((_, h) => {
            const stat = learningState.hourlyLossMap[h] || { wins: 0, losses: 0, winRate: 100 };
            const isBanned = learningState.bannedTradingHours.includes(h);
            const total = stat.wins + stat.losses;

            let bgColor = 'bg-[#141414] border-[#222] text-gray-500';
            if (total > 0) {
              if (isBanned || stat.winRate < 50) {
                bgColor = 'bg-red-950/40 border-red-500/40 text-red-300 font-bold';
              } else if (stat.winRate >= 75) {
                bgColor = 'bg-green-950/40 border-green-500/40 text-green-300';
              } else {
                bgColor = 'bg-[#1a1a1a] border-[#333] text-gray-200';
              }
            }

            return (
              <div
                key={h}
                className={`p-1 rounded border text-[9px] transition-all hover:scale-105 cursor-default ${bgColor}`}
                title={`Hour ${h}:00 UTC - Win Rate: ${stat.winRate}% (${stat.wins}W / ${stat.losses}L)`}
              >
                <div className="text-[8px] text-gray-400">{h}:00</div>
                <div className="font-bold mt-0.5">{total > 0 ? `${stat.winRate}%` : '-'}</div>
                {isBanned && <div className="text-[8px] text-red-400 mt-0.5">⚠️ حظر</div>}
              </div>
            );
          })}
        </div>

        {/* Banned Hours Alert Bar */}
        {learningState.bannedTradingHours.length > 0 && (
          <div className="p-2.5 rounded bg-yellow-950/20 border border-yellow-500/30 text-xs text-yellow-300 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-yellow-200">{lang === 'ar' ? 'الساعات المحظورة آلياً بواسطة نظام التعلم: ' : 'AI Throttled Simulation Hours: '}</strong>
              <span>
                {learningState.bannedTradingHours.map((h) => `${h}:00 UTC`).join(' و ')}
              </span>
              <p className="text-[10px] text-yellow-400/80 mt-0.5 font-sans">
                {lang === 'ar'
                  ? 'تم استنتاج أن هذه الأوقات تتزامن مع تذبذب عنيف وافتتاح جلسات تداول عالية المخاطر تؤدي إلى اختراقات وهمية، لذلك يمنع المحاكي تتبع أي إشارات فيها.'
                  : 'Isolated as high-volatility session opens with frequent false breakouts. Signal simulation throttled.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Active Adaptive Rules from AI Memory */}
      <div className="bg-[#080808] p-3 rounded border border-[#1f1f1f] space-y-2.5">
        <div className="text-xs font-bold text-white flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>{lang === 'ar' ? 'القواعد التكيفية النشطة (المستخرجة من الأخطاء السابقة)' : 'Active Adaptive Rules (Learned from Past Errors)'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {learningState.adaptiveRules.map((rule) => (
            <div key={rule.id} className="p-2.5 rounded bg-[#141414] border border-[#222] flex items-start gap-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-gray-200 leading-snug">
                  {lang === 'ar' ? rule.ruleAr : rule.ruleEn}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1.5">
                  <span className="text-blue-400 bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#333]">
                    {rule.triggerCondition}
                  </span>
                  <span className={rule.confidenceAdjustment >= 0 ? 'text-green-400' : 'text-red-400'}>
                    تعديل الثقة: {rule.confidenceAdjustment >= 0 ? '+' : ''}{rule.confidenceAdjustment}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Journal List & Loss Root-Cause Breakdown */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{lang === 'ar' ? 'سجل الصفقات مع تحليل أسباب الخسارة وتوقيتها' : 'Trade Journal & Loss Cause Log'}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#050505] p-1 rounded border border-[#1f1f1f] text-xs">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-0.5 rounded font-bold ${filterType === 'ALL' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {lang === 'ar' ? 'الكل' : 'All'}
              </button>
              <button
                onClick={() => setFilterType('LOSSES')}
                className={`px-2.5 py-0.5 rounded font-bold ${filterType === 'LOSSES' ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                {lang === 'ar' ? 'الخاسرة فقط' : 'Losses Only'}
              </button>
              <button
                onClick={() => setFilterType('WINS')}
                className={`px-2.5 py-0.5 rounded font-bold ${filterType === 'WINS' ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'text-gray-400 hover:text-white'}`}
              >
                {lang === 'ar' ? 'الرابحة فقط' : 'Wins Only'}
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث بالسبب أو التاريخ...' : 'Search cause or date...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2.5 py-1 rounded bg-[#050505] border border-[#222] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full sm:w-44"
            />
          </div>
        </div>

        {/* Trade Cards List */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {filteredTrades.map((t) => {
            const isWin = t.status === 'CLOSED_WIN';
            return (
              <div
                key={t.id}
                className={`p-2.5 rounded border transition-all ${
                  isWin ? 'bg-[#0c0c0c] border-[#222]' : 'bg-red-950/10 border-red-500/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded ${isWin ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                      {isWin ? <CheckCircle2 className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-200 flex items-center gap-2">
                        <span>{t.dateFormatted}</span>
                        <span className="text-cyan-400">({t.hourOfDay}:00 UTC)</span>
                        <span className="text-gray-500">• {t.dayOfWeek}</span>
                        <span className="px-1.5 py-0.2 bg-[#141414] text-gray-300 rounded text-[9px] border border-[#222]">
                          SPOT
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        دخول: ${t.entryPrice.toLocaleString()} ➔ خروج: ${(t.exitPrice || t.entryPrice).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* PnL Tag */}
                  <div className="text-right">
                    <div className={`text-xs font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                      {isWin ? '+' : ''}{t.pnlPercent}% (${t.pnlUsd >= 0 ? '+' : ''}{t.pnlUsd})
                    </div>
                    <div className="text-[9px] text-gray-500">{t.durationHours} {lang === 'ar' ? 'ساعة' : 'hours'}</div>
                  </div>
                </div>

                {/* Loss Root Cause & AI Lesson Box */}
                {!isWin && t.lossRootCause && (
                  <div className="mt-2 pt-2 border-t border-red-900/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="text-red-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-red-200">{lang === 'ar' ? 'سبب الخسارة: ' : 'Root Cause: '}</strong>
                        {t.lossRootCause}
                      </span>
                    </div>

                    {t.learnedLessonAr && (
                      <div className="text-[10px] text-blue-300 bg-[#141414] px-2 py-0.5 rounded border border-[#333]">
                        {lang === 'ar' ? t.learnedLessonAr : t.learnedLessonEn}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
