import React from 'react';
import { Droplets, Gauge, Layers3, Waves, ArrowRightLeft, Activity } from 'lucide-react';
import { LiquidityRegimeScorecard as LiquidityRegimeData } from '../types';

interface Props {
  lang: 'ar' | 'en';
  scorecard: LiquidityRegimeData | null;
}

const scoreMeta = [
  { key: 'macroScore', icon: Gauge, en: 'Macro', ar: 'الماكرو' },
  { key: 'stablecoinScore', icon: Droplets, en: 'Stablecoins', ar: 'الستيبلكوين' },
  { key: 'dexScore', icon: Layers3, en: 'DEX', ar: 'الديكس' },
  { key: 'openInterestScore', icon: Activity, en: 'Open Interest', ar: 'الفائدة المفتوحة' },
  { key: 'bridgeScore', icon: ArrowRightLeft, en: 'Bridge Flows', ar: 'تدفقات الجسور' },
] as const;

export const LiquidityRegimeScorecard: React.FC<Props> = ({ lang, scorecard }) => {
  if (!scorecard) return null;

  const verdictTone = scorecard.verdict === 'RISK_ON'
    ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
    : scorecard.verdict === 'RISK_OFF'
    ? 'border-rose-500/30 bg-rose-950/20 text-rose-300'
    : 'border-amber-500/30 bg-amber-950/20 text-amber-300';

  return (
    <div className="bg-[#09090b] border border-[#1f1f1f] rounded-xl p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1f1f1f]">
        <div>
          <div className="text-[11px] uppercase font-mono text-gray-500">Conviction overlay</div>
          <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2"><Waves className="w-4 h-4 text-cyan-400" />{lang === 'ar' ? 'بطاقة نظام السيولة المؤثر على الثقة' : 'Liquidity Regime Scorecard'}</h3>
          <p className="text-xs text-gray-400 mt-1">{lang === 'ar' ? 'السكور التالي يدخل مباشرة في conviction score ويعدّل قوة الإشارة الحالية.' : 'These scores feed directly into conviction score and adjust the active signal strength.'}</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={`px-3 py-1 rounded-full border font-bold ${verdictTone}`}>{scorecard.verdict}</span>
          <span className={`px-3 py-1 rounded-full border font-bold ${scorecard.totalAdjustment >= 0 ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300' : 'border-rose-500/30 bg-rose-950/20 text-rose-300'}`}>{scorecard.totalAdjustment > 0 ? '+' : ''}{scorecard.totalAdjustment}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 font-mono text-xs">
        {scoreMeta.map((item) => {
          const Icon = item.icon;
          const value = Number(scorecard[item.key] || 0);
          return (
            <div key={item.key} className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3">
              <div className="text-gray-500 flex items-center gap-1"><Icon className="w-3 h-3" />{lang === 'ar' ? item.ar : item.en}</div>
              <div className={`mt-1 text-lg font-bold ${value >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{value > 0 ? '+' : ''}{value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3 text-xs text-gray-200">{lang === 'ar' ? scorecard.summaryAr : scorecard.summaryEn}</div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3 text-xs text-gray-300 space-y-2">
          <div className="text-white font-bold font-mono">{lang === 'ar' ? 'أبرز العوامل' : 'Top drivers'}</div>
          <ul className="space-y-1.5 list-disc pr-4 pl-4">
            {(lang === 'ar' ? scorecard.highlightsAr : scorecard.highlightsEn).slice(0, 5).map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-[11px] text-gray-500 font-mono">{scorecard.source.join(' + ')} • {lang === 'ar' ? 'آخر تحديث' : 'Updated'}: {new Date(scorecard.updatedAt).toLocaleTimeString()}</div>
    </div>
  );
};
