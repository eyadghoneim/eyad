import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Zap, 
  RefreshCw, 
  Settings2, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  Database,
  Coins
} from 'lucide-react';
import { BacktestParams, BacktestResult, Candle, SupportedAsset } from '../types';
import { run1YearBacktest } from '../utils/backtestingEngine';
import confetti from 'canvas-confetti';

interface BacktestDashboardProps {
  candles: Candle[];
  backtestResult: BacktestResult;
  setBacktestResult: (res: BacktestResult) => void;
  lang: 'ar' | 'en';
  currentAsset?: SupportedAsset;
  onSelectAsset?: (asset: SupportedAsset) => void;
}

export const BacktestDashboard: React.FC<BacktestDashboardProps> = ({
  candles,
  backtestResult,
  setBacktestResult,
  lang,
  currentAsset = 'BTC',
  onSelectAsset,
}) => {
  const [params, setParams] = useState<BacktestParams>({
    periodDays: 365,
    initialCapital: 10000,
    riskPerTradePercent: 100,
    takeProfitPercent: 6.5,
    stopLossPercent: 2.8,
    useSMCFilter: true,
    useElliottWaveFilter: true,
    useSelfLearningFilter: true,
    minConvictionThreshold: 75,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [activeView, setActiveView] = useState<'curve' | 'monthly' | 'trades'>('curve');
  const [presetMode, setPresetMode] = useState<'high_growth' | 'balanced' | 'conservative'>('high_growth');
  const [historicalFetchStatus, setHistoricalFetchStatus] = useState<'IDLE' | 'FETCHING_BINANCE' | 'SUCCESS_BINANCE' | 'FALLBACK'>('IDLE');

  const executeBacktestWithHistoricalData = async (targetParams: BacktestParams) => {
    setIsRunning(true);
    setHistoricalFetchStatus('FETCHING_BINANCE');
    const targetAsset: SupportedAsset = (currentAsset as SupportedAsset) || 'BTC';

    let backtestCandles: Candle[] = candles;

    try {
      // Attempt to pull real Binance historical klines directly from backend proxy
      const res = await fetch(`/api/market/historical?asset=${targetAsset}&interval=4h&limit=1000`);
      if (res.ok) {
        const data = await res.json();
        if (data?.candles && Array.isArray(data.candles) && data.candles.length >= 100) {
          backtestCandles = data.candles;
          setHistoricalFetchStatus('SUCCESS_BINANCE');
        } else {
          setHistoricalFetchStatus('FALLBACK');
        }
      } else {
        setHistoricalFetchStatus('FALLBACK');
      }
    } catch (e) {
      setHistoricalFetchStatus('FALLBACK');
    }

    // Run backtest with realistic 0.10% fees and 0.05% slippage applied
    const result = run1YearBacktest(backtestCandles, targetParams, targetAsset);
    setBacktestResult(result);
    setIsRunning(false);

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    } catch (e) {}
  };

  const applyPreset = (mode: 'high_growth' | 'balanced' | 'conservative') => {
    setPresetMode(mode);
    let newParams: BacktestParams;
    if (mode === 'high_growth') {
      newParams = {
        ...params,
        takeProfitPercent: 7.2,
        stopLossPercent: 2.6,
        minConvictionThreshold: 62,
        useSMCFilter: true,
        useElliottWaveFilter: true,
        useSelfLearningFilter: true,
      };
    } else if (mode === 'balanced') {
      newParams = {
        ...params,
        takeProfitPercent: 6.0,
        stopLossPercent: 2.4,
        minConvictionThreshold: 68,
        useSMCFilter: true,
        useElliottWaveFilter: true,
        useSelfLearningFilter: true,
      };
    } else {
      newParams = {
        ...params,
        takeProfitPercent: 5.5,
        stopLossPercent: 2.2,
        minConvictionThreshold: 78,
        useSMCFilter: true,
        useElliottWaveFilter: true,
        useSelfLearningFilter: true,
      };
    }
    setParams(newParams);
    executeBacktestWithHistoricalData(newParams);
  };

  const handleRunBacktest = () => {
    executeBacktestWithHistoricalData(params);
  };

  const handleAutoOptimize = () => {
    applyPreset('high_growth');
  };

  const isBinanceSource = backtestResult.dataSource === 'BINANCE_HISTORICAL';

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4 space-y-4 font-mono">
      
      {/* Top Banner: Title + Quick Run & Auto-Optimize buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#1f1f1f]">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>{lang === 'ar' ? 'محاكي الباك تيست التاريخي' : 'Historical Backtest Engine'}</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {currentAsset}/USDT
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-gray-300 border border-[#222]">
              {backtestResult.candleCount ? `${backtestResult.candleCount} Klines (4H)` : '1000 Klines'}
            </span>

            {/* Provenance Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
              isBinanceSource
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
            }`}>
              <Database className="w-3 h-3" />
              <span>
                {isBinanceSource 
                  ? 'LIVE BINANCE'
                  : 'FALLBACK SYNTHETIC'
                }
              </span>
            </span>

            {/* Fees Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-950/40 text-purple-300 border border-purple-500/30">
              <Coins className="w-3 h-3" />
              <span>{lang === 'ar' ? 'خصم 0.10% عمولة + 0.05% سبريد' : '0.10% Fee + 0.05% Spread'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/30 border border-red-500/30 rounded text-red-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {lang === 'ar' 
                ? 'تحذير بحثي: الاستراتيجية لم تتفوق على (Buy & Hold) في العينات المختبرة بعد خصم العمولات.' 
                : 'Research Note: Strategy did not outperform Buy & Hold in tested samples after fees.'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Asset quick toggle if provided */}
          {onSelectAsset && (
            <div className="flex items-center bg-[#121212] p-0.5 rounded border border-[#262626] text-xs">
              {(['BTC', 'ETH', 'PAXG'] as SupportedAsset[]).map((ast) => (
                <button
                  key={ast}
                  onClick={() => onSelectAsset(ast)}
                  className={`px-2.5 py-1 rounded font-bold text-xs transition-all ${
                    currentAsset === ast
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {ast}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleAutoOptimize}
            disabled={isRunning}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold border border-blue-500/40 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'التحسين التلقائي للنتائج' : 'Auto-Optimize Strategy'}</span>
          </button>

          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#1a1a1a] hover:bg-[#252525] text-white text-xs font-bold border border-[#333] transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? (lang === 'ar' ? 'جاري المحاكاة...' : 'Running...') : (lang === 'ar' ? 'إعادة تشغيل الباك تيست' : 'Run Backtest')}</span>
          </button>
        </div>
      </div>

      {/* KPI Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Total Return % */}
        <div className="bg-[#0c0c0c] p-3 rounded border border-green-500/30 relative overflow-hidden">
          <div className="text-[10px] text-gray-500 uppercase font-sans">{lang === 'ar' ? 'العائد النظري للمحاكاة' : 'Simulated Return'}</div>
          <div className="text-lg sm:text-xl font-bold text-green-400 mt-0.5">
            +{backtestResult.totalReturnPercent}%
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5 font-sans">
            ${backtestResult.initialCapital.toLocaleString()} ➔ ${backtestResult.finalCapital.toLocaleString()}
          </div>
        </div>

        {/* BTC / Asset Hold Benchmark */}
        <div className="bg-[#0c0c0c] p-3 rounded border border-[#222]">
          <div className="text-[10px] text-gray-500 uppercase font-sans">
            {lang === 'ar' ? `عائد احتفاظ (${currentAsset} HODL)` : `${currentAsset} HODL Return`}
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-200 mt-0.5">
            +{backtestResult.btcBuyHoldReturnPercent}%
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 font-sans">
            {lang === 'ar' ? `مقارنة ${currentAsset}` : `${currentAsset} Benchmark`}
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-[#0c0c0c] p-3 rounded border border-[#222]">
          <div className="text-[10px] text-gray-500 uppercase font-sans">{lang === 'ar' ? 'نسبة دقة التتبع' : 'Tracking Accuracy'}</div>
          <div className="text-lg sm:text-xl font-bold text-green-400 mt-0.5">
            {backtestResult.winRate}%
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {backtestResult.winningTrades}W / {backtestResult.losingTrades}L
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-[#0c0c0c] p-3 rounded border border-[#222]">
          <div className="text-[10px] text-gray-500 uppercase font-sans">{lang === 'ar' ? 'معامل الكفاءة النظرية' : 'Efficiency Factor'}</div>
          <div className="text-lg sm:text-xl font-bold text-cyan-400 mt-0.5">
            {backtestResult.profitFactor}
          </div>
          <div className="text-[10px] text-cyan-500 mt-0.5 font-sans">
            {lang === 'ar' ? 'مستوى الأبحاث' : 'Research Level'}
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-[#0c0c0c] p-3 rounded border border-[#222]">
          <div className="text-[10px] text-gray-500 uppercase font-sans">{lang === 'ar' ? 'أقصى تراجع نظري' : 'Theoretical Drawdown'}</div>
          <div className="text-lg sm:text-xl font-bold text-red-400 mt-0.5">
            -{backtestResult.maxDrawdownPercent}%
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 font-sans">
            {lang === 'ar' ? 'محاكاة الهبوط' : 'Simulated Drops'}
          </div>
        </div>

        {/* Total Trades & Sharpe */}
        <div className="bg-[#0c0c0c] p-3 rounded border border-[#222]">
          <div className="text-[10px] text-gray-500 uppercase font-sans">{lang === 'ar' ? 'معدل شارب والإشارات' : 'Sharpe / Signals'}</div>
          <div className="text-lg sm:text-xl font-bold text-blue-400 mt-0.5">
            {backtestResult.sharpeRatio}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {backtestResult.totalTrades} {lang === 'ar' ? 'إشارة' : 'Signals'}
          </div>
        </div>
      </div>

      {/* Interactive Controls & Strategy Tuning Parameters */}
      <div className="bg-[#080808] p-3.5 rounded border border-[#1f1f1f] space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            {lang === 'ar' ? 'أنماط المخاطرة:' : 'Risk Profiles:'}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => applyPreset('high_growth')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                presetMode === 'high_growth'
                  ? 'bg-blue-600 text-white border border-blue-400 shadow'
                  : 'bg-[#151515] text-gray-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {lang === 'ar' ? 'مخاطرة عالية' : 'High Risk'}
            </button>
            <button
              onClick={() => applyPreset('balanced')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                presetMode === 'balanced'
                  ? 'bg-emerald-700 text-white border border-emerald-500 shadow'
                  : 'bg-[#151515] text-gray-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {lang === 'ar' ? 'مخاطرة متوسطة' : 'Balanced Risk'}
            </button>
            <button
              onClick={() => applyPreset('conservative')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                presetMode === 'conservative'
                  ? 'bg-purple-800 text-white border border-purple-500 shadow'
                  : 'bg-[#151515] text-gray-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {lang === 'ar' ? 'مخاطرة منخفضة' : 'Low Risk'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Take Profit Target % */}
          <div>
            <div className="flex justify-between text-gray-400 mb-1">
              <span>{lang === 'ar' ? 'هدف النجاح المرجعي (Target %)' : 'Reference Target %'}</span>
              <span className="text-green-400 font-bold">+{params.takeProfitPercent}%</span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              step="0.5"
              value={params.takeProfitPercent}
              onChange={(e) => setParams({ ...params, takeProfitPercent: parseFloat(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Stop Loss % */}
          <div>
            <div className="flex justify-between text-gray-400 mb-1">
              <span>{lang === 'ar' ? 'وقف الخسارة الصارم (SL %)' : 'Stop Loss %'}</span>
              <span className="text-red-400 font-bold">-{params.stopLossPercent}%</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="6"
              step="0.1"
              value={params.stopLossPercent}
              onChange={(e) => setParams({ ...params, stopLossPercent: parseFloat(e.target.value) })}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          {/* Min Conviction Threshold */}
          <div>
            <div className="flex justify-between text-gray-400 mb-1">
              <span>{lang === 'ar' ? 'الحد الأدنى لثقة الدخول' : 'Min Conviction'}</span>
              <span className="text-cyan-400 font-bold">{params.minConvictionThreshold}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="90"
              step="2"
              value={params.minConvictionThreshold}
              onChange={(e) => setParams({ ...params, minConvictionThreshold: parseInt(e.target.value, 10) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Filter Toggles */}
          <div className="flex flex-col justify-center space-y-1">
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={params.useSMCFilter}
                onChange={(e) => setParams({ ...params, useSMCFilter: e.target.checked })}
                className="rounded accent-blue-600"
              />
              <span>{lang === 'ar' ? 'تفعيل فلتر SMC' : 'Enable SMC Filter'}</span>
            </label>
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={params.useSelfLearningFilter}
                onChange={(e) => setParams({ ...params, useSelfLearningFilter: e.target.checked })}
                className="rounded accent-blue-600"
              />
              <span>{lang === 'ar' ? 'فلتر التعلم من الأخطاء' : 'Enable Mistake Learning'}</span>
            </label>
          </div>

        </div>
      </div>

      {/* Main Backtest View Selector (Equity Curve / Monthly / Trades Journal) */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 border-b border-[#1f1f1f] pb-2 text-xs">
          <button
            onClick={() => setActiveView('curve')}
            className={`px-3 py-1 rounded font-bold transition-all ${
              activeView === 'curve' ? 'bg-blue-600 text-white shadow-sm border border-blue-400/40' : 'text-gray-400 hover:text-white hover:bg-[#141414] border border-transparent'
            }`}
          >
            {lang === 'ar' ? 'منحنى نمو رأس المال (Equity Curve)' : 'Equity Growth Curve'}
          </button>
          <button
            onClick={() => setActiveView('monthly')}
            className={`px-3 py-1 rounded font-bold transition-all ${
              activeView === 'monthly' ? 'bg-blue-600 text-white shadow-sm border border-blue-400/40' : 'text-gray-400 hover:text-white hover:bg-[#141414] border border-transparent'
            }`}
          >
            {lang === 'ar' ? 'الأداء الشهري' : 'Monthly Performance'}
          </button>
          <button
            onClick={() => setActiveView('trades')}
            className={`px-3 py-1 rounded font-bold transition-all ${
              activeView === 'trades' ? 'bg-blue-600 text-white shadow-sm border border-blue-400/40' : 'text-gray-400 hover:text-white hover:bg-[#141414] border border-transparent'
            }`}
          >
            {lang === 'ar' ? 'سجل المحاكاة التاريخية' : 'Historical Tracking Journal'} ({backtestResult.trades.length})
          </button>
        </div>

        {/* View 1: Equity Curve SVG Visualizer */}
        {activeView === 'curve' && (
          <div className="bg-[#050505] p-3.5 rounded border border-[#1f1f1f]">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2.5">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-green-400 rounded-full inline-block" />
                  <span className="text-green-400 font-semibold">{lang === 'ar' ? 'نمو المحاكاة' : 'Simulation Equity'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-gray-500 rounded-full inline-block" />
                  <span>{lang === 'ar' ? `شراء واحتفاظ (${currentAsset} HODL)` : `${currentAsset} Buy & Hold`}</span>
                </div>
              </div>
              <div className="text-[11px] text-gray-500">{lang === 'ar' ? 'سنة كاملة (365 يوم)' : '365 Days Historical Run'}</div>
            </div>

            {/* Simple Dynamic SVG Curve */}
            <div className="w-full h-48 sm:h-64 relative">
              {(() => {
                const curve = backtestResult.equityCurve;
                if (curve.length === 0) return null;
                const maxEq = Math.max(...curve.map((c) => Math.max(c.botEquity, c.btcHoldEquity)));
                const minEq = Math.min(...curve.map((c) => Math.min(c.botEquity, c.btcHoldEquity, params.initialCapital * 0.9)));
                const range = maxEq - minEq || 1;

                const getPt = (idx: number, val: number, w: number, h: number) => {
                  const x = (idx / (curve.length - 1)) * (w - 60) + 10;
                  const y = h - ((val - minEq) / range) * (h - 30) - 15;
                  return { x, y };
                };

                const botPath = curve.map((pt, i) => {
                  const { x, y } = getPt(i, pt.botEquity, 800, 240);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');

                const holdPath = curve.map((pt, i) => {
                  const { x, y } = getPt(i, pt.btcHoldEquity, 800, 240);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');

                return (
                  <svg viewBox="0 0 800 240" className="w-full h-full overflow-visible">
                    {/* Grid lines */}
                    {[0.2, 0.5, 0.8].map((pct, i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={240 * pct}
                        x2="780"
                        y2={240 * pct}
                        stroke="#1a1a1a"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* BTC Hold Line */}
                    <path d={holdPath} fill="none" stroke="#555" strokeWidth="1.5" strokeDasharray="3 3" />

                    {/* Bot Strategy Line */}
                    <path d={botPath} fill="none" stroke="#22c55e" strokeWidth="2.5" />
                  </svg>
                );
              })()}
            </div>
          </div>
        )}

        {/* View 2: Monthly Performance */}
        {activeView === 'monthly' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {backtestResult.monthlyPerformance.map((m) => (
              <div key={m.month} className="bg-[#0c0c0c] p-2.5 rounded border border-[#222] text-center">
                <div className="text-[11px] font-sans text-gray-400">{m.month}</div>
                <div className={`text-sm font-bold mt-0.5 ${m.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {m.returnPercent >= 0 ? '+' : ''}{m.returnPercent}%
                </div>
                <div className="text-[9px] text-gray-500 mt-0.5">
                  {m.tradesCount} {lang === 'ar' ? 'إشارة' : 'signals'} • {m.winRate}% WR
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View 3: Historical Trades Journal */}
        {activeView === 'trades' && (
          <div className="bg-[#050505] rounded border border-[#1f1f1f] overflow-x-auto max-h-96">
            <table className="w-full text-xs text-right">
              <thead className="bg-[#141414] text-gray-400 border-b border-[#222] sticky top-0 text-[11px]">
                <tr>
                  <th className="p-2">{lang === 'ar' ? 'التاريخ والساعة' : 'Date / Hour'}</th>
                  <th className="p-2">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="p-2">{lang === 'ar' ? 'سعر الدخول' : 'Entry'}</th>
                  <th className="p-2">{lang === 'ar' ? 'سعر الخروج' : 'Exit'}</th>
                  <th className="p-2">{lang === 'ar' ? 'الربح / الخسارة' : 'PnL %'}</th>
                  <th className="p-2">{lang === 'ar' ? 'المدة' : 'Duration'}</th>
                  <th className="p-2 font-sans">{lang === 'ar' ? 'سبب الخسارة / الدرس المستفاد' : 'Loss Root Cause / Lesson'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {backtestResult.trades.map((t) => {
                  const isWin = t.status === 'CLOSED_WIN';
                  return (
                    <tr key={t.id} className="hover:bg-[#141414] transition-all">
                      <td className="p-2 text-gray-300">
                        {t.dateFormatted} <span className="text-gray-500 text-[10px]">({t.hourOfDay}:00 UTC)</span>
                      </td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-900/20 text-green-400 border border-green-500/30">
                          BUY
                        </span>
                      </td>
                      <td className="p-2 text-gray-200">${t.entryPrice.toLocaleString()}</td>
                      <td className="p-2 text-gray-200">${(t.exitPrice || t.entryPrice).toLocaleString()}</td>
                      <td className="p-2">
                        <span className={`font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                          {isWin ? '+' : ''}{t.pnlPercent}%
                        </span>
                      </td>
                      <td className="p-2 text-gray-400">{t.durationHours}h</td>
                      <td className="p-2 font-sans text-gray-400 max-w-xs truncate" title={isWin ? t.learnedLessonAr : t.lossRootCause}>
                        {isWin ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            {lang === 'ar' ? 'وصول للهدف المرجعي' : 'Target Reached'}
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            {lang === 'ar' ? t.lossRootCause : t.lossRootCause}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
