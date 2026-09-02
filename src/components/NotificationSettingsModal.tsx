import React, { useState, useEffect } from 'react';
import { X, Send, Bell, CheckCircle2, AlertCircle, Smartphone, Globe, ShieldCheck, Radio } from 'lucide-react';
import { AlertConfig } from '../types';
import { getBotAdminHeaders } from '../utils/botAdminAuth';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AlertConfig;
  setConfig: React.Dispatch<React.SetStateAction<AlertConfig>>;
  lang: 'ar' | 'en';
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  setConfig,
  lang,
}) => {
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>('default');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!isOpen) return null;

  const handleRequestBrowserNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setBrowserPermission(permission);
        if (permission === 'granted') {
          new Notification('🤖 EYAD Trading Bot', {
            body: lang === 'ar' ? 'تم تفعيل إشعارات المتصفح وسطح المكتب بنجاح! ستصلك إشارات التداول الحية هنا.' : 'Browser Push Notifications enabled successfully!',
          });
          setTestResult({ success: true, message: lang === 'ar' ? 'تم تفعيل إشعارات المتصفح وسطح المكتب بنجاح!' : 'Browser Push Notifications granted!' });
        } else {
          setTestResult({ success: false, message: lang === 'ar' ? 'تم رفض إذن الإشعارات من إعدادات المتصفح' : 'Notification permission was denied.' });
        }
      } catch (e: any) {
        setTestResult({ success: false, message: e.message });
      }
    } else {
      setTestResult({ success: false, message: lang === 'ar' ? 'المتصفح الحالي لا يدعم Web Notifications' : 'Browser does not support notifications.' });
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setTestResult({ success: true, message: lang === 'ar' ? 'جاري تثبيت تطبيق EYAD BOT على جهازك!' : 'Installing EYAD BOT PWA app!' });
      }
      setDeferredPrompt(null);
    } else {
      setTestResult({ success: true, message: lang === 'ar' ? 'استخدمي خيار إضافة إلى الشاشة الرئيسية من المتصفح لتثبيت التطبيق.' : 'Use Add to Home Screen from your browser to install the app.' });
    }
  };

  const handleTestTelegram = async () => {
    const canUseServerConfig = Boolean(config.serverHasTelegramToken && config.serverHasTelegramChatId);
    if (!canUseServerConfig && (!config.telegramToken.trim() || !config.telegramChatId.trim())) {
      setTestResult({ success: false, message: lang === 'ar' ? 'أدخلي Bot Token و Chat ID أولاً أو استخدمي المحفوظ على السيرفر' : 'Enter Bot Token and Chat ID first, or use the stored server credentials.' });
      return;
    }

    setTestingTelegram(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notifications/telegram-test', {
        method: 'POST',
        headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          token: config.telegramToken.trim(),
          chatId: config.telegramChatId.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: lang === 'ar' ? 'تم إرسال رسالة الاختبار وحفظ بيانات تلجرام بنجاح! 🟢' : 'Telegram test message sent and credentials saved!' });
        if (config.telegramToken.trim() && config.telegramChatId.trim()) {
          const t = config.telegramToken.trim();
          const c = config.telegramChatId.trim();
          setConfig((prev) => ({
            ...prev,
            telegramEnabled: true,
            serverHasTelegramToken: true,
            serverHasTelegramChatId: true,
            maskedTelegramToken: `${t.slice(0, 4)}••••${t.slice(-4)}`,
            maskedTelegramChatId: `${c.slice(0, 2)}••••${c.slice(-2)}`,
          }));
        }
      } else {
        setTestResult({ success: false, message: data.error || (lang === 'ar' ? 'فشل الاتصال بتلجرام.' : 'Telegram connection failed.') });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Error communicating with Telegram' });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      active: true,
      telegramEnabled: config.telegramEnabled,
      scanIntervalSeconds: config.autoScanIntervalSeconds,
    };
    if (config.telegramToken.trim()) payload.telegramToken = config.telegramToken.trim();
    if (config.telegramChatId.trim()) payload.telegramChatId = config.telegramChatId.trim();

    try {
      const res = await fetch('/api/bot/config', {
        method: 'POST',
        headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig((prev) => ({
          ...prev,
          telegramEnabled: data.config.telegramEnabled,
          serverHasTelegramToken: Boolean(data.config.hasTelegramToken || prev.telegramToken),
          serverHasTelegramChatId: Boolean(data.config.hasTelegramChatId || prev.telegramChatId),
          maskedTelegramToken: data.config.maskedTelegramToken || prev.maskedTelegramToken,
          maskedTelegramChatId: data.config.maskedTelegramChatId || prev.maskedTelegramChatId,
          telegramToken: prev.telegramToken || (payload.telegramToken as string) || '',
          telegramChatId: prev.telegramChatId || (payload.telegramChatId as string) || '',
        }));
      }
    } catch (e) {
      console.warn('Failed to save config to server:', e);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-lg rounded-xl p-4 sm:p-5 shadow-2xl space-y-4 relative font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30"><Bell className="w-4 h-4" /></div>
            <div>
              <h3 className="font-bold text-sm text-white">{lang === 'ar' ? 'إعدادات الإشعارات والتطبيق' : 'Alerts & PWA Setup'}</h3>
              <p className="text-[11px] text-gray-400 font-sans">{lang === 'ar' ? 'تلجرام + إشعارات المتصفح + تثبيت التطبيق' : 'Telegram + browser notifications + installable app'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#141414] transition-all"><X className="w-4 h-4" /></button>
        </div>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3 text-[11px] text-emerald-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
          <div>{lang === 'ar' ? 'هذه الشاشة مخصصة لإعدادات تلجرام وإشعارات المتصفح وتثبيت التطبيق.' : 'This panel focuses on Telegram, browser notifications, and app installation.'}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button onClick={handleRequestBrowserNotification} className="p-3 rounded-lg bg-[#111114] border border-[#27272a] hover:border-blue-500/50 flex items-center gap-2.5 text-left transition-all group">
            <div className="p-2 rounded bg-blue-500/15 text-blue-400"><Globe className="w-4 h-4" /></div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-blue-300">{lang === 'ar' ? 'إشعارات المتصفح' : 'Browser Web Push'}</div>
              <div className="text-[10px] text-gray-400">{browserPermission === 'granted' ? (lang === 'ar' ? '✅ مفعّلة' : '✅ Active') : (lang === 'ar' ? 'طلب الإذن الآن' : 'Enable Permission')}</div>
            </div>
          </button>

          <button onClick={handleInstallPWA} className="p-3 rounded-lg bg-[#111114] border border-[#27272a] hover:border-amber-500/50 flex items-center gap-2.5 text-left transition-all group">
            <div className="p-2 rounded bg-amber-500/15 text-amber-400"><Smartphone className="w-4 h-4" /></div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-amber-300">{lang === 'ar' ? 'تثبيت كتطبيق هاتف' : 'Install Mobile PWA'}</div>
              <div className="text-[10px] text-gray-400">{lang === 'ar' ? 'أيقونة على الشاشة الرئيسية' : 'Add to Home Screen'}</div>
            </div>
          </button>
        </div>

        <div className="bg-[#0c0c0c] p-3 rounded-lg border border-[#222] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400"><Send className="w-3.5 h-3.5" /><span>{lang === 'ar' ? 'بوت تلجرام للإشعارات' : 'Telegram Bot Alerts'}</span></div>
            <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" checked={config.telegramEnabled} onChange={(e) => setConfig({ ...config, telegramEnabled: e.target.checked })} className="rounded accent-blue-600" />
              <span>{lang === 'ar' ? 'مفعل' : 'Enabled'}</span>
            </label>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-gray-400 block mb-1">Telegram Bot Token</label>
              <input type="password" placeholder={config.serverHasTelegramToken ? (lang === 'ar' ? 'يوجد توكن محفوظ على السيرفر — اكتبي فقط لو عايزة استبداله' : 'Token already stored on server — type only to replace it') : '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ'} value={config.telegramToken} onChange={(e) => setConfig({ ...config, telegramToken: e.target.value })} className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-white focus:outline-none focus:border-blue-500 text-xs" />
              {config.serverHasTelegramToken && config.maskedTelegramToken && <div className="mt-1 text-[10px] text-emerald-400">{lang === 'ar' ? `توكن محفوظ على السيرفر: ${config.maskedTelegramToken}` : `Server token on file: ${config.maskedTelegramToken}`}</div>}
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Chat ID / Channel ID</label>
              <input type="text" placeholder={config.serverHasTelegramChatId ? (lang === 'ar' ? 'يوجد Chat ID محفوظ — اكتبي فقط لو عايزة تغييره' : 'Chat ID already stored — type only to replace it') : '123456789 أو @your_channel'} value={config.telegramChatId} onChange={(e) => setConfig({ ...config, telegramChatId: e.target.value })} className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-white focus:outline-none focus:border-blue-500 text-xs" />
              {config.serverHasTelegramChatId && config.maskedTelegramChatId && <div className="mt-1 text-[10px] text-emerald-400">{lang === 'ar' ? `Chat ID محفوظ على السيرفر: ${config.maskedTelegramChatId}` : `Server chat ID on file: ${config.maskedTelegramChatId}`}</div>}
            </div>
            <button onClick={handleTestTelegram} disabled={testingTelegram} className="mt-1 w-full py-1.5 rounded bg-[#141414] hover:bg-[#1a1a1a] text-gray-200 border border-[#333] font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"><Send className="w-3 h-3 text-blue-400" /><span>{testingTelegram ? (lang === 'ar' ? 'جاري الاختبار...' : 'Testing...') : (lang === 'ar' ? 'اختبار إرسال رسالة لتلجرام' : 'Send Test Ping to Telegram')}</span></button>
            <button 
              onClick={async () => {
                const tokenToSend = config.telegramToken.trim();
                const chatIdToSend = config.telegramChatId.trim();
                const canUseServerConfig = Boolean(config.serverHasTelegramToken && config.serverHasTelegramChatId);

                if (!canUseServerConfig && (!tokenToSend || !chatIdToSend)) {
                  setTestResult({ success: false, message: lang === 'ar' ? 'أدخلي Bot Token و Chat ID أولاً واضغطي حفظ' : 'Enter Bot Token and Chat ID first and click Save.' });
                  return;
                }

                setTestingTelegram(true);
                setTestResult(null);
                try {
                  const res = await fetch('/api/bot/dispatch-weekly-report', {
                    method: 'POST',
                    headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                      token: tokenToSend,
                      chatId: chatIdToSend,
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setTestResult({ success: true, message: lang === 'ar' ? 'تم إرسال تقرير المراجعة والتقييم الشامل إلى تلجرام بنجاح! 📋' : 'Weekly audit report sent to Telegram!' });
                    if (tokenToSend && chatIdToSend) {
                      setConfig((prev) => ({
                        ...prev,
                        telegramEnabled: true,
                        serverHasTelegramToken: true,
                        serverHasTelegramChatId: true,
                        maskedTelegramToken: `${tokenToSend.slice(0, 4)}••••${tokenToSend.slice(-4)}`,
                        maskedTelegramChatId: `${chatIdToSend.slice(0, 2)}••••${chatIdToSend.slice(-2)}`,
                      }));
                    }
                  } else {
                    setTestResult({ success: false, message: data.error || 'Failed to dispatch report' });
                  }
                } catch (e: any) {
                  setTestResult({ success: false, message: e.message });
                } finally {
                  setTestingTelegram(false);
                }
              }}
              disabled={testingTelegram}
              className="mt-1 w-full py-1.5 rounded bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 border border-purple-500/30 font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span>📋 {lang === 'ar' ? 'إرسال تقرير التقييم والمراجعة الدورية إلى تلجرام فوراً' : 'Send AI Audit Report to Telegram Now'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-[#0c0c0c] p-2.5 rounded-lg border border-[#222]">
            <label className="text-gray-400 block mb-1">{lang === 'ar' ? 'معدل المسح والتحليل الآلي' : 'Auto Scan Interval'}</label>
            <select value={config.autoScanIntervalSeconds} onChange={(e) => setConfig({ ...config, autoScanIntervalSeconds: parseInt(e.target.value, 10) })} className="w-full px-2 py-1 rounded bg-[#050505] border border-[#222] text-white focus:outline-none">
              <option value="60">{lang === 'ar' ? 'كل دقيقة' : 'Every 1 min'}</option>
              <option value="300">{lang === 'ar' ? 'كل 5 دقائق' : 'Every 5 mins'}</option>
              <option value="900">{lang === 'ar' ? 'كل 15 دقيقة' : 'Every 15 mins'}</option>
              <option value="3600">{lang === 'ar' ? 'كل ساعة' : 'Every hour'}</option>
            </select>
          </div>
          <div className="bg-[#0c0c0c] p-2.5 rounded-lg border border-[#222] flex items-center justify-between">
            <div><div className="text-gray-200 font-bold">{lang === 'ar' ? 'التنبيه الصوتي' : 'Audio Alert'}</div><div className="text-gray-500 text-[10px]">{lang === 'ar' ? 'صوت عند الإشارة' : 'Chime on signal'}</div></div>
            <input type="checkbox" checked={config.soundEnabled} onChange={(e) => setConfig({ ...config, soundEnabled: e.target.checked })} className="rounded accent-blue-600 w-4 h-4" />
          </div>
        </div>

        <div className="rounded-lg border border-[#222] bg-[#0c0c0c] p-3 text-[11px] text-gray-300 space-y-1">
          <div className="flex items-center gap-1.5 text-blue-300 font-bold"><Radio className="w-3.5 h-3.5" /><span>{lang === 'ar' ? 'مزامنة السيرفر 24/7' : '24/7 daemon sync'}</span></div>
          <div>{lang === 'ar' ? 'الحفظ هنا يطبق مباشرة على خادم البوت ويُبقي التوكنات مخفية عن الواجهة.' : 'Saving here updates the server daemon directly and keeps secrets masked from the UI.'}</div>
        </div>

        {testResult && <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${testResult.success ? 'bg-green-950/40 border-green-500/40 text-green-300' : 'bg-red-950/40 border-red-500/40 text-red-300'}`}>{testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}<span>{testResult.message}</span></div>}

        <button onClick={handleSave} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all border border-blue-400/40 shadow-md">{lang === 'ar' ? 'حفظ وتطبيق الإعدادات على السيرفر 24/7' : 'Save & Sync to 24/7 Server Daemon'}</button>
      </div>
    </div>
  );
};
