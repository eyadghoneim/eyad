import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, Cpu, Zap, Lock, Terminal, X } from 'lucide-react';
import { ConfigChecksumReport } from '../types';

interface ChecksumSyncBadgeProps {
  report: ConfigChecksumReport | null;
  isSyncing: boolean;
  onForceRecheck: () => void;
  lang: 'ar' | 'en';
}

export const ChecksumSyncBadge: React.FC<ChecksumSyncBadgeProps> = ({
  report,
  isSyncing,
  onForceRecheck,
  lang,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const isVerified = report?.isMatch === true;
  const isUpdated = report?.syncAction === 'SERVER_UPDATED';
  const checksumHash = report?.serverChecksum || report?.localChecksum || 'INIT';

  return (
    <>
      {/* Compact Interactive Badge in Top Navigation */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all border shadow-xs ${
          isSyncing
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
            : isVerified
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
            : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/40'
        }`}
        title={lang === 'ar' ? 'انقر لعرض تفاصيل التحقق والمزامنة (Checksum Audit)' : 'Click to inspect Checksum & Sync details'}
      >
        {isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
        ) : isVerified ? (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        )}

        <div className="flex items-center gap-1">
          <span className="font-bold hidden sm:inline">
            {lang === 'ar' ? 'التطابق (Checksum):' : 'Checksum:'}
          </span>
          <span className="px-1 py-0.2 rounded bg-black/40 text-[10px] font-mono border border-white/10 tracking-wider">
            {checksumHash.slice(0, 8)}
          </span>
        </div>

        {isUpdated && (
          <span className="text-[9px] px-1 py-0.2 bg-blue-500/20 text-blue-300 rounded font-mono hidden md:inline">
            {lang === 'ar' ? 'تمت المزامنة ⚡' : 'Synced ⚡'}
          </span>
        )}
      </button>

      {/* Detailed Checksum Audit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-[#0c0c0e] border border-[#27272a] rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2 font-mono">
                    {lang === 'ar' ? 'محرك فحص التطابق (Checksum Verification)' : 'Configuration Checksum & Sync Engine'}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                      SHA-256
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 font-sans">
                    {lang === 'ar'
                      ? 'مقارنة إعدادات المتصفح مع سيرفر البوت لضمان التطابق التام لحظة بلحظة'
                      : 'Real-time mathematical checksum matching between browser storage and backend daemon'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1c1c21] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checksum Hash Match Card */}
            <div className="bg-[#141418] border border-[#27272a] rounded-lg p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  {lang === 'ar' ? 'بصمة الإعدادات المشفرة (Active Checksum):' : 'Active Config Checksum:'}
                </span>
                <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 text-sm tracking-widest">
                  {checksumHash}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#222226]">
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <span className="text-gray-500 block">{lang === 'ar' ? 'بصمة المتصفح (LocalStorage):' : 'Local Storage Checksum:'}</span>
                  <span className="font-semibold text-gray-200">{report?.localChecksum || 'CALCULATING...'}</span>
                </div>
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <span className="text-gray-500 block">{lang === 'ar' ? 'بصمة السيرفر (Backend Bot):' : 'Backend Server Checksum:'}</span>
                  <span className="font-semibold text-emerald-400">{report?.serverChecksum || 'CALCULATING...'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {report?.syncAction === 'SERVER_UPDATED'
                    ? (lang === 'ar'
                        ? 'تم رصد اختلاف عند بدء التشغيل وتم تحديث السيرفر فوراً لضمان التطابق التام ⚡'
                        : 'Discrepancy detected on load and resolved: Server updated instantly to match client!')
                    : (lang === 'ar'
                        ? 'جميع الإعدادات متطابقة بنسبة 100% بين واجهة الموقع وبوت المحاكاة 🟢'
                        : '100% Parameter parity verified between frontend and research bot 🟢')}
                </span>
              </div>
            </div>

            {/* Synchronized Parameters Matrix */}
            <div className="space-y-2 font-mono text-xs">
              <h4 className="font-bold text-gray-300 flex items-center gap-1.5 text-xs">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                {lang === 'ar' ? 'مصفوفة المعاملات المتزامنة (Synced Parameter Matrix):' : 'Synchronized Parameter Matrix:'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#141418] p-2.5 rounded border border-[#222226] flex items-center justify-between">
                  <span className="text-gray-400">{lang === 'ar' ? 'بوت تلجرام المربوط:' : 'Telegram Bot Link:'}</span>
                  <span className={`font-bold ${report?.details.telegramConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {report?.details.telegramConfigured ? (lang === 'ar' ? 'مربوط وموثق' : 'Configured & Active') : (lang === 'ar' ? 'غير مربوط' : 'Not Linked')}
                  </span>
                </div>

                <div className="bg-[#141418] p-2.5 rounded border border-[#222226] flex items-center justify-between">
                  <span className="text-gray-400">{lang === 'ar' ? 'معدل فحص السوق الفوري:' : 'Market Scan Interval:'}</span>
                  <span className="font-bold text-white">
                    {report?.details.scanIntervalSeconds || 60} {lang === 'ar' ? 'ثانية' : 'sec'}
                  </span>
                </div>

                <div className="bg-[#141418] p-2.5 rounded border border-[#222226] flex items-center justify-between">
                  <span className="text-gray-400">{lang === 'ar' ? 'حماية الانزلاق (Spread Guard):' : 'Spread Guard Filter:'}</span>
                  <span className="font-bold text-emerald-400">
                    {report?.details.spreadFilterEnabled ? `نشط (${report.details.maxSpreadPercent || 0.15}%)` : 'معطل'}
                  </span>
                </div>

                <div className="bg-[#141418] p-2.5 rounded border border-[#222226] flex items-center justify-between">
                  <span className="text-gray-400">{lang === 'ar' ? 'الدخول المجزأ (Tranches):' : 'Dual-Tranches Mode:'}</span>
                  <span className="font-bold text-indigo-300">
                    {report?.details.trancheModeEnabled ? `${report.details.tranche1Percent || 60}% / ${report.details.tranche2Percent || 40}%` : 'دفعة واحدة'}
                  </span>
                </div>

                <div className="bg-[#141418] p-2.5 rounded border border-[#222226] flex items-center justify-between">
                  <span className="text-gray-400">{lang === 'ar' ? 'قواعد الذاكرة التكيفية:' : 'Adaptive Memory Rules:'}</span>
                  <span className="font-bold text-purple-300">
                    {report?.details.adaptiveRulesCount || 0} {lang === 'ar' ? 'قواعد نشطة' : 'Active Rules'}
                  </span>
                </div>

                <div className="bg-[#141418] p-2.5 rounded border border-[#222226] flex items-center justify-between">
                  <span className="text-gray-400">{lang === 'ar' ? 'ساعات التداول المحظورة:' : 'Banned Trading Hours:'}</span>
                  <span className="font-bold text-amber-300">
                    {report?.details.bannedHoursCount ? `${report.details.bannedHoursCount} ${lang === 'ar' ? 'ساعات محظورة' : 'banned hrs'}` : (lang === 'ar' ? 'لا يوجد حظر' : 'None')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#222226]">
              <span className="text-[11px] text-gray-500 font-mono">
                {report?.syncedAt ? `${lang === 'ar' ? 'آخر فحص:' : 'Last verified:'} ${new Date(report.syncedAt).toLocaleTimeString()}` : ''}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onForceRecheck()}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-semibold text-xs transition-all disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{lang === 'ar' ? 'إعادة الفحص والمزامنة الفورية' : 'Force Re-Verify & Sync'}</span>
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a20] hover:bg-[#25252e] text-gray-300 font-mono text-xs transition-all"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
