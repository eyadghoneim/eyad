import React from 'react';
import { Bell, Volume2, VolumeX, RefreshCw, TrendingUp, TrendingDown, Code2, Activity, Globe, Mic, Radio } from 'lucide-react';
import { AlertConfig, SupportedAsset, ConfigChecksumReport } from '../types';
import { ChecksumSyncBadge } from './ChecksumSyncBadge';

interface HeaderProps {
  currentAsset: SupportedAsset;
  onSelectAsset: (asset: SupportedAsset) => void;
  btcPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  isLiveUpdating: boolean;
  marketSource?: string;
  lastSyncTime?: string;
  alertConfig: AlertConfig;
  setAlertConfig: React.Dispatch<React.SetStateAction<AlertConfig>>;
  onOpenAlertModal: () => void;
  onOpenStrategyModal: () => void;
  onOpenVoiceModal: () => void;
  onRefreshData: () => void;
  checksumReport?: ConfigChecksumReport | null;
  isChecksumSyncing?: boolean;
  onForceChecksumSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentAsset,
  onSelectAsset,
  btcPrice,
  change24h,
  high24h,
  low24h,
  lang,
  setLang,
  isLiveUpdating,
  marketSource = 'Binance Live API',
  lastSyncTime,
  alertConfig,
  setAlertConfig,
  onOpenAlertModal,
  onOpenStrategyModal,
  onOpenVoiceModal,
  onRefreshData,
  checksumReport = null,
  isChecksumSyncing = false,
  onForceChecksumSync = () => {},
}) => {
  const isPos = change24h >= 0;

  const assetNames: Record<SupportedAsset, { nameAr: string; nameEn: string }> = {
    BTC: { nameAr: 'بيتكوين', nameEn: 'Bitcoin' },
    ETH: { nameAr: 'إيثريوم', nameEn: 'Ethereum' },
    PAXG: { nameAr: 'ذهب رقمي', nameEn: 'Gold (PAXG)' },
  };

  return (
    <header className="bg-[#09090b] border-b border-[#222226] sticky top-0 z-40 px-3 py-2.5 sm:px-6 shadow-md backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        
        {/* Main Bar: Brand, Asset Selector, and Main Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand & Connection Status */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 bg-amber-500/15 text-amber-400 rounded-lg flex items-center justify-center font-bold border border-amber-500/30 text-base shadow-sm">
                🤖
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-[#09090b]"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                  EYAD Trading
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono" dir="ltr">
                <span className="text-gray-400">{marketSource}</span>
                {lastSyncTime && (
                  <span className="text-gray-500 text-[10px]">({lastSyncTime})</span>
                )}
              </div>
            </div>
          </div>

          {/* Center Asset Switcher Pills */}
          <div className="flex items-center bg-[#121215] p-1 rounded-lg border border-[#27272a] gap-1 font-mono text-xs">
            {(['BTC', 'ETH', 'PAXG'] as SupportedAsset[]).map((ast) => {
              const active = currentAsset === ast;
              return (
                <button
                  key={ast}
                  onClick={() => onSelectAsset(ast)}
                  className={`px-3 py-1.5 rounded-md transition-all font-semibold flex items-center gap-1.5 ${
                    active
                      ? 'bg-amber-500 text-black shadow-md font-bold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#1c1c21]'
                  }`}
                >
                  <span>{ast}</span>
                  <span className={`text-[10px] hidden md:inline opacity-80 ${active ? 'text-black' : 'text-gray-500'}`}>
                    {lang === 'ar' ? assetNames[ast].nameAr : assetNames[ast].nameEn}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Top Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Checksum Verification & Sync Pill */}
            <ChecksumSyncBadge
              report={checksumReport}
              isSyncing={isChecksumSyncing}
              onForceRecheck={onForceChecksumSync}
              lang={lang}
            />

            {/* Strategy Inspector Modal Trigger */}
            <button
              onClick={onOpenStrategyModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium text-xs font-mono transition-all border border-amber-500/30 active:scale-95 shadow-sm"
              title="10 Golden Strategy Rules"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'الاستراتيجية والقواعد' : 'Strategy Rules'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-200 font-bold">10</span>
            </button>

            {/* AI Voice Assistant Trigger */}
            <button
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-medium text-xs font-mono transition-all border border-purple-500/40 active:scale-95 shadow-sm"
              title={lang === 'ar' ? 'المساعد الصوتي الذكي' : 'AI Voice Assistant'}
            >
              <Mic className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'صوت الذكاء' : 'Voice AI'}</span>
            </button>

            {/* Telegram / Push Alerts Center */}
            <button
              onClick={onOpenAlertModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs font-mono transition-all border border-blue-400/40 active:scale-95 shadow-sm"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'التنبيهات' : 'Alerts'}</span>
              {alertConfig.telegramEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              )}
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setAlertConfig((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              className={`p-1.5 rounded-lg border transition-all ${
                alertConfig.soundEnabled
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#121215] text-gray-500 border-[#27272a] hover:text-gray-400'
              }`}
              title={alertConfig.soundEnabled ? (lang === 'ar' ? 'الصوت مفعل' : 'Sound Active') : (lang === 'ar' ? 'الصوت معطل' : 'Sound Muted')}
            >
              {alertConfig.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Refresh Data Button */}
            <button
              onClick={onRefreshData}
              disabled={isLiveUpdating}
              className="p-1.5 rounded-lg bg-[#121215] hover:bg-[#1c1c21] text-gray-300 border border-[#27272a] hover:text-white transition-all disabled:opacity-50"
              title={lang === 'ar' ? 'تحديث البيانات الفورية' : 'Refresh Market Feeds'}
            >
              <RefreshCw className={`w-4 h-4 ${isLiveUpdating ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#121215] hover:bg-[#1c1c21] text-gray-300 hover:text-white border border-[#27272a] text-xs font-mono font-semibold transition-all"
            >
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
          </div>

        </div>

        {/* Financial Ticker Sub-Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111114] px-3.5 py-2 rounded-lg border border-[#222227] text-xs font-mono">
          
          {/* Active Asset & Live Price */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold text-gray-300 tracking-wider uppercase">{currentAsset}/USDT</span>
            </div>

            <div className="flex items-center gap-2" dir="ltr">
              <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                ${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                  isPos
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPos ? '+' : ''}{change24h.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* 24h Metrics (High / Low) */}
          <div className="flex items-center gap-4 text-[11px]" dir="ltr">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 uppercase font-semibold">24h High:</span>
              <span className="text-emerald-400 font-bold">
                ${high24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-px h-3 bg-[#27272a]" />
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 uppercase font-semibold">24h Low:</span>
              <span className="text-rose-400 font-bold">
                ${low24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};

