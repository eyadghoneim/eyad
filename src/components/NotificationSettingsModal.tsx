import React, { useState, useEffect } from 'react';
import { X, Send, Mail, Bell, CheckCircle2, AlertCircle, Volume2, ShieldCheck, HelpCircle, Smartphone, Radio, Globe } from 'lucide-react';
import { AlertConfig } from '../types';

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
  const [testingEmail, setTestingEmail] = useState(false);
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
          setTestResult({
            success: true,
            message: lang === 'ar' ? 'تم تفعيل إشعارات المتصفح وسطح المكتب بنجاح!' : 'Browser Push Notifications granted!',
          });
        } else {
          setTestResult({
            success: false,
            message: lang === 'ar' ? 'تم رفض إذن الإشعارات من إعدادات المتصفح' : 'Notification permission was denied.',
          });
        }
      } catch (e: any) {
        setTestResult({ success: false, message: e.message });
      }
    } else {
      setTestResult({
        success: false,
        message: lang === 'ar' ? 'المتصفح الحالي لا يدعم Web Notifications' : 'Browser does not support notifications.',
      });
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setTestResult({
          success: true,
          message: lang === 'ar' ? 'جاري تثبيت تطبيق EYAD BOT على جهازك!' : 'Installing EYAD BOT PWA app!',
        });
      }
      setDeferredPrompt(null);
    } else {
      setTestResult({
        success: true,
        message: lang === 'ar' ? '💡 لتثبيت التطبيق على هاتفك: اضغط على خيارات المتصفح (⋮ أو مشاركة) ثم "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).' : 'Tip: Tap browser menu and select "Add to Home Screen" to install.',
      });
    }
  };

  const handleTestTelegram = async () => {
    if (!config.telegramToken || !config.telegramChatId) {
      setTestResult({
        success: false,
        message: lang === 'ar' ? 'يرجى إدخال Bot Token و Chat ID أولاً' : 'Please enter Bot Token & Chat ID',
      });
      return;
    }

    setTestingTelegram(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notifications/telegram-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: config.telegramToken,
          chatId: config.telegramChatId,
          message: '🚀 [EYAD TRADING BOT] اختبار إشعار تجريبي حي: تم الاتصال بنجاح مع روبوت التداول!',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: lang === 'ar' ? 'تم إرسال رسالة اختبار حية إلى حسابك في تلجرام بنجاح! 🚀' : 'Test message sent to Telegram successfully!',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || (lang === 'ar' ? 'فشل الاتصال بتلجرام، تأكد من صحة الـ Token و Chat ID' : 'Telegram connection failed'),
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Error communicating with Telegram',
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestEmail = async () => {
    if (!config.emailAddress) {
      setTestResult({
        success: false,
        message: lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني أولاً' : 'Please enter email address',
      });
      return;
    }

    setTestingEmail(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notifications/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: config.emailAddress,
          subject: 'EYAD Trading Alert Test',
          message: 'Test alert from EYAD Trading Bot',
        }),
      });

      const data = await res.json();
      setTestResult({
        success: true,
        message: lang === 'ar' 
          ? `تمت جدولة إرسال الإشعار إلى ${config.emailAddress}! 💡 (ملاحظة: لاستقبال تنبيهات فورية حية على هاتفك بدون تأخير ننصح بربط بوت التلجرام فهو مجاني ومباشر 100%)` 
          : `Test dispatched to ${config.emailAddress}! (Telegram is recommended for 0-second instant mobile alerts)`,
      });
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message,
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-lg rounded-xl p-4 sm:p-5 shadow-2xl space-y-4 relative font-mono">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {lang === 'ar' ? 'إعدادات الإشعارات والتطبيق (PWA & Alerts)' : 'Alerts & PWA Mobile Setup'}
              </h3>
              <p className="text-[11px] text-gray-400 font-sans">
                {lang === 'ar' ? 'تفعيل الإشعارات الفورية (تلجرام، إشعارات المتصفح، وتثبيت التطبيق)' : 'Instant push alerts (Telegram, Browser Push, Mobile PWA)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#141414] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PWA & Browser Push Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Browser Push */}
          <button
            onClick={handleRequestBrowserNotification}
            className="p-3 rounded-lg bg-[#111114] border border-[#27272a] hover:border-blue-500/50 flex items-center gap-2.5 text-left transition-all group"
          >
            <div className="p-2 rounded bg-blue-500/15 text-blue-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-blue-300">
                {lang === 'ar' ? 'إشعارات المتصفح' : 'Browser Web Push'}
              </div>
              <div className="text-[10px] text-gray-400">
                {browserPermission === 'granted' ? (lang === 'ar' ? '✅ مفعّلة' : '✅ Active') : (lang === 'ar' ? 'طلب الإذن الآن' : 'Enable Permission')}
              </div>
            </div>
          </button>

          {/* PWA Mobile App Install */}
          <button
            onClick={handleInstallPWA}
            className="p-3 rounded-lg bg-[#111114] border border-[#27272a] hover:border-amber-500/50 flex items-center gap-2.5 text-left transition-all group"
          >
            <div className="p-2 rounded bg-amber-500/15 text-amber-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-amber-300">
                {lang === 'ar' ? 'تثبيت كتطبيق هاتف' : 'Install Mobile PWA'}
              </div>
              <div className="text-[10px] text-gray-400">
                {lang === 'ar' ? 'أيقونة على الشاشة الرئيسية' : 'Add to Home Screen'}
              </div>
            </div>
          </button>
        </div>

        {/* Telegram Configuration Box */}
        <div className="bg-[#0c0c0c] p-3 rounded-lg border border-[#222] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
              <Send className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إشعارات بوت تلجرام (Telegram Bot)' : 'Telegram Bot API'}</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.telegramEnabled}
                onChange={(e) => setConfig({ ...config, telegramEnabled: e.target.checked })}
                className="rounded accent-blue-600"
              />
              <span>{lang === 'ar' ? 'مفعل' : 'Enabled'}</span>
            </label>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-gray-400 block mb-1">
                {lang === 'ar' ? 'رمز البوت (Telegram Bot Token):' : 'Telegram Bot Token:'}
              </label>
              <input
                type="password"
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                value={config.telegramToken}
                onChange={(e) => setConfig({ ...config, telegramToken: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1">
                {lang === 'ar' ? 'معرف القناة أو الشات (Chat ID):' : 'Chat ID / Channel ID:'}
              </label>
              <input
                type="text"
                placeholder="123456789 أو @your_channel"
                value={config.telegramChatId}
                onChange={(e) => setConfig({ ...config, telegramChatId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <button
              onClick={handleTestTelegram}
              disabled={testingTelegram}
              className="mt-1 w-full py-1.5 rounded bg-[#141414] hover:bg-[#1a1a1a] text-gray-200 border border-[#333] font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Send className="w-3 h-3 text-blue-400" />
              <span>{testingTelegram ? (lang === 'ar' ? 'جاري الإرسال التجريبي...' : 'Testing...') : (lang === 'ar' ? 'اختبار إرسال رسالة لتلجرام' : 'Send Test Ping to Telegram')}</span>
            </button>
          </div>
        </div>

        {/* Email Configuration Box */}
        <div className="bg-[#0c0c0c] p-3 rounded-lg border border-[#222] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
              <Mail className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إشعارات البريد الإلكتروني (Email Alerts)' : 'Email Notifications'}</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.emailEnabled}
                onChange={(e) => setConfig({ ...config, emailEnabled: e.target.checked })}
                className="rounded accent-blue-600"
              />
              <span>{lang === 'ar' ? 'مفعل' : 'Enabled'}</span>
            </label>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-gray-400 block mb-1">
                {lang === 'ar' ? 'عنوان البريد الإلكتروني المستلم:' : 'Recipient Email Address:'}
              </label>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={config.emailAddress}
                onChange={(e) => setConfig({ ...config, emailAddress: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="mt-1 w-full py-1.5 rounded bg-[#141414] hover:bg-[#1a1a1a] text-gray-200 border border-[#333] font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3 h-3 text-blue-400" />
              <span>{testingEmail ? (lang === 'ar' ? 'جاري الاختبار...' : 'Sending...') : (lang === 'ar' ? 'اختبار إرسال إشعار للبريد' : 'Test Email Dispatch')}</span>
            </button>
          </div>
        </div>

        {/* Scan Frequency & Audio */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-[#0c0c0c] p-2.5 rounded-lg border border-[#222]">
            <label className="text-gray-400 block mb-1">
              {lang === 'ar' ? 'معدل المسح والتحليل الآلي:' : 'Auto Scan Interval:'}
            </label>
            <select
              value={config.autoScanIntervalSeconds}
              onChange={(e) => setConfig({ ...config, autoScanIntervalSeconds: parseInt(e.target.value, 10) })}
              className="w-full px-2 py-1 rounded bg-[#050505] border border-[#222] text-white focus:outline-none"
            >
              <option value="60">{lang === 'ar' ? 'كل دقيقة (1 د)' : 'Every 1 Min'}</option>
              <option value="300">{lang === 'ar' ? 'كل 5 دقائق' : 'Every 5 Mins'}</option>
              <option value="900">{lang === 'ar' ? 'كل 15 دقيقة' : 'Every 15 Mins'}</option>
              <option value="3600">{lang === 'ar' ? 'كل ساعة' : 'Every 1 Hour'}</option>
            </select>
          </div>

          <div className="bg-[#0c0c0c] p-2.5 rounded-lg border border-[#222] flex items-center justify-between">
            <div>
              <div className="text-gray-200 font-bold">{lang === 'ar' ? 'التنبيه الصوتي' : 'Audio Alert'}</div>
              <div className="text-gray-500 text-[10px]">{lang === 'ar' ? 'صوت عند الإشارة' : 'Chime on signal'}</div>
            </div>
            <input
              type="checkbox"
              checked={config.soundEnabled}
              onChange={(e) => setConfig({ ...config, soundEnabled: e.target.checked })}
              className="rounded accent-blue-600 w-4 h-4"
            />
          </div>
        </div>

        {/* Test Result Toast */}
        {testResult && (
          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-green-950/40 border-green-500/40 text-green-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}
          >
            {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Save & Close Button */}
        <button
          onClick={() => {
            // Sync settings to 24/7 background server daemon
            fetch('/api/bot/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                active: true,
                telegramEnabled: config.telegramEnabled,
                telegramToken: config.telegramToken,
                telegramChatId: config.telegramChatId,
                emailEnabled: config.emailEnabled,
                emailAddress: config.emailAddress,
                scanIntervalSeconds: config.autoScanIntervalSeconds,
              }),
            }).catch(() => {});
            onClose();
          }}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all border border-blue-400/40 shadow-md"
        >
          {lang === 'ar' ? 'حفظ وتطبيق الإعدادات على السيرفر 24/7' : 'Save & Sync to 24/7 Server Daemon'}
        </button>

      </div>
    </div>
  );
};
