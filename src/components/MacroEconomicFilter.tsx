import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  Info, 
  Radio, 
  CheckCircle2, 
  Flame 
} from 'lucide-react';
import { MacroNewsStatus, MacroEvent } from '../types';

interface MacroEconomicFilterProps {
  macroStatus: MacroNewsStatus | null;
  onRefresh?: () => void;
  lang: 'ar' | 'en';
}

export const MacroEconomicFilter: React.FC<MacroEconomicFilterProps> = ({
  macroStatus,
  onRefresh,
  lang,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  useEffect(() => {
    if (!macroStatus || !macroStatus.upcomingEvents || macroStatus.upcomingEvents.length === 0) return;

    const updateTimer = () => {
      const nextEvent = macroStatus.upcomingEvents.find(e => e.status !== 'PASSED');
      if (!nextEvent) {
        setTimeLeftStr('');
        return;
      }
      const diffMs = nextEvent.timestamp - Date.now();
      if (diffMs <= 0) {
        setTimeLeftStr(lang === 'ar' ? 'الحدث جاري الآن' : 'Event in Progress');
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [macroStatus, lang]);

  const isBlackout = macroStatus?.isBlackoutActive ?? false;
  const events = macroStatus?.upcomingEvents || [];

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4 space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded border ${
            isBlackout 
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">
                {lang === 'ar' ? 'فلتر الأخبار الاقتصادية الكبرى (CPI & FOMC Filter)' : 'Macroeconomic Events & CPI/FOMC Filter'}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                isBlackout 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isBlackout ? '⚠️ ACTIVE BLACKOUT' : '🛡️ NORMAL SIMULATION'}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans">
              {lang === 'ar' 
                ? 'إيقاف تتبع إشارات جديدة قبل صدور القرارات الكبرى بـ ساعتين لتجنب الضوضاء' 
                : 'Automated 2-hour blackout window around major US economic releases to avoid noise'}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#121212] hover:bg-[#1a1a1a] text-gray-300 border border-[#262626] text-xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            <span>{lang === 'ar' ? 'تحديث المفكرة' : 'Refresh Calendar'}</span>
          </button>
        )}
      </div>

      {/* Real-time Blackout Status Banner */}
      <div className={`p-3 rounded border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isBlackout 
          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200' 
          : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
      }`}>
        <div className="flex items-center gap-2.5">
          {isBlackout ? (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <div>
            <span className="font-bold block">
              {isBlackout
                ? (lang === 'ar'
                    ? '⚠️ وضع الحماية مفعل: تم إيقاف محاكاة الشراء مؤقتاً'
                    : '⚠️ Blackout Mode Active: New tracking execution locked')
                : (lang === 'ar'
                    ? '✅ وضع المحاكاة آمن: لا توجد أحداث تضخم أو فائدة خلال الساعتين القادمتين'
                    : '✅ Safe Tracking Window: No high-impact events within the 2-hour buffer')}
            </span>
            {macroStatus?.lockReasonAr && isBlackout && (
              <span className="text-[11px] text-rose-300 font-sans block mt-0.5">
                {macroStatus.lockReasonAr}
              </span>
            )}
          </div>
        </div>

        {timeLeftStr && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/50 border border-current text-[11px] font-bold shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الوقت المتبقي:' : 'Next Event:'} {timeLeftStr}</span>
          </div>
        )}
      </div>

      {/* Upcoming High-Impact Macro Schedule Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            {lang === 'ar' ? 'جدول الأحداث الاقتصادية الأمريكية المؤثرة:' : 'Upcoming High-Impact US Economic Releases:'}
          </span>
          <span className="text-[11px] text-gray-500">
            {lang === 'ar' ? 'نافذة التجميد: ساعتان قبل وساعة بعد' : 'Blackout: 2h Before / 1h After'}
          </span>
        </div>

        <div className="overflow-x-auto border border-[#1a1a1a] rounded">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-[#111] text-gray-400">
              <tr>
                <th className="p-2.5">{lang === 'ar' ? 'الحدث الاقتصادي' : 'Event'}</th>
                <th className="p-2.5">{lang === 'ar' ? 'التصنيف والتأثير' : 'Impact'}</th>
                <th className="p-2.5">{lang === 'ar' ? 'التوقيت (UTC)' : 'Time'}</th>
                <th className="p-2.5">{lang === 'ar' ? 'السابق / التقديري' : 'Prev / Forecast'}</th>
                <th className="p-2.5 text-right">{lang === 'ar' ? 'حالة البوت' : 'Bot Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181818] bg-[#0a0a0a]">
              {events.map((evt) => {
                const isCurrentActive = evt.status === 'ACTIVE_BLACKOUT';
                return (
                  <tr key={evt.id} className={`hover:bg-[#121212] transition-colors ${isCurrentActive ? 'bg-rose-950/20' : ''}`}>
                    <td className="p-2.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {evt.impact === 'HIGH' && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        <span>{lang === 'ar' ? evt.nameAr : evt.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-sans block mt-0.5">{evt.descriptionAr}</span>
                    </td>

                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        evt.impact === 'HIGH' 
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                          : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      }`}>
                        {evt.category} ({evt.impact})
                      </span>
                    </td>

                    <td className="p-2.5 text-gray-300 whitespace-nowrap">
                      {evt.timeFormatted}
                    </td>

                    <td className="p-2.5 text-gray-400 whitespace-nowrap">
                      <span className="text-gray-500">{lang === 'ar' ? 'سابق:' : 'Prev:'}</span> {evt.previousValue} / <span className="text-emerald-400">{lang === 'ar' ? 'توقع:' : 'Fcst:'}</span> {evt.forecastValue}
                    </td>

                    <td className="p-2.5 text-right whitespace-nowrap">
                      {isCurrentActive ? (
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                          🛑 {lang === 'ar' ? 'صفقات مقفلة' : 'LOCKED'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#181818] text-gray-400 border border-[#2a2a2a]">
                          ⏳ {lang === 'ar' ? 'في الانتظار' : 'Upcoming'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
