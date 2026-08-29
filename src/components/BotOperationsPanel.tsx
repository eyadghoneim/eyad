import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Database, Radio, RefreshCw, ShieldCheck, Siren, TerminalSquare } from 'lucide-react';
import { SupportedAsset } from '../types';
import { getBotAdminHeaders } from '../utils/botAdminAuth';

interface BotOperationsPanelProps {
  lang: 'ar' | 'en';
  currentAsset: SupportedAsset;
}

interface BotDashboardSnapshot {
  daemon?: {
    active: boolean;
    scanCount: number;
    scanIntervalSeconds: number;
    lastScanTime: number;
    lastKnownPrices: Record<string, number>;
    scanInProgress?: boolean;
  };
  config?: {
    telegramConfigured?: boolean;
  };
}

interface ServerBotLogEntry {
  id: string;
  timestamp: number;
  type: 'INFO' | 'SIGNAL' | 'ALERT' | 'ERROR' | 'SECURITY' | 'WARN';
  message: string;
  asset?: string;
}

interface PersistedBotSignalView {
  id: string;
  timestamp: number;
  asset: string;
  signalType: string;
  spotAction: string;
  convictionScore: number;
  price: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  summaryAr: string;
  summaryEn: string;
}

interface DbStats {
  databaseSizeBytes?: number;
  walSizeBytes?: number;
  signalRows?: number;
  logRows?: number;
  schemaVersion?: number;
  lastPrunedAt?: number;
}

const logColors: Record<ServerBotLogEntry['type'], string> = {
  INFO: 'text-blue-300 border-blue-500/20 bg-blue-950/10',
  SIGNAL: 'text-emerald-300 border-emerald-500/20 bg-emerald-950/10',
  ALERT: 'text-amber-300 border-amber-500/20 bg-amber-950/10',
  ERROR: 'text-rose-300 border-rose-500/20 bg-rose-950/10',
  SECURITY: 'text-fuchsia-300 border-fuchsia-500/20 bg-fuchsia-950/10',
  WARN: 'text-orange-300 border-orange-500/20 bg-orange-950/10',
};

const signalColors: Record<string, string> = {
  STRONG_BUY: 'text-emerald-300 border-emerald-500/25 bg-emerald-950/10',
  BUY: 'text-emerald-300 border-emerald-500/25 bg-emerald-950/10',
  SELL: 'text-rose-300 border-rose-500/25 bg-rose-950/10',
  STRONG_SELL: 'text-rose-300 border-rose-500/25 bg-rose-950/10',
  NO_TRADE: 'text-amber-300 border-amber-500/25 bg-amber-950/10',
  HOLD: 'text-slate-300 border-slate-500/25 bg-slate-950/10',
};

