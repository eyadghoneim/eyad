import React, { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Percent, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Zap, 
  History, 
  Layers, 
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Sparkles,
  Activity,
  Trash2,
  Wand2
} from 'lucide-react';
import { PaperAccount, PaperPosition, AIReasoning, SupportedAsset, TradeRecord } from '../types';
import { getBotAdminHeaders } from '../utils/botAdminAuth';

interface PaperTradingPanelProps {
  paperAccount: PaperAccount;
  setPaperAccount: React.Dispatch<React.SetStateAction<PaperAccount>>;
  currentAsset: SupportedAsset;
  currentPrice: number;
  currentSignal: AIReasoning | null;
  lang: 'ar' | 'en';
  autoEvents?: Array<{
    type: 'ENTRY' | 'TP1' | 'TP2' | 'STOP_LOSS' | 'TRAILING_STOP' | 'SELL_SIGNAL';
    asset: SupportedAsset;
    price: number;
    pnlUsd?: number;
    pnlPercent?: number;
    messageAr: string;
    messageEn: string;
    timestamp: number;
  }>;
}

export const PaperTradingPanel: React.FC<PaperTradingPanelProps> = ({
  paperAccount,
  setPaperAccount,
  currentAsset,
  currentPrice,
  currentSignal,
  lang,
  autoEvents = [],
}) => {
  const [allocationPercent, setAllocationPercent] = useState<number>(25);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Calculate live equity
  const totalOpenPnlUsd = paperAccount.positions.reduce((acc, pos) => acc + pos.unrealizedPnlUsd, 0);
  const totalEquity = paperAccount.virtualBalanceUsd + totalOpenPnlUsd;
  const initialCap = 10000;
  const netRoiPercent = ((totalEquity - initialCap) / initialCap) * 100;
  const winningTrades = paperAccount.tradeHistory.filter(t => t.status === 'CLOSED_WIN').length;
  const winRate = paperAccount.tradeHistory.length > 0 
    ? Math.round((winningTrades / paperAccount.tradeHistory.length) * 100) 
    : 0;

  // Execute manual paper trade on current signal
  const handleOpenPaperTrade = () => {
    if (paperAccount.virtualBalanceUsd <= 50) return;
    const investUsd = (paperAccount.virtualBalanceUsd * allocationPercent) / 100;
    if (investUsd <= 10) return;

    const entryPrice = currentPrice > 0 ? currentPrice : (currentSignal?.entryPrice || 77696);
    const amount = investUsd / entryPrice;
    const tp1 = currentSignal?.target1 || Math.round(entryPrice * 1.035);
    const tp2 = currentSignal?.target2 || Math.round(entryPrice * 1.07);
    const stopLoss = currentSignal?.stopLoss || Math.round(entryPrice * 0.974);

    const newPosition: PaperPosition = {
      id: `pos_${Date.now()}_${currentAsset}`,
      asset: currentAsset,
      entryPrice,
      currentPrice: entryPrice,
      amount,
      allocatedUsd: investUsd,
      tp1,
      tp2,
      stopLoss,
      entryTime: Date.now(),
      unrealizedPnlUsd: 0,
      unrealizedPnlPercent: 0,
      partialSold: false,
      highestPrice: entryPrice,
      trailingStopPrice: Math.round(entryPrice * 0.98),
    };

    setPaperAccount(prev => ({
      ...prev,
      virtualBalanceUsd: Number((prev.virtualBalanceUsd - investUsd).toFixed(2)),
      allocatedCapitalUsd: Number((prev.allocatedCapitalUsd + investUsd).toFixed(2)),
      positions: [newPosition, ...prev.positions],
    }));
  };

  // Close active position at current market price
  const handleClosePosition = (posId: string, reason: string = 'Manual Market Close') => {
    const pos = paperAccount.positions.find(p => p.id === posId);
    if (!pos) return;

    const exitPrice = currentPrice > 0 ? currentPrice : pos.currentPrice;
    const finalValue = pos.amount * exitPrice;
    const pnlUsd = finalValue - pos.allocatedUsd;
    const pnlPercent = (pnlUsd / pos.allocatedUsd) * 100;
    const isWin = pnlUsd > 0;

    const closedRecord: TradeRecord = {
      id: `trade_${Date.now()}`,
      asset: pos.asset,
      timestamp: pos.entryTime,
      dateFormatted: new Date().toISOString().replace('T', ' ').substring(0, 16),
      hourOfDay: new Date().getUTCHours(),
      dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getUTCDay()],
      action: 'BUY',
      entryPrice: pos.entryPrice,
      exitPrice,
      currentPrice: exitPrice,
      amountBtc: pos.amount,
      capitalUsd: pos.allocatedUsd,
      pnlUsd: Number(pnlUsd.toFixed(2)),
      pnlPercent: Number(pnlPercent.toFixed(2)),
      status: isWin ? 'CLOSED_WIN' : 'CLOSED_LOSS',
      durationHours: Math.max(1, Math.round((Date.now() - pos.entryTime) / (3600 * 1000))),
      signalConfidence: currentSignal?.convictionScore ?? 0,
      confluenceReason: `${reason} (Exit @ $${exitPrice.toLocaleString()})`,
      marketCondition: 'STRONG_TREND',
      partialExitTaken: pos.partialSold,
    };

    setPaperAccount(prev => ({
      ...prev,
      virtualBalanceUsd: Number((prev.virtualBalanceUsd + finalValue).toFixed(2)),
      allocatedCapitalUsd: Number(Math.max(0, prev.allocatedCapitalUsd - pos.allocatedUsd).toFixed(2)),
      totalRealizedPnlUsd: Number((prev.totalRealizedPnlUsd + pnlUsd).toFixed(2)),
      positions: prev.positions.filter(p => p.id !== posId),
      tradeHistory: [closedRecord, ...prev.tradeHistory],
    }));
  };

  // Reset virtual paper portfolio
  const handleResetPortfolio = () => {
    fetch('/api/paper/reset', {
      method: 'POST',
      headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
    }).catch(() => {});

    setPaperAccount({
      virtualBalanceUsd: 10000,
      allocatedCapitalUsd: 0,
      totalRealizedPnlUsd: 0,
      positions: [],
      tradeHistory: [],
      autoExecuteSignals: true,
      spreadFilterEnabled: paperAccount.spreadFilterEnabled ?? true,
      maxSpreadTolerancePct: paperAccount.maxSpreadTolerancePct ?? 0.15,
      trancheModeEnabled: paperAccount.trancheModeEnabled ?? true,
    });
    setShowResetConfirm(false);
  };

  // Delete individual trade from history and adjust realized PnL
  const handleDeleteTrade = (tradeId: string) => {
    setPaperAccount((prev) => {
      const trade = prev.tradeHistory.find((t) => t.id === tradeId);
      if (!trade) return prev;
      const newHistory = prev.tradeHistory.filter((t) => t.id !== tradeId);
      const newRealized = Number((prev.totalRealizedPnlUsd - trade.pnlUsd).toFixed(2));
      const newBalance = Number((prev.virtualBalanceUsd - trade.pnlUsd).toFixed(2));
      return {
        ...prev,
        virtualBalanceUsd: Math.max(0, newBalance),
        totalRealizedPnlUsd: newRealized,
        tradeHistory: newHistory,
      };
    });
  };

  // Clean abnormal / glitched trades (e.g., cross-asset prices)
  const handleCleanGlitchedTrades = () => {
    setPaperAccount((prev) => {
      const validHistory = prev.tradeHistory.filter((t) => {
        const isGlitch = (t.asset === 'ETH' && typeof t.exitPrice === 'number' && t.exitPrice > 4000) || Math.abs(t.pnlPercent) > 50;
        return !isGlitch;
      });
      const newRealized = Number(validHistory.reduce((acc, t) => acc + t.pnlUsd, 0).toFixed(2));
      return {
        ...prev,
        virtualBalanceUsd: Number((10000 + newRealized - prev.allocatedCapitalUsd).toFixed(2)),
        totalRealizedPnlUsd: newRealized,
        tradeHistory: validHistory,
      };
    });
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4 space-y-4 font-mono">
      {/* Header & Quick Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white">
                {lang === 'ar' ? 'المحفظة التجريبية (Paper Trading)' : 'Paper Trading Simulator'}
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                Simulation Only
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans">
              {lang === 'ar' 
                ? 'محاكاة لتنفيذ افتراضي برأس مال $10,000 (بدون ضمانات أداء)' 
                : 'Virtual simulation with $10,000 capital (No performance guarantees)'}
            </p>
          </div>
        </div>

        {/* Auto-execute Switch & Reset buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPaperAccount(p => ({ ...p, autoExecuteSignals: !p.autoExecuteSignals }))}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all border ${
              paperAccount.autoExecuteSignals
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950'
                : 'bg-[#141414] text-gray-400 border-[#262626] hover:text-white'
            }`}
          >
            <Bot className={`w-4 h-4 ${paperAccount.autoExecuteSignals ? 'text-emerald-400 animate-bounce' : 'text-gray-500'}`} />
            <span>
              {paperAccount.autoExecuteSignals
                ? (lang === 'ar' ? 'التداول الآلي التلقائي: مفعّل 🟢' : 'Auto-Pilot: ON 🟢')
                : (lang === 'ar' ? 'التداول الآلي التلقائي: متوقف ⚪' : 'Auto-Pilot: OFF ⚪')}
            </span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#121212] hover:bg-rose-950/30 text-gray-400 hover:text-rose-400 border border-[#262626] hover:border-rose-500/40 text-xs transition-all"
            title={lang === 'ar' ? 'إعادة ضبط المحفظة' : 'Reset Virtual Balance'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تصفير' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Auto-Trading Live Status Banner */}
      {paperAccount.autoExecuteSignals && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded text-xs flex items-center justify-between gap-3 text-emerald-300">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <span>
              {lang === 'ar'
                ? 'البوت متصل بالمحفظة التجريبية: يفتح الصفقات تلقائياً عند صدور إشارة الشراء، ويغلق الصفقات آلياً عند أهداف TP أو وقف الخسارة، ويسجل الأرباح والخسائر تلقائياً.'
                : 'Auto-Pilot active: Bot opens positions on valid Buy signals, executes TP1/TP2 & Stop-Loss automatically, and logs results.'}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0 text-[10px]">
            {lang === 'ar' ? 'مراقبة حية مستمرة' : 'Active Monitoring'}
          </span>
        </div>
      )}

      {/* Institutional Execution Suite Toolbar */}
      <div className="bg-[#0e0e0e] border border-[#222] p-3 rounded-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Spread Guard Filter */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-200">
              <input
                type="checkbox"
                checked={paperAccount.spreadFilterEnabled !== false}
                onChange={(e) =>
                  setPaperAccount((p) => ({ ...p, spreadFilterEnabled: e.target.checked }))
                }
                className="accent-indigo-500 rounded"
              />
              <span className="text-indigo-400">
                {lang === 'ar' ? '🛡️ فلتر الانزلاق (Spread Guard)' : '🛡️ Spread Guard'}
              </span>
            </label>
            <select
              value={paperAccount.maxSpreadTolerancePct ?? 0.15}
              onChange={(e) =>
                setPaperAccount((p) => ({ ...p, maxSpreadTolerancePct: parseFloat(e.target.value) }))
              }
              disabled={paperAccount.spreadFilterEnabled === false}
              className="bg-[#050505] border border-[#2b2b2b] text-gray-300 rounded px-1.5 py-0.5 text-[11px] disabled:opacity-40"
            >
              <option value="0.05">0.05% {lang === 'ar' ? '(فائق الصرامة)' : '(Ultra tight)'}</option>
              <option value="0.10">0.10% {lang === 'ar' ? '(موصى به)' : '(Recommended)'}</option>
              <option value="0.15">0.15% {lang === 'ar' ? '(قياسي)' : '(Standard)'}</option>
              <option value="0.25">0.25% {lang === 'ar' ? '(مرن)' : '(Flexible)'}</option>
            </select>
          </div>

          {/* Dual-Tranche Mode */}
          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-200 border-l border-[#222] pl-3">
            <input
              type="checkbox"
              checked={paperAccount.trancheModeEnabled !== false}
              onChange={(e) =>
                setPaperAccount((p) => ({ ...p, trancheModeEnabled: e.target.checked }))
              }
              className="accent-amber-500 rounded"
            />
            <span className="text-amber-300">
              {lang === 'ar' ? '🎯 دخول مجزأ (60/40)' : '🎯 Tranches (60/40)'}
            </span>
          </label>

          {/* Correlation Guard */}
          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-200 border-l border-[#222] pl-3">
            <input
              type="checkbox"
              checked={paperAccount.correlationGuardEnabled !== false}
              onChange={(e) =>
                setPaperAccount((p) => ({ ...p, correlationGuardEnabled: e.target.checked }))
              }
              className="accent-purple-500 rounded"
            />
            <span className="text-purple-400">
              {lang === 'ar' ? '⚡ فلتر الارتباط' : '⚡ Correlation'}
            </span>
          </label>

          {/* Max Exposure Pill */}
          <div className="flex items-center gap-1.5 border-l border-[#222] pl-3 text-[11px]">
            <span className="text-gray-400">{lang === 'ar' ? 'سقف التعرض:' : 'Max Exp:'}</span>
            <select
              value={paperAccount.maxExposurePct ?? 50}
              onChange={(e) =>
                setPaperAccount((p) => ({ ...p, maxExposurePct: parseInt(e.target.value, 10) }))
              }
              className="bg-[#050505] border border-[#2b2b2b] text-indigo-300 font-bold rounded px-1 py-0.5 text-[11px]"
            >
              <option value="30">30% {lang === 'ar' ? '(متحفظ)' : '(Conservative)'}</option>
              <option value="40">40% {lang === 'ar' ? '(متوازن)' : '(Balanced)'}</option>
              <option value="50">50% {lang === 'ar' ? '(افتراضي)' : '(Default)'}</option>
              <option value="70">70% {lang === 'ar' ? '(جريء)' : '(Aggressive)'}</option>
            </select>
          </div>
        </div>

        {/* Server & Cloud Sync Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 font-mono bg-emerald-950/20 px-2.5 py-1 rounded border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{lang === 'ar' ? '☁️ مزامنة سحابية 24/7 (Firestore + WAL)' : '☁️ 24/7 Cloud Synced (Firestore + WAL)'}</span>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded text-xs text-rose-300 flex items-center justify-between gap-3">
          <span>{lang === 'ar' ? 'هل أنت متأكد من إعادة تعيين المحفظة إلى $10,000 ومسح السجل؟' : 'Reset virtual portfolio balance to $10,000 and clear history?'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetPortfolio}
              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              {lang === 'ar' ? 'نعم، أعد التعيين' : 'Yes, Reset'}
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-2.5 py-1 rounded bg-[#222] text-gray-300 hover:text-white"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-[#0e0e0e] p-2.5 rounded border border-[#1f1f1f]">
          <span className="text-[11px] text-gray-400 block mb-1">
            {lang === 'ar' ? 'الرصيد المتاح (USDT)' : 'Available Cash'}
          </span>
          <span className="text-base font-bold text-white">
            ${paperAccount.virtualBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-[#0e0e0e] p-2.5 rounded border border-[#1f1f1f]">
          <span className="text-[11px] text-gray-400 block mb-1">
            {lang === 'ar' ? 'إجمالي القيمة الافتراضية' : 'Total Equity'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-emerald-400">
              ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] font-bold ${netRoiPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({netRoiPercent >= 0 ? '+' : ''}{netRoiPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="bg-[#0e0e0e] p-2.5 rounded border border-[#1f1f1f]">
          <span className="text-[11px] text-gray-400 block mb-1">
            {lang === 'ar' ? 'الأرباح المحققة نظريًا' : 'Realized PnL'}
          </span>
          <span className={`text-base font-bold ${paperAccount.totalRealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {paperAccount.totalRealizedPnlUsd >= 0 ? '+' : ''}${paperAccount.totalRealizedPnlUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-[#0e0e0e] p-2.5 rounded border border-[#1f1f1f]">
          <span className="text-[11px] text-gray-400 block mb-1">
            {lang === 'ar' ? 'نسبة نجاح المحاكاة' : 'Win Rate / Tracking'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-blue-400">{winRate}%</span>
            <span className="text-[11px] text-gray-400">({paperAccount.tradeHistory.length} {lang === 'ar' ? 'إشارة' : 'signals'})</span>
          </div>
        </div>
      </div>

      {/* Manual / Fast Trade Launcher on Active Signal */}
      <div className="bg-[#0d0d0d] p-3 rounded border border-[#222] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs text-white">
              {lang === 'ar' 
                ? `تشغيل محاكاة إضافية على إشارة ${currentAsset}:` 
                : `Manual Launch on ${currentAsset} Signal:`}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-400">
              ${currentPrice.toLocaleString()}
            </span>
          </div>

          {/* Allocation size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">{lang === 'ar' ? 'حجم التعرض:' : 'Size:'}</span>
            {[25, 50, 100].map(pct => (
              <button
                key={pct}
                onClick={() => setAllocationPercent(pct)}
                className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                  allocationPercent === pct
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#181818] text-gray-400 hover:text-white border border-[#2a2a2a]'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="text-xs text-gray-400 flex items-center gap-3 flex-wrap">
            <span>🎯 TP1: <strong className="text-emerald-400">${(currentSignal?.target1 || currentPrice * 1.035).toLocaleString()}</strong></span>
            <span>🎯 TP2: <strong className="text-emerald-400">${(currentSignal?.target2 || currentPrice * 1.07).toLocaleString()}</strong></span>
            <span>🛑 Stop: <strong className="text-rose-400">${(currentSignal?.stopLoss || currentPrice * 0.974).toLocaleString()}</strong></span>
          </div>

          <button
            onClick={handleOpenPaperTrade}
            disabled={paperAccount.virtualBalanceUsd < 50}
            className="w-full sm:w-auto px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>
              {lang === 'ar' 
                ? `شراء سبوت تجريبي فوري ($${((paperAccount.virtualBalanceUsd * allocationPercent) / 100).toFixed(0)})` 
                : `Manual Buy ($${((paperAccount.virtualBalanceUsd * allocationPercent) / 100).toFixed(0)})`}
            </span>
          </button>
        </div>
      </div>

      {/* Active Open Positions Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            {lang === 'ar' ? 'حالات المحاكاة النشطة:' : 'Active Simulation Trackers:'}
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-400">
              {paperAccount.positions.length}
            </span>
          </span>
          <span className="text-[11px] text-gray-500">
            {lang === 'ar' ? 'متابعة حية لأهداف TP1 و TP2 ووقف الخسارة' : 'Live tracking of TP1, TP2 & Trailing SL'}
          </span>
        </div>

        {paperAccount.positions.length === 0 ? (
          <div className="bg-[#090909] p-4 rounded border border-[#1c1c1c] text-center text-xs text-gray-400 space-y-1">
            <p className="font-bold text-gray-300">
              {lang === 'ar' 
                ? 'لا توجد حالات محاكاة نشطة حالياً.' 
                : 'No active simulations right now.'}
            </p>
            <p className="text-[11px] text-gray-500">
              {lang === 'ar'
                ? 'بمجرد صدور إشارة شراء جديدة، سيتم بدء تتبع المحاكاة تلقائياً.'
                : 'When a valid Buy signal is detected, the engine will start tracking it automatically.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {paperAccount.positions.map(pos => {
              const livePrice = currentAsset === pos.asset ? currentPrice : pos.currentPrice;
              const curVal = pos.amount * livePrice;
              const pnlUsd = curVal - pos.allocatedUsd;
              const pnlPct = (pnlUsd / pos.allocatedUsd) * 100;
              const isProfit = pnlUsd >= 0;

              return (
                <div key={pos.id} className="bg-[#0c0c0c] p-3 rounded border border-[#222] space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {pos.asset}/USDT
                      </span>
                      <span className="text-xs text-gray-400">
                        {pos.amount.toFixed(4)} {pos.asset} (${pos.allocatedUsd.toFixed(0)})
                      </span>
                      {pos.trancheCount && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          {pos.trancheCount === 1 ? '🎯 Tranche 1/2 (60%)' : '🎯 Tranche 2/2 (Blended)'}
                        </span>
                      )}
                      {pos.executionSpreadPct !== undefined && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 font-mono">
                          🛡️ {pos.executionSpreadPct.toFixed(3)}% Spread
                        </span>
                      )}
                      {pos.partialSold && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                          TP1 Locked (Break-Even)
                        </span>
                      )}
                    </div>

                    <div className={`text-xs font-bold flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span>{isProfit ? '+' : ''}${pnlUsd.toFixed(2)} ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-[10px] bg-[#070707] p-2 rounded border border-[#191919]">
                    <div>
                      <span className="text-gray-500 block">{lang === 'ar' ? 'الدخول' : 'Entry'}</span>
                      <span className="text-gray-200 font-bold">${pos.entryPrice.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">{lang === 'ar' ? 'السعر الحالي' : 'Mark'}</span>
                      <span className="text-blue-400 font-bold">${livePrice.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">{lang === 'ar' ? 'هدف TP2' : 'TP2'}</span>
                      <span className="text-emerald-400 font-bold">${pos.tp2.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">{lang === 'ar' ? 'وقف الخسارة' : 'Stop'}</span>
                      <span className="text-rose-400 font-bold">${pos.stopLoss.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {new Date(pos.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-emerald-400/80 flex items-center gap-0.5">
                        <Bot className="w-3 h-3" />
                        {lang === 'ar' ? 'مُدارة آلياً' : 'Auto-Managed'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleClosePosition(pos.id, 'Manual Close by User')}
                      className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'إغلاق يدوي' : 'Close'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Auto-Execution Events Stream */}
      {autoEvents.length > 0 && (
        <div className="space-y-1.5 bg-[#0e0e0e] p-2.5 rounded border border-[#222]">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <Activity className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'سجل العمليات الآلية الأخيرة (Auto-Pilot Feed):' : 'Recent Auto-Pilot Actions:'}</span>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1 text-[11px]">
            {autoEvents.slice(0, 5).map((evt, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2 p-1.5 rounded bg-[#141414] border border-[#222]">
                <span className="text-gray-300">
                  {lang === 'ar' ? evt.messageAr : evt.messageEn}
                </span>
                <span className="text-gray-500 shrink-0 text-[10px]">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade History Log Table */}
      {paperAccount.tradeHistory.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#1f1f1f]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-purple-400" />
              {lang === 'ar' ? 'سجل المحاكاة والنتائج الوهمية:' : 'Executed Tracking & Simulated Results:'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCleanGlitchedTrades}
                title={lang === 'ar' ? 'مسح الصفقات ذات الأسعار الخاطئة وتحديث المحفظة' : 'Clean abnormal trades'}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 flex items-center gap-1 transition-all cursor-pointer"
              >
                <Wand2 className="w-3 h-3" />
                <span>{lang === 'ar' ? 'تصحيح وتنظيف المحاكاة' : 'Auto Clean Glitches'}</span>
              </button>
              <span className="text-[11px] text-gray-500">
                {paperAccount.tradeHistory.length} {lang === 'ar' ? 'إشارات منتهية' : 'completed signals'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-56 border border-[#1a1a1a] rounded">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-[#111] text-gray-400 sticky top-0">
                <tr>
                  <th className="p-2">{lang === 'ar' ? 'الأصل' : 'Asset'}</th>
                  <th className="p-2">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="p-2">{lang === 'ar' ? 'سعر الدخول' : 'Entry'}</th>
                  <th className="p-2">{lang === 'ar' ? 'سعر الخروج' : 'Exit'}</th>
                  <th className="p-2">{lang === 'ar' ? 'الربح / الخسارة' : 'PnL'}</th>
                  <th className="p-2">{lang === 'ar' ? 'سبب الخروج والنتيجة' : 'Exit Reason & Note'}</th>
                  <th className="p-2 text-center">{lang === 'ar' ? 'حذف' : 'Del'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181818] bg-[#0a0a0a]">
                {paperAccount.tradeHistory.slice(0, 20).map(trade => (
                  <tr key={trade.id} className="hover:bg-[#121212] transition-colors">
                    <td className="p-2 font-bold text-blue-400">{trade.asset || 'BTC'}</td>
                    <td className="p-2 text-gray-400">{trade.dateFormatted}</td>
                    <td className="p-2 text-gray-300">${trade.entryPrice?.toLocaleString()}</td>
                    <td className="p-2 text-gray-300">${trade.exitPrice?.toLocaleString()}</td>
                    <td className={`p-2 font-bold ${trade.status === 'CLOSED_WIN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent}% (${trade.pnlUsd})
                    </td>
                    <td className="p-2 text-gray-400 truncate max-w-xs">{trade.confluenceReason}</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDeleteTrade(trade.id)}
                        title={lang === 'ar' ? 'حذف هذه الصفقة' : 'Delete trade'}
                        className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

