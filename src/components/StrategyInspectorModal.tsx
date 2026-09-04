import React, { useState } from 'react';
import { 
  X, 
  Code2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Layers, 
  BrainCircuit, 
  ChevronRight, 
  Award,
  Zap
} from 'lucide-react';
import { 
  GENERAL_RULES, 
  ENTRY_QUALITY, 
  INDICATORS, 
  RISK_MANAGEMENT, 
  PROTECTION_LAYERS, 
  WHALE_TRACKING, 
  NEWS_FILTER, 
  SELF_LEARNING, 
  EXPECTED_PERFORMANCE, 
  CRON_SCHEDULE, 
  GOLDEN_RULES_LIST,
  GOLDEN_RULE
} from '../utils/tradingStrategy';

interface StrategyInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export function StrategyInspectorModal({ isOpen, onClose, lang }: StrategyInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'code' | 'protection' | 'performance'>('rules');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const rawStrategyCode = `/**
 * ══════════════════════════════════════════════════════════════
 * 🤖 EYAD Research — Multi-Asset Research Strategy
 * ══════════════════════════════════════════════════════════════
 * 
 * ده ملف الاستراتيجية الكامل — كل قواعد التداول في مكان واحد
 * آخر تحديث: August 2026
 * 
 * الأصول: BTC, ETH, PAXG
 * ══════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════════
// 📋 القواعد العامة
// ══════════════════════════════════════════════════════════════

const GENERAL_RULES = ${JSON.stringify(GENERAL_RULES, null, 2)};

// ══════════════════════════════════════════════════════════════
// 🔍 فلتر جودة الدخول (Entry Quality Gate)
// ══════════════════════════════════════════════════════════════

const ENTRY_QUALITY = ${JSON.stringify(ENTRY_QUALITY, null, 2)};

// ══════════════════════════════════════════════════════════════
// 📊 المؤشرات الفنية المستخدمة
// ══════════════════════════════════════════════════════════════

const INDICATORS = ${JSON.stringify(INDICATORS, null, 2)};

// ══════════════════════════════════════════════════════════════
// 🛑 إدارة المخاطر (Risk Management)
// ══════════════════════════════════════════════════════════════

const RISK_MANAGEMENT = ${JSON.stringify(RISK_MANAGEMENT, null, 2)};

// ══════════════════════════════════════════════════════════════
// 🧠 طبقات الحماية (Protection Layers)
// ══════════════════════════════════════════════════════════════

const PROTECTION_LAYERS = ${JSON.stringify(PROTECTION_LAYERS.map(p => ({ name: p.name, description: p.description })), null, 2)};

// ══════════════════════════════════════════════════════════════
// 🐋 تتبع الحيتان
// ══════════════════════════════════════════════════════════════

const WHALE_TRACKING = ${JSON.stringify(WHALE_TRACKING, null, 2)};

// ══════════════════════════════════════════════════════════════
// 📰 فلتر الأخبار
// ══════════════════════════════════════════════════════════════

const NEWS_FILTER = ${JSON.stringify(NEWS_FILTER, null, 2)};

// ══════════════════════════════════════════════════════════════
// 🧠 التعلم الذاتي
// ══════════════════════════════════════════════════════════════

const SELF_LEARNING = ${JSON.stringify(SELF_LEARNING, null, 2)};

// ══════════════════════════════════════════════════════════════
// 📈 الأداء المتوقع (Backtest 60 يوم)
// ══════════════════════════════════════════════════════════════

const EXPECTED_PERFORMANCE = ${JSON.stringify(EXPECTED_PERFORMANCE, null, 2)};

// ══════════════════════════════════════════════════════════════
// 🔄 تكرار الكرون
// ══════════════════════════════════════════════════════════════

const CRON_SCHEDULE = ${JSON.stringify(CRON_SCHEDULE, null, 2)};

// ══════════════════════════════════════════════════════════════
// 🎯 القاعدة الذهبية
// ══════════════════════════════════════════════════════════════

const GOLDEN_RULE = \`${GOLDEN_RULE}\`;

export {
  GENERAL_RULES,
  ENTRY_QUALITY,
  INDICATORS,
  RISK_MANAGEMENT,
  PROTECTION_LAYERS,
  WHALE_TRACKING,
  NEWS_FILTER,
  SELF_LEARNING,
  EXPECTED_PERFORMANCE,
  CRON_SCHEDULE,
  GOLDEN_RULE,
};`;

  const copyCode = () => {
    navigator.clipboard.writeText(rawStrategyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🤖 EYAD BTC — Research Strategy</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Single File</span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'ملف الاستراتيجية الموحد — جميع قواعد التحليل في مكان واحد' : 'Unified Strategy Specification — All analysis rules in one place'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'rules'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'القواعد الذهبية العشر' : '10 Golden Rules'}</span>
          </button>

          <button
            onClick={() => setActiveTab('protection')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'protection'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'طبقات الحماية (8 Layers)' : '8 Protection Layers'}</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'performance'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'نتائج المحاكاة والأصول' : 'Assets & Simulation'}</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'code'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'كود الاستراتيجية الكامل' : 'Strategy Code'}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
          {/* TAB 1: 10 GOLDEN RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-950/30 to-amber-900/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  {lang === 'ar' 
                    ? 'القواعد الذهبية هي الدستور الصارم لمحرك المحاكاة. لا يتم رصد أي سيناريو إلا بالامتثال الحرفي لهذه القواعد.'
                    : 'The 10 Golden Rules represent the strict constitution of EYAD.BOT simulation engine.'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {GOLDEN_RULES_LIST.map((rule) => (
                  <div 
                    key={rule.num}
                    className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-amber-500/40 transition-all flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {rule.num}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-slate-200">{lang === 'ar' ? rule.textAr : rule.textEn}</div>
                      <div className="text-slate-400 text-[11px]">{lang === 'ar' ? rule.textEn : rule.textAr}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Entry Quality Gate Summary */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {lang === 'ar' ? 'بوابة جودة الدخول (Entry Quality Gate)' : 'Entry Quality Gate Specification'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Threshold ≥ 75 pts
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'قرب EMA21' : 'Near EMA21'}</div>
                    <div className="font-bold text-amber-400 text-sm">25 pts</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'شمعة رفض' : 'Rejection'}</div>
                    <div className="font-bold text-amber-400 text-sm">20 pts</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'تأكيد الحجم' : 'Volume Conf'}</div>
                    <div className="font-bold text-amber-400 text-sm">15 pts</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'توافق الاتجاه' : '4H/1D Trend'}</div>
                    <div className="font-bold text-amber-400 text-sm">20 pts</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'قوة الإشارة' : 'Signal (ADX)'}</div>
                    <div className="font-bold text-amber-400 text-sm">20 pts</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 8 PROTECTION LAYERS */}
          {activeTab === 'protection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PROTECTION_LAYERS.map((layer, index) => (
                  <div
                    key={layer.id}
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span>{layer.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Active</span>
                      </div>
                      <div className="text-slate-300 font-medium">{layer.nameAr}</div>
                      <div className="text-slate-400 text-[11px] leading-relaxed">{layer.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ATR Targets & Risk Matrix */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  {lang === 'ar' ? 'هيكلية إدارة المخاطر المستندة إلى ATR' : 'ATR-Based Risk & Target Architecture'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30">
                    <div className="text-rose-300 font-bold">{lang === 'ar' ? 'وقف الخسارة' : 'Stop Loss'}</div>
                    <div className="text-slate-200 mt-1">Price - 2 × ATR</div>
                    <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'حماية رأس المال' : 'Capital Safety'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                    <div className="text-emerald-300 font-bold">{lang === 'ar' ? 'الهدف الأول (TP1)' : 'Target 1 (TP1)'}</div>
                    <div className="text-slate-200 mt-1">Price + 4 × ATR</div>
                    <div className="text-[10px] text-emerald-400">{lang === 'ar' ? 'بيع 50% جزئياً' : 'Sell 50% Partial'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30">
                    <div className="text-cyan-300 font-bold">{lang === 'ar' ? 'الهدف الثاني (TP2)' : 'Target 2 (TP2)'}</div>
                    <div className="text-slate-200 mt-1">Price + 6×/8× ATR</div>
                    <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'إغلاق باقي الكمية' : 'Full Exit'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/30">
                    <div className="text-purple-300 font-bold">{lang === 'ar' ? 'وقف متحرك' : 'Trailing Stop'}</div>
                    <div className="text-slate-200 mt-1">2% Trailing</div>
                    <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'تفعيل بعد TP1' : 'Armed after TP1'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ASSETS & PERFORMANCE */}
          {activeTab === 'performance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(EXPECTED_PERFORMANCE).map(([assetKey, stats]) => (
                  <div 
                    key={assetKey}
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{assetKey} Spot</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 font-bold border border-rose-500/30">
                        {stats.return}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'ar' ? 'نسبة الفوز:' : 'Win Rate:'}</span>
                        <span className="font-bold text-slate-500">{stats.winRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'ar' ? 'متوسط مدة الصفقة:' : 'Avg Duration:'}</span>
                        <span className="font-bold text-slate-500">{stats.avgDuration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'ar' ? 'معامل شارب:' : 'Sharpe Ratio:'}</span>
                        <span className="font-bold text-slate-500">{stats.sharpe}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CRON Schedule Breakdown */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  {lang === 'ar' ? 'جدول المزامنة الآلي (Cron Schedule)' : 'Automated Cron Execution Schedule'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {Object.entries(CRON_SCHEDULE).map(([key, val]) => (
                    <div key={key} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">{key}</div>
                      <div className="font-bold text-slate-200 mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FULL RAW CODE */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {lang === 'ar' ? 'ملف الاستراتيجية الموحد — Single File Strategy Export' : 'Unified Strategy Code File'}
                </span>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الكود' : 'Copy Code')}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[400px]">
                {rawStrategyCode}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>EYAD.BOT Strategy • v2.6.0 (August 2026 Release)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