export const BotOperationsPanel: React.FC<BotOperationsPanelProps> = ({ lang, currentAsset }) => {
  const [dashboard, setDashboard] = useState<BotDashboardSnapshot | null>(null);
  const [logs, setLogs] = useState<ServerBotLogEntry[]>([]);
  const [signals, setSignals] = useState<PersistedBotSignalView[]>([]);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [statusRes, logsRes, signalsRes] = await Promise.all([
        fetch('/api/bot/status', { headers: getBotAdminHeaders() }),
        fetch('/api/bot/logs?limit=200', { headers: getBotAdminHeaders() }),
        fetch('/api/bot/signals?limit=200', { headers: getBotAdminHeaders() }),
      ]);

      if (!statusRes.ok || !logsRes.ok || !signalsRes.ok) {
        throw new Error(lang === 'ar' ? 'تعذر قراءة حالة البوت من السيرفر.' : 'Failed to load bot runtime data from the server.');
      }

      const statusData = await statusRes.json();
      const logsData = await logsRes.json();
      const signalsData = await signalsRes.json();

      setDashboard(statusData || null);
      setLogs(Array.isArray(logsData?.logs) ? logsData.logs : []);
      setSignals(Array.isArray(signalsData?.signals) ? signalsData.signals : []);
      setDbStats(statusData?.database || null);
    } catch (e: any) {
      setError(e.message || (lang === 'ar' ? 'خطأ غير متوقع أثناء التحديث.' : 'Unexpected refresh error.'));
    } finally {
      setIsLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleRunScanNow = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bot/scan-now', {
        method: 'POST',
        headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || (lang === 'ar' ? 'فشل تشغيل المسح الفوري.' : 'Failed to trigger immediate scan.'));
      }
      await refreshAll();
    } catch (e: any) {
      setError(e.message || (lang === 'ar' ? 'فشل المسح الفوري.' : 'Immediate scan failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  const daemon = dashboard?.daemon;
  const filteredSignals = signals.filter((item) => item.asset === currentAsset).slice(0, 12);
  const filteredLogs = logs.filter((item) => !item.asset || item.asset === currentAsset).slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500 font-mono">{lang === 'ar' ? 'حالة السيرفر والدايمون' : 'Server daemon status'}</div>
              <div className="text-lg font-bold text-white flex items-center gap-2"><Radio className="w-4 h-4 text-blue-400" /><span>{lang === 'ar' ? 'مركز العمليات' : 'Operations Center'}</span></div>
            </div>
            <div className={`px-2 py-1 rounded-full text-[11px] font-bold border ${daemon?.active ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/30 border-rose-500/30 text-rose-300'}`}>{daemon?.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'متوقف' : 'Stopped')}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3"><div className="text-gray-500">{lang === 'ar' ? 'عدد المسحات' : 'Scans'}</div><div className="text-white text-base font-bold">{daemon?.scanCount ?? 0}</div></div>
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3"><div className="text-gray-500">{lang === 'ar' ? 'الفاصل' : 'Interval'}</div><div className="text-white text-base font-bold">{daemon?.scanIntervalSeconds ?? 0}s</div></div>
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3"><div className="text-gray-500">{lang === 'ar' ? 'تلجرام' : 'Telegram'}</div><div className="text-white text-base font-bold">{dashboard?.config?.telegramConfigured ? (lang === 'ar' ? 'جاهز' : 'Ready') : (lang === 'ar' ? 'غير مكتمل' : 'Not ready')}</div></div>
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3"><div className="text-gray-500">{lang === 'ar' ? 'آخر مسح' : 'Last scan'}</div><div className="text-white text-sm font-bold">{daemon?.lastScanTime ? new Date(daemon.lastScanTime).toLocaleTimeString() : '--'}</div></div>
          </div>
          <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3 text-xs text-gray-300 space-y-2">
            <div className="flex items-center gap-2 text-blue-300 font-bold"><Activity className="w-3.5 h-3.5" />{lang === 'ar' ? 'آخر أسعار الخادم' : 'Server last prices'}</div>
            <div className="grid grid-cols-3 gap-2">{Object.entries(daemon?.lastKnownPrices || {}).map(([asset, price]) => <div key={asset} className="rounded border border-[#222] bg-black/20 p-2"><div className="text-gray-500 text-[10px]">{asset}</div><div className="text-white font-bold">${Number(price || 0).toLocaleString()}</div></div>)}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={refreshAll} className="flex-1 py-2 rounded-lg border border-[#333] bg-[#111114] hover:bg-[#18181b] text-gray-100 text-xs font-bold flex items-center justify-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /><span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span></button>
            <button onClick={handleRunScanNow} className="flex-1 py-2 rounded-lg border border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 text-xs font-bold flex items-center justify-center gap-2"><Siren className="w-3.5 h-3.5" /><span>{lang === 'ar' ? 'مسح فوري' : 'Scan now'}</span></button>
          </div>
          {error && <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
        </div>

        <div className="xl:col-span-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold"><Database className="w-4 h-4 text-amber-400" /><span>{lang === 'ar' ? 'إحصاءات قاعدة البيانات' : 'Database stats'}</span></div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3"><div className="text-gray-500">{lang === 'ar' ? 'الإشارات' : 'Signals'}</div><div className="text-white text-base font-bold">{dbStats?.signalRows ?? signals.length}</div></div>
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3"><div className="text-gray-500">{lang === 'ar' ? 'اللوجز' : 'Logs'}</div><div className="text-white text-base font-bold">{dbStats?.logRows ?? logs.length}</div></div>
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3"><div className="text-gray-500">{lang === 'ar' ? 'حجم القاعدة' : 'DB size'}</div><div className="text-white text-sm font-bold">{((dbStats?.databaseSizeBytes ?? 0) / 1024).toFixed(1)} KB</div></div>
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3"><div className="text-gray-500">WAL</div><div className="text-white text-sm font-bold">{((dbStats?.walSizeBytes ?? 0) / 1024).toFixed(1)} KB</div></div>
          </div>
          <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3 space-y-2 text-xs text-gray-300">
            <div className="flex items-center gap-2 text-emerald-300 font-bold"><ShieldCheck className="w-3.5 h-3.5" />{lang === 'ar' ? 'ملخص الإشارات المحفوظة' : 'Persisted signal summary'}</div>
            <div className="grid grid-cols-3 gap-2">{['BTC','ETH','PAXG'].map((asset) => <div key={asset} className="rounded border border-[#222] bg-black/20 p-2"><div className="text-gray-500 text-[10px]">{asset}</div><div className="text-white font-bold">{signals.filter((item) => item.asset === asset).length}</div></div>)}</div>
          </div>
        </div>

        <div className="xl:col-span-4 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold"><TerminalSquare className="w-4 h-4 text-purple-400" /><span>{lang === 'ar' ? 'الحماية والقيود' : 'Security posture'}</span></div>
          <div className="space-y-2 text-xs text-gray-300">
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3">{lang === 'ar' ? 'النقاط الحساسة محمية الآن بطبقة same-origin + rate limiting + security headers، مع إخفاء التوكنات تماماً عن الواجهة.' : 'Sensitive mutations now use same-origin checks, rate limiting, security headers, and never expose raw secrets to the UI.'}</div>
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3">{lang === 'ar' ? 'قناة التنبيهات المعتمدة حالياً هي تلجرام، مع استمرار حماية التوكنات وإخفائها عن الواجهة.' : 'Telegram is the active alert channel, while secrets remain masked and protected from the UI.'}</div>
            <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3 font-mono text-[11px]">{lang === 'ar' ? 'نسخة المخطط:' : 'Schema version:'} <span className="text-white font-bold">{dbStats?.schemaVersion ?? 0}</span><br />{lang === 'ar' ? 'آخر تنظيف:' : 'Last prune:'} <span className="text-white font-bold">{dbStats?.lastPrunedAt ? new Date(dbStats.lastPrunedAt).toLocaleString() : '--'}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between"><div className="text-white font-bold">{lang === 'ar' ? `آخر إشارات ${currentAsset}` : `Recent ${currentAsset} signals`}</div><div className="text-[11px] text-gray-500 font-mono">{filteredSignals.length}</div></div>
          <div className="space-y-2 max-h-[520px] overflow-auto pr-1">{filteredSignals.length === 0 ? <div className="rounded-lg border border-dashed border-[#333] p-4 text-sm text-gray-500 text-center">{lang === 'ar' ? 'لا توجد إشارات محفوظة بعد لهذا الأصل.' : 'No persisted signals yet for this asset.'}</div> : filteredSignals.map((signal) => <div key={signal.id} className={`rounded-lg border p-3 ${signalColors[signal.signalType] || signalColors.HOLD}`}><div className="flex items-start justify-between gap-3"><div><div className="font-bold text-sm">{signal.signalType} • {signal.spotAction}</div><div className="text-[11px] opacity-80">{new Date(signal.timestamp).toLocaleString()}</div></div><div className="text-right font-mono text-xs"><div>{lang === 'ar' ? 'الثقة' : 'Confidence'}: <span className="font-bold text-white">{signal.convictionScore}%</span></div><div>{lang === 'ar' ? 'السعر' : 'Price'}: <span className="font-bold text-white">${signal.price.toLocaleString()}</span></div></div></div><div className="grid grid-cols-2 gap-2 mt-3 text-[11px] font-mono"><div className="rounded border border-black/20 bg-black/10 p-2">Entry: <span className="text-white font-bold">${signal.entryPrice.toLocaleString()}</span></div><div className="rounded border border-black/20 bg-black/10 p-2">SL: <span className="text-white font-bold">${signal.stopLoss.toLocaleString()}</span></div><div className="rounded border border-black/20 bg-black/10 p-2">TP1: <span className="text-white font-bold">${signal.target1.toLocaleString()}</span></div><div className="rounded border border-black/20 bg-black/10 p-2">TP2: <span className="text-white font-bold">${signal.target2.toLocaleString()}</span></div></div><div className="mt-3 text-xs leading-6 text-gray-100">{lang === 'ar' ? signal.summaryAr : signal.summaryEn}</div></div>)}</div>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between"><div className="text-white font-bold">{lang === 'ar' ? `سجل العمليات واللوجز (${currentAsset})` : `Operation logs (${currentAsset})`}</div><div className="text-[11px] text-gray-500 font-mono">{filteredLogs.length}</div></div>
          <div className="space-y-2 max-h-[520px] overflow-auto pr-1">{filteredLogs.length === 0 ? <div className="rounded-lg border border-dashed border-[#333] p-4 text-sm text-gray-500 text-center">{lang === 'ar' ? 'لا توجد لوجز مطابقة حالياً.' : 'No matching logs yet.'}</div> : filteredLogs.map((log) => <div key={log.id} className={`rounded-lg border p-3 ${logColors[log.type]}`}><div className="flex items-center justify-between gap-3"><div className="font-bold text-sm flex items-center gap-2"><span>{log.type}</span>{log.asset && <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/20 border border-black/20">{log.asset}</span>}</div><div className="text-[11px] opacity-75 font-mono">{new Date(log.timestamp).toLocaleString()}</div></div><div className="mt-2 text-xs leading-6">{log.message}</div></div>)}</div>
        </div>
      </div>
    </div>
  );
};
