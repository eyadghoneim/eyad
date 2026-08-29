import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Database,
  KeyRound,
  Lock,
  RefreshCw,
  Radio,
  ShieldCheck,
  Siren,
  TerminalSquare,
  Zap,
} from 'lucide-react';
import { BotDaemonStatus, BotLogRecord, BotPublicStatus, BotSafeConfig, BotSignalRecord, SupportedAsset } from '../types';
import { clearBotAdminToken, getBotAdminHeaders, getBotAdminToken, setBotAdminToken } from '../utils/botAdminAuth';

interface BotOperationsPanelProps {
  lang: 'ar' | 'en';
  currentAsset: SupportedAsset;
}

const formatDateTime = (ts: number, lang: 'ar' | 'en') => {
  if (!ts) return lang === 'ar' ? '—' : '—';
  return new Date(ts).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const formatPrice = (value: number) => {
  if (!Number.isFinite(value)) return '—';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const BotOperationsPanel: React.FC<BotOperationsPanelProps> = ({ lang, currentAsset }) => {
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [publicStatus, setPublicStatus] = useState<BotPublicStatus | null>(null);
  const [daemon, setDaemon] = useState<BotDaemonStatus | null>(null);
  const [config, setConfig] = useState<BotSafeConfig | null>(null);
  const [logs, setLogs] = useState<BotLogRecord[]>([]);
  const [signals, setSignals] = useState<BotSignalRecord[]>([]);
  const [assetFilter, setAssetFilter] = useState<'ALL' | SupportedAsset>('ALL');
  const [loading, setLoading] = useState(false);
  const [runningScan, setRunningScan] = useState(false);
  const [authError, setAuthError] = useState('');
  const [flashMessage, setFlashMessage] = useState('');

  const hasStoredToken = useMemo(() => Boolean(getBotAdminToken().trim()), [adminTokenInput]);
  const effectiveAssetFilter = assetFilter === 'ALL' ? undefined : assetFilter;

  const fetchOperations = useCallback(async (withLoader = false) => {
    if (withLoader) setLoading(true);
    setAuthError('');
    setFlashMessage('');

    try {
      const publicRes = await fetch('/api/bot/public-status');
      const publicJson = publicRes.ok ? await publicRes.json() : null;
      const nextPublicStatus: BotPublicStatus | null = publicJson?.daemon || null;
      setPublicStatus(nextPublicStatus);

      const requiresToken = Boolean(nextPublicStatus?.requiresAdminToken);
      if (requiresToken && !getBotAdminToken().trim()) {
        setDaemon(null);
        setConfig(null);
        setLogs([]);
        setSignals([]);
        setAuthError(lang === 'ar' ? 'أدخل Bot Admin Token لعرض السجل والتحكم الآمن في الخادم.' : 'Enter the Bot Admin Token to unlock secure server controls and history.');
        return;
      }

      const signalUrl = effectiveAssetFilter
        ? `/api/bot/signals?limit=25&asset=${effectiveAssetFilter}`
        : '/api/bot/signals?limit=25';

      const [statusRes, logsRes, signalsRes] = await Promise.all([
        fetch('/api/bot/status', { headers: getBotAdminHeaders() }),
        fetch('/api/bot/logs?limit=25', { headers: getBotAdminHeaders() }),
        fetch(signalUrl, { headers: getBotAdminHeaders() }),
      ]);

      if ([statusRes, logsRes, signalsRes].some((res) => res.status === 401)) {
        setDaemon(null);
        setConfig(null);
        setLogs([]);
        setSignals([]);
        setAuthError(lang === 'ar' ? 'رمز الإدارة غير صحيح أو غير موجود.' : 'The admin token is missing or invalid.');
        return;
      }

      const [statusJson, logsJson, signalsJson] = await Promise.all([
        statusRes.json(),
        logsRes.json(),
        signalsRes.json(),
      ]);

      setDaemon(statusJson?.daemon || null);
      setConfig(statusJson?.config || null);
      setLogs(Array.isArray(logsJson?.logs) ? logsJson.logs : []);
      setSignals(Array.isArray(signalsJson?.signals) ? signalsJson.signals : []);
    } catch (error: any) {
      setAuthError(error?.message || (lang === 'ar' ? 'تعذر تحميل بيانات العمليات.' : 'Failed to load bot operations data.'));
    } finally {
      if (withLoader) setLoading(false);
    }
  }, [effectiveAssetFilter, lang]);

  useEffect(() => {
    setAdminTokenInput(getBotAdminToken());
    fetchOperations(true);
  }, [fetchOperations]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOperations(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOperations]);

  const handleSaveAdminToken = async () => {
    setBotAdminToken(adminTokenInput);
    setFlashMessage(lang === 'ar' ? 'تم حفظ الرمز للجلسة الحالية فقط.' : 'Admin token stored for this browser session only.');
    await fetchOperations(true);
  };

  const handleClearAdminToken = async () => {
    clearBotAdminToken();
    setAdminTokenInput('');
    setFlashMessage(lang === 'ar' ? 'تم حذف الرمز من الجلسة الحالية.' : 'Admin token cleared from this browser session.');
    await fetchOperations(true);
  };

  const handleRunScanNow = async () => {
    setRunningScan(true);
    setAuthError('');
    try {
      const res = await fetch('/api/bot/scan-now', {
        method: 'POST',
        headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
      });
      if (res.status === 401) {
        setAuthError(lang === 'ar' ? 'لا يمكن تنفيذ المسح اليدوي بدون Bot Admin Token صحيح.' : 'A valid admin token is required to run a manual scan.');
        return;
      }
      const data = await res.json();
      setFlashMessage(data?.message || (lang === 'ar' ? 'تم تشغيل المسح اليدوي.' : 'Manual scan triggered.'));
      await fetchOperations(false);
    } catch (error: any) {
      setAuthError(error?.message || (lang === 'ar' ? 'فشل تشغيل المسح اليدوي.' : 'Failed to run manual scan.'));
    } finally {
      setRunningScan(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 space-y-4 font-mono">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <TerminalSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'مركز العمليات والسجلات الحية' : 'Bot Operations & History Center'}
            </h2>
            <p className="text-xs text-gray-400 font-sans">
              {lang === 'ar'
                ? 'عرض حالة الـ daemon وسجل الإشارات واللوجز مباشرة من قاعدة البيانات.'
                : 'Live daemon status plus persisted signal and server log history from SQLite.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchOperations(true)}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#121212] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-gray-200 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-300' : 'text-gray-400'}`} />
            <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleRunScanNow}
            disabled={runningScan}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/40 text-xs text-white flex items-center gap-1.5 disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${runningScan ? 'animate-pulse' : ''}`} />
            <span>{lang === 'ar' ? 'تشغيل مسح فوري' : 'Run Scan Now'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,2fr] gap-4">
        <div className="space-y-4">
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? 'حماية Bot Admin Token' : 'Bot Admin Token Guard'}</span>
            </div>
            <input
              type="password"
              value={adminTokenInput}
              onChange={(e) => setAdminTokenInput(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل الرمز الإداري للجلسة الحالية فقط' : 'Enter the admin token for this browser session only'}
              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-[#252525] text-white text-xs focus:outline-none focus:border-cyan-500"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSaveAdminToken}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs"
              >
                {lang === 'ar' ? 'حفظ للجلسة' : 'Save for Session'}
              </button>
              <button
                onClick={handleClearAdminToken}
                className="px-3 py-1.5 rounded-lg bg-[#111] border border-[#2a2a2a] text-gray-300 text-xs"
              >
                {lang === 'ar' ? 'مسح الرمز' : 'Clear Token'}
              </button>
            </div>
            <div className="text-[11px] text-gray-500 font-sans">
              {lang === 'ar'
                ? 'يُحفظ هذا الرمز في sessionStorage فقط، وليس في localStorage.'
                : 'This token is stored in sessionStorage only, not in localStorage.'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3">
              <div className="text-[11px] text-gray-500 mb-1">{lang === 'ar' ? 'وضع الحماية' : 'Security Mode'}</div>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                {publicStatus?.securityMode === 'protected' ? <Lock className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-amber-300" />}
                <span>{publicStatus?.securityMode === 'protected' ? (lang === 'ar' ? 'محمي' : 'Protected') : (lang === 'ar' ? 'مفتوح' : 'Open')}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{publicStatus?.requiresAdminToken ? (lang === 'ar' ? 'يتطلب رمز إدارة' : 'Admin token required') : (lang === 'ar' ? 'الرمز غير مفعل' : 'Token not enforced')}</div>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3">
              <div className="text-[11px] text-gray-500 mb-1">{lang === 'ar' ? 'قاعدة البيانات' : 'Database'}</div>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Database className="w-4 h-4 text-cyan-300" />
                <span>{daemon?.databaseEngine || 'SQLite WAL'}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{lang === 'ar' ? 'Logs + Signals + Deliveries' : 'Logs + Signals + Deliveries'}</div>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3">
              <div className="text-[11px] text-gray-500 mb-1">{lang === 'ar' ? 'آخر مسح' : 'Last Scan'}</div>
              <div className="text-sm font-bold text-white">{formatDateTime(daemon?.lastScanTime || publicStatus?.lastScanTime || 0, lang)}</div>
              <div className="text-[10px] text-gray-500 mt-1">{lang === 'ar' ? 'عدد المسحات' : 'Total scans'}: {daemon?.scanCount ?? 0}</div>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3">
              <div className="text-[11px] text-gray-500 mb-1">{lang === 'ar' ? 'حالة الـ daemon' : 'Daemon State'}</div>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Radio className={`w-4 h-4 ${(daemon?.scanInProgress || publicStatus?.scanInProgress) ? 'text-amber-300 animate-pulse' : 'text-emerald-400'}`} />
                <span>
                  {daemon?.active || publicStatus?.active
                    ? ((daemon?.scanInProgress || publicStatus?.scanInProgress)
                      ? (lang === 'ar' ? 'جارٍ المسح' : 'Scanning')
                      : (lang === 'ar' ? 'نشط' : 'Active'))
                    : (lang === 'ar' ? 'متوقف' : 'Inactive')}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{lang === 'ar' ? 'الفاصل الزمني' : 'Interval'}: {(daemon?.scanIntervalSeconds || publicStatus?.scanIntervalSeconds || 0)}s</div>
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'ar' ? 'أحدث الأسعار المحفوظة' : 'Persisted Last Prices'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['BTC', 'ETH', 'PAXG'] as SupportedAsset[]).map((asset) => (
                <div key={asset} className={`rounded-lg border p-2 ${currentAsset === asset ? 'border-amber-500/40 bg-amber-500/10' : 'border-[#252525] bg-[#090909]'}`}>
                  <div className="text-gray-500 mb-1">{asset}</div>
                  <div className="text-white font-bold">{formatPrice(daemon?.lastKnownPrices?.[asset] || 0)}</div>
                </div>
              ))}
            </div>
          </div>

          {config && (
            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-white font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'ar' ? 'ملخص الإعدادات المؤمنة' : 'Secured Config Summary'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300">
                <div>{lang === 'ar' ? 'تيليجرام' : 'Telegram'}: <span className="text-white">{config.telegramEnabled ? (lang === 'ar' ? 'مفعل' : 'Enabled') : (lang === 'ar' ? 'معطل' : 'Disabled')}</span></div>
                <div>{lang === 'ar' ? 'إيميل' : 'Email'}: <span className="text-white">{config.emailEnabled ? (lang === 'ar' ? 'مفعل' : 'Enabled') : (lang === 'ar' ? 'معطل' : 'Disabled')}</span></div>
                <div>{lang === 'ar' ? 'توكن تلجرام' : 'Telegram token'}: <span className="text-emerald-400">{config.maskedTelegramToken || '—'}</span></div>
                <div>{lang === 'ar' ? 'Chat ID' : 'Chat ID'}: <span className="text-emerald-400">{config.maskedTelegramChatId || '—'}</span></div>
                <div>{lang === 'ar' ? 'الإيميل المقنّع' : 'Masked email'}: <span className="text-emerald-400">{config.emailAddress || '—'}</span></div>
                <div>{lang === 'ar' ? 'عمليات الإرسال' : 'Deliveries'}: <span className="text-white">{daemon?.notificationCount ?? 0}</span></div>
              </div>
            </div>
          )}

          {(authError || flashMessage) && (
            <div className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${authError ? 'bg-rose-950/30 border-rose-500/40 text-rose-200' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'}`}>
              {authError ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{authError || flashMessage}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Siren className="w-4 h-4 text-amber-300" />
                <span>{lang === 'ar' ? 'سجل الإشارات الحية' : 'Signal History'}</span>
              </div>
              <select
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value as 'ALL' | SupportedAsset)}
                className="px-2 py-1 rounded bg-[#050505] border border-[#252525] text-xs text-white focus:outline-none"
              >
                <option value="ALL">{lang === 'ar' ? 'كل الأصول' : 'All assets'}</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="PAXG">PAXG</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded border border-[#1a1a1a]">
              <table className="w-full text-[11px] min-w-[820px]">
                <thead className="bg-[#111] text-gray-400">
                  <tr>
                    <th className="p-2 text-left">{lang === 'ar' ? 'الوقت' : 'Time'}</th>
                    <th className="p-2 text-left">{lang === 'ar' ? 'الأصل' : 'Asset'}</th>
                    <th className="p-2 text-left">{lang === 'ar' ? 'الإشارة' : 'Signal'}</th>
                    <th className="p-2 text-left">{lang === 'ar' ? 'الثقة' : 'Confidence'}</th>
                    <th className="p-2 text-left">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                    <th className="p-2 text-left">{lang === 'ar' ? 'التغير 24س' : '24h'}</th>
                    <th className="p-2 text-left">{lang === 'ar' ? 'الملخص' : 'Summary'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181818] bg-[#0a0a0a]">
                  {signals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">{lang === 'ar' ? 'لا توجد إشارات محفوظة بعد.' : 'No persisted signals yet.'}</td>
                    </tr>
                  ) : signals.map((signal) => (
                    <tr key={signal.id} className="hover:bg-[#111] transition-colors">
                      <td className="p-2 text-gray-400 whitespace-nowrap">{formatDateTime(signal.timestamp, lang)}</td>
                      <td className="p-2 text-white font-bold">{signal.asset}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded border font-bold ${signal.spotAction === 'SPOT_BUY' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : signal.spotAction === 'SPOT_SELL_ALL' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-[#171717] text-gray-300 border-[#2a2a2a]'}`}>{signal.signalType}</span>
                      </td>
                      <td className="p-2 text-amber-300 font-bold">{signal.convictionScore}%</td>
                      <td className="p-2 text-white">{formatPrice(signal.price)}</td>
                      <td className={`p-2 font-bold ${signal.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{signal.change24h >= 0 ? '+' : ''}{signal.change24h.toFixed(2)}%</td>
                      <td className="p-2 text-gray-300 max-w-[380px] truncate">{lang === 'ar' ? signal.summaryAr : signal.summaryEn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <TerminalSquare className="w-4 h-4 text-cyan-300" />
              <span>{lang === 'ar' ? 'سجل الخادم والـ daemon' : 'Server & Daemon Logs'}</span>
            </div>
            <div className="overflow-x-auto rounded border border-[#1a1a1a]">
              <table className="w-full text-[11px] min-w-[760px]">
                <thead className="bg-[#111] text-gray-400">
                  <tr>
                    <th className="p-2 text-left">{lang === 'ar' ? 'الوقت' : 'Time'}</th>
                    <th className="p-2 text-left">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="p-2 text-left">{lang === 'ar' ? 'الأصل' : 'Asset'}</th>
                    <th className="p-2 text-left">{lang === 'ar' ? 'الرسالة' : 'Message'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181818] bg-[#0a0a0a]">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-500">{lang === 'ar' ? 'لا توجد لوجز محفوظة بعد.' : 'No persisted logs yet.'}</td>
                    </tr>
                  ) : logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#111] transition-colors">
                      <td className="p-2 text-gray-400 whitespace-nowrap">{formatDateTime(log.timestamp, lang)}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded border font-bold ${log.type === 'ERROR' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : log.type === 'SIGNAL' || log.type === 'ALERT' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : log.type === 'SECURITY' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-[#171717] text-gray-300 border-[#2a2a2a]'}`}>{log.type}</span>
                      </td>
                      <td className="p-2 text-white">{log.asset || '—'}</td>
                      <td className="p-2 text-gray-300">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-gray-500 border-t border-[#1a1a1a] pt-3 font-sans">
        {lang === 'ar'
          ? `عدد السجلات الحالية: ${daemon?.logCount ?? logs.length} | عدد الإشارات: ${daemon?.signalCount ?? signals.length} | الرمز الإداري ${hasStoredToken ? 'محفوظ للجلسة' : 'غير محفوظ'}`
          : `Current records: ${daemon?.logCount ?? logs.length} logs | ${daemon?.signalCount ?? signals.length} signals | admin token ${hasStoredToken ? 'loaded for this session' : 'not loaded'}`}
      </div>
    </div>
  );
};
