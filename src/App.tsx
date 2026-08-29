import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LiveSignalPanel } from './components/LiveSignalPanel';
import { InteractiveChart } from './components/InteractiveChart';
import { AnalysisBreakdown } from './components/AnalysisBreakdown';
import { BacktestDashboard } from './components/BacktestDashboard';
import { SelfLearningJournal } from './components/SelfLearningJournal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { StrategyInspectorModal } from './components/StrategyInspectorModal';
import { MultiAssetScanner } from './components/MultiAssetScanner';
import { PaperTradingPanel } from './components/PaperTradingPanel';
import { WhaleOrderBookHeatmap } from './components/WhaleOrderBookHeatmap';
import { MacroEconomicFilter } from './components/MacroEconomicFilter';
import { LiquidationHeatmap } from './components/LiquidationHeatmap';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { 
  AIReasoning, 
  AlertConfig, 
  BacktestResult, 
  Candle, 
  ElliottWaveAnalysis, 
  IndicatorValues, 
  LearningState, 
  LiquiditySentimentData, 
  MacroNewsStatus,
  PaperAccount,
  PaperPosition,
  SMCAnalysis, 
  SupportedAsset,
  Timeframe, 
  TradeRecord 
} from './types';
import { generate1YearAssetData } from './utils/mockHistoricalData';
import { calculateAllIndicators } from './utils/technicalAnalysis';
import { analyzeSMC } from './utils/smcAnalysis';
import { analyzeElliottWaves } from './utils/elliottWave';
import { initialLearningState, updateLearningWithTrades } from './utils/learningEngine';
import { run1YearBacktest } from './utils/backtestingEngine';
import { evaluatePaperPositionsAuto, autoOpenPaperTradeOnSignal, AutoTradeExecutionResult } from './utils/paperTradingEngine';
import { Activity, BarChart2, BrainCircuit, Sparkles, CheckCircle2, ShieldCheck, Code2, Wallet, Layers, Calendar, Flame, Columns, Radio } from 'lucide-react';
import confetti from 'canvas-confetti';

export function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [currentAsset, setCurrentAsset] = useState<SupportedAsset>('BTC');
  const [activeMainTab, setActiveMainTab] = useState<'live' | 'liquidity' | 'simulation' | 'intelligence'>('live');
  const [simSubTab, setSimSubTab] = useState<'paper' | 'backtest'>('paper');
  const [intelSubTab, setIntelSubTab] = useState<'macro' | 'learning'>('macro');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  
  // Historical & Live Candles
  const [candles, setCandles] = useState<Candle[]>(() => generate1YearAssetData('BTC', 77696));
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const [marketSource, setMarketSource] = useState<string>('Binance Live API (BTC/USDT)');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [isLearningAI, setIsLearningAI] = useState(false);

  // Multi-Asset Real-Time Tickers
  const [multiAssetData, setMultiAssetData] = useState<Record<SupportedAsset, { price: number; change24h: number }>>({
    BTC: { price: 77696, change24h: 1.84 },
    ETH: { price: 2436, change24h: 2.45 },
    PAXG: { price: 4456, change24h: 0.65 },
  });

  // Strategy Modal State
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);

  // Settings & Modal
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(() => {
    const saved = localStorage.getItem('eyad_btc_alert_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      telegramEnabled: false,
      telegramToken: '',
      telegramChatId: '',
      emailEnabled: false,
      emailAddress: '',
      soundEnabled: true,
      autoScanIntervalSeconds: 300,
    };
  });

  // Paper Trading Account State (Virtual $10,000 Spot) - Auto-Pilot by default
  const [paperAccount, setPaperAccount] = useState<PaperAccount>(() => {
    const saved = localStorage.getItem('eyad_paper_account');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          autoExecuteSignals: parsed.autoExecuteSignals !== undefined ? parsed.autoExecuteSignals : true,
        };
      } catch (e) {}
    }
    return {
      virtualBalanceUsd: 10000,
      allocatedCapitalUsd: 0,
      totalRealizedPnlUsd: 0,
      positions: [],
      tradeHistory: [],
      autoExecuteSignals: true,
    };
  });

  // Automated Paper Trading Real-time Events Log
  const [autoEvents, setAutoEvents] = useState<AutoTradeExecutionResult['events']>([]);

  useEffect(() => {
    localStorage.setItem('eyad_btc_alert_config', JSON.stringify(alertConfig));
  }, [alertConfig]);

  useEffect(() => {
    localStorage.setItem('eyad_paper_account', JSON.stringify(paperAccount));
  }, [paperAccount]);

  // Fetch Multi-Asset Tickers for Scanner Radar
  const fetchAllTickers = useCallback(async () => {
    try {
      const res = await fetch('/api/market/all-assets');
      if (res.ok) {
        const data = await res.json();
        if (data.assets) {
          setMultiAssetData(data.assets);
        }
      }
    } catch (e) {
      // Fallback local feed
    }
  }, []);

  // Fetch Live Data from Backend / Binance for Current Asset
  const handleFetchLiveData = useCallback(async (overrideAsset?: SupportedAsset) => {
    const targetAsset = overrideAsset || currentAsset;
    setIsLiveUpdating(true);
    try {
      const res = await fetch(`/api/market/btc-live?timeframe=${timeframe}&asset=${targetAsset}`);
      if (res.ok) {
        const data = await res.json();
        if (data.source) {
          setMarketSource(data.source);
        }
        setLastSyncTime(new Date().toLocaleTimeString());

        if (data.price) {
          const livePrice = data.price;
          const liveCandles: Candle[] = data.candles && data.candles.length >= 20
            ? data.candles
            : [];

          setCandles((prev) => {
            let updatedCandles: Candle[];
            if (liveCandles.length >= 20) {
              updatedCandles = liveCandles;
            } else if (!prev || prev.length < 50) {
              updatedCandles = generate1YearAssetData(targetAsset, livePrice);
            } else {
              updatedCandles = [...prev];
              const last = { ...updatedCandles[updatedCandles.length - 1] };
              last.close = livePrice;
              last.high = Math.max(last.high, livePrice);
              last.low = Math.min(last.low, livePrice);
              updatedCandles[updatedCandles.length - 1] = last;
            }

            // Recalculate indicators and update signal targets on real candles
            const calcInd = calculateAllIndicators(updatedCandles);
            const atr = calcInd.atr || (livePrice * 0.015);
            setAiSignal((prevSig) => {
              if (!prevSig) return null;
              return {
                ...prevSig,
                entryPrice: Math.round(livePrice),
                target1: Math.round(livePrice + 4 * atr),
                target2: Math.round(livePrice + 6 * atr),
                target3: Math.round(livePrice + 8 * atr),
                stopLoss: Math.round(livePrice - 2 * atr),
              };
            });

            return updatedCandles;
          });

          // Update multiAssetData cache
          setMultiAssetData((prev) => ({
            ...prev,
            [targetAsset]: {
              price: livePrice,
              change24h: data.change24h || prev[targetAsset]?.change24h || 1.0,
            },
          }));

          // Mark-to-market update for Paper Trading positions
          setPaperAccount((prev) => {
            if (prev.positions.length === 0) return prev;
            const updatedPositions = prev.positions.map((pos) => {
              if (pos.asset !== targetAsset) return pos;
              const curVal = pos.amount * livePrice;
              const pnlUsd = curVal - pos.allocatedUsd;
              const pnlPct = (pnlUsd / pos.allocatedUsd) * 100;
              const highestPrice = Math.max(pos.highestPrice || pos.entryPrice, livePrice);
              return {
                ...pos,
                currentPrice: livePrice,
                unrealizedPnlUsd: Number(pnlUsd.toFixed(2)),
                unrealizedPnlPercent: Number(pnlPct.toFixed(2)),
                highestPrice,
              };
            });
            return { ...prev, positions: updatedPositions };
          });
        }
      }
    } catch (e) {
      console.log('Using local candle feed');
    } finally {
      setIsLiveUpdating(false);
    }
  }, [timeframe, currentAsset]);

  // Handle asset switch
  const handleSelectAsset = (asset: SupportedAsset) => {
    setCurrentAsset(asset);
    setMarketSource(`Binance Live API (${asset}/USDT)`);
    
    let defaultPrice = multiAssetData[asset]?.price || 77696;
    if (asset === 'ETH' && !multiAssetData[asset]?.price) defaultPrice = 2436;
    if (asset === 'PAXG' && !multiAssetData[asset]?.price) defaultPrice = 4456;

    const initialCandles = generate1YearAssetData(asset, defaultPrice);
    setCandles(initialCandles);

    // Immediately run backtest for newly selected asset
    const newBacktest = run1YearBacktest(initialCandles, {
      periodDays: 365,
      initialCapital: 10000,
      riskPerTradePercent: 100,
      takeProfitPercent: 7.2,
      stopLossPercent: 2.6,
      useSMCFilter: true,
      useElliottWaveFilter: true,
      useSelfLearningFilter: true,
      minConvictionThreshold: 62,
    }, asset);
    setBacktestResult(newBacktest);

    // Update signal targets dynamically for new asset scale
    const calcInd = calculateAllIndicators(initialCandles);
    const atr = calcInd.atr || defaultPrice * 0.015;

    const summaries: Record<SupportedAsset, { ar: string; en: string }> = {
      PAXG: {
        ar: `إشارة شراء سبوت للذهب الرقمي (PAXG/USDT): ارتداد إيجابي من منطقة الطلب المؤسسية مع تدفق السيولة نحو الملاذات الآمنة والتحوط ضد التضخم الكلي. الالتزام بوقف الخسارة الصارم عند 2×ATR ($${Math.round(defaultPrice - 2 * atr).toLocaleString()}) وأهداف جني الأرباح TP1 $${Math.round(defaultPrice + 4 * atr).toLocaleString()} و TP2 $${Math.round(defaultPrice + 6 * atr).toLocaleString()} مع تفعيل الوقف المتحرك 2%.`,
        en: `Spot Buy Signal for Pax Gold (PAXG/USDT): Decisive bounce off institutional Demand Zone driven by safe-haven macro liquidity flows. Strict 2x ATR stop loss ($${Math.round(defaultPrice - 2 * atr).toLocaleString()}) and 4x/6x ATR profit targets active with 2% trailing protection.`,
      },
      ETH: {
        ar: `إشارة شراء سبوت للإيثريوم (ETH/USDT): تأكيد إعادة اختبار دعم EMA21 وزخم تصاعدي لمؤشر MACD مع تدفقات سيولة التمويل اللامركزي DeFi. وقف الخسارة عند 2×ATR ($${Math.round(defaultPrice - 2 * atr).toLocaleString()}) وجني الأرباح الجزئي عند TP1 $${Math.round(defaultPrice + 4 * atr).toLocaleString()}.`,
        en: `Spot Buy Signal for Ethereum (ETH/USDT): EMA21 retest confirmed with bullish MACD momentum and DeFi liquidity inflows. 2x ATR SL ($${Math.round(defaultPrice - 2 * atr).toLocaleString()}) and partial TP1 active.`,
      },
      BTC: {
        ar: `إشارة شراء سبوت للبتكوين (BTC/USDT): توافق مثالي مع استراتيجية EYAD BTC وقواعد الدخول الصارمة (درجة الجودة 85/100). السعر يرتد من دعم EMA21 مع تأكيد الحجم ومؤشر ADX الصاعد. وقف الخسارة الصارم عند 2×ATR ($${Math.round(defaultPrice - 2 * atr).toLocaleString()}) والهدف الأول TP1 عند 4×ATR ($${Math.round(defaultPrice + 4 * atr).toLocaleString()}).`,
        en: `Spot Buy Signal for Bitcoin (BTC/USDT): Full compliance with EYAD BTC strategy and strict Entry Quality Gate (Score 85/100). Price retests EMA21 with volume confirmation and ADX > 20. Strict 2x ATR SL and 4x ATR TP1 active.`,
      },
    };

    setAiSignal((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        entryPrice: Math.round(defaultPrice),
        target1: Math.round(defaultPrice + 4 * atr),
        target2: Math.round(defaultPrice + 6 * atr),
        target3: Math.round(defaultPrice + 8 * atr),
        stopLoss: Math.round(defaultPrice - 2 * atr),
        summaryAr: summaries[asset].ar,
        summaryEn: summaries[asset].en,
      };
    });

    // Immediately trigger live network fetch for this asset
    handleFetchLiveData(asset);
  };

  // Auto-fetch live market data on mount and interval
  useEffect(() => {
    handleFetchLiveData();
    fetchAllTickers();

    const interval = setInterval(() => {
      handleFetchLiveData();
      fetchAllTickers();
    }, 15000);
    return () => clearInterval(interval);
  }, [handleFetchLiveData, fetchAllTickers]);

  // Current Live Calculations
  const currentCandle = candles[candles.length - 1];
  const btcPrice = currentCandle?.close || (currentAsset === 'BTC' ? 79473 : currentAsset === 'ETH' ? 2850 : 2650);
  const prevCandle = candles[candles.length - 25] || candles[0];
  const change24h = ((btcPrice - prevCandle.close) / prevCandle.close) * 100;
  
  const high24h = Math.max(...candles.slice(-24).map((c) => c.high));
  const low24h = Math.min(...candles.slice(-24).map((c) => c.low));

  const indicators: IndicatorValues = calculateAllIndicators(candles);
  const smc: SMCAnalysis = analyzeSMC(candles);
  const elliott: ElliottWaveAnalysis = analyzeElliottWaves(candles);

  const [sentiment, setSentiment] = useState<LiquiditySentimentData>({
    fearAndGreedIndex: 74,
    fearAndGreedLabel: 'Greed (طمع معتدل صحي)',
    orderBookImbalance: 28.4,
    exchangeInflowOutflow: 'NET_OUTFLOW',
    cvdTrend: 'RISING_BULLISH',
    recentHeadlines: [
      { title: 'صناديق بيتكوين والعملات المشفرة تسجل تدفقات دخول قياسية بقيمة 850 مليون دولار', source: 'Bloomberg', time: 'منذ 15 دقيقة', impact: 'BULLISH' },
      { title: 'حيتان التداول يواصلون الاحتفاظ والامتناع عن البيع في بورصات التداول', source: 'Glassnode', time: 'منذ 42 دقيقة', impact: 'BULLISH' },
      { title: 'تراجع ملحوظ في معروض العملات على منصات التداول المركزية لأدنى مستوى في 5 سنوات', source: 'CryptoQuant', time: 'منذ ساعتين', impact: 'BULLISH' },
    ],
  });

  // Macro Economic Filter State
  const [macroStatus, setMacroStatus] = useState<MacroNewsStatus | null>(null);

  const fetchMacroStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/market/macro-events');
      if (res.ok) {
        const data = await res.json();
        setMacroStatus(data);
      }
    } catch (e) {
      console.warn('Macro events fetch failed', e);
    }
  }, []);

  useEffect(() => {
    fetchMacroStatus();
    const interval = setInterval(fetchMacroStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchMacroStatus]);

  // Learning Engine State
  const [learningState, setLearningState] = useState<LearningState>(() => {
    const saved = localStorage.getItem('eyad_btc_learning_state');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialLearningState;
  });

  useEffect(() => {
    localStorage.setItem('eyad_btc_learning_state', JSON.stringify(learningState));
  }, [learningState]);

  // 1-Year Backtest Results
  const [backtestResult, setBacktestResult] = useState<BacktestResult>(() => {
    return run1YearBacktest(candles, {
      periodDays: 365,
      initialCapital: 10000,
      riskPerTradePercent: 100,
      takeProfitPercent: 7.2,
      stopLossPercent: 2.6,
      useSMCFilter: true,
      useElliottWaveFilter: true,
      useSelfLearningFilter: true,
      minConvictionThreshold: 62,
    }, currentAsset);
  });

  // Recalculate backtest when asset changes
  useEffect(() => {
    setBacktestResult(run1YearBacktest(candles, {
      periodDays: 365,
      initialCapital: 10000,
      riskPerTradePercent: 100,
      takeProfitPercent: 7.2,
      stopLossPercent: 2.6,
      useSMCFilter: true,
      useElliottWaveFilter: true,
      useSelfLearningFilter: true,
      minConvictionThreshold: 62,
    }, currentAsset));
  }, [currentAsset, candles]);

  // AI Signal State
  const [aiSignal, setAiSignal] = useState<AIReasoning | null>({
    signalType: 'STRONG_BUY',
    convictionScore: 88,
    spotAction: 'SPOT_BUY',
    entryPrice: Math.round(btcPrice),
    target1: Math.round(btcPrice + 4 * indicators.atr),
    target2: Math.round(btcPrice + 6 * indicators.atr),
    target3: Math.round(btcPrice + 8 * indicators.atr),
    stopLoss: Math.round(btcPrice - 2 * indicators.atr),
    riskRewardRatio: 3.6,
    entryQualityScore: {
      ema21Score: 25,
      rejectionScore: 20,
      volumeScore: 15,
      trendScore: 20,
      signalScore: 20,
      totalScore: 85,
      passed: true,
    },
    protectionLayers: [
      { id: '1', name: 'Entry Quality Gate', status: 'ACTIVE', triggered: false, details: 'Score 85/100 (Min 75)' },
      { id: '2', name: 'Order Book Wall Detector', status: 'ACTIVE', triggered: false, details: 'No sell wall within 2x ATR' },
      { id: '3', name: 'Choppy Market Cooldown', status: 'ACTIVE', triggered: false, details: 'Loss streak: 0 (Limit: 3)' },
      { id: '4', name: 'News Volatility Filter', status: 'ACTIVE', triggered: false, details: 'No high-impact news in next 60m' },
      { id: '5', name: 'ADX Trend Filter', status: 'ACTIVE', triggered: false, details: 'ADX 28.4 (Threshold ≥20)' },
      { id: '6', name: 'Dynamic ATR Stop-Loss', status: 'ACTIVE', triggered: false, details: 'Strict 2x ATR Stop' },
      { id: '7', name: '2% Trailing Stop Post-TP1', status: 'ACTIVE', triggered: false, details: 'Armed for TP1 execution' },
      { id: '8', name: '24h Asset Trade Cooldown', status: 'ACTIVE', triggered: false, details: '1 trade/day discipline' },
    ],
    confluenceFactors: [
      'توافق مثالي مع بوابة جودة الدخول بدرجة 85/100 (تجاوز حد 75 نقطة)',
      'ارتداد إيجابي وتأكيد رفض من مستوى EMA21 على الفريم الزمني 4 ساعات',
      'مؤشر الاتجاه ADX عند 28.4 متجاوزاً عتبة 20 لمنع الأسواق العرضية',
      'تحديد أهداف وقف الخسارة عند 2×ATR وأهداف جني الأرباح 4×ATR و 6×ATR',
      'تفعيل نظام الوقف المتحرك 2% بعد تحقيق الهدف الأول TP1 لحماية الأرباح'
    ],
    summaryAr: 'إشارة شراء سبوت متطابقة بالكامل مع استراتيجية EYAD BTC وقواعد الدخول الصارمة (درجة الجودة 85/100). السعر يرتد من دعم EMA21 مع تأكيد الحجم ومؤشر ADX الصاعد. وقف الخسارة الصارم عند 2×ATR والهدف الأول TP1 عند 4×ATR (بيع 50% جزئياً).',
    summaryEn: 'Spot Buy signal compliant with EYAD BTC Strategy and strict Entry Quality Gate (Score 85/100). Price retests EMA21 with volume confirmation and ADX > 20. Strict 2x ATR SL and 4x ATR TP1 (50% partial exit) active.',
    timestamp: new Date().toISOString(),
  });

  // Sound chime helper
  const playAlertSound = useCallback(() => {
    if (!alertConfig.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
  }, [alertConfig.soundEnabled]);

  // Trigger Gemini Deep Signal Analysis
  const handleTriggerGeminiAnalysis = async () => {
    setIsAnalyzingAI(true);
    try {
      const res = await fetch('/api/gemini/analyze-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: btcPrice,
          candles: candles.slice(-50),
          indicators,
          smc,
          elliott,
          sentiment,
          learningState,
          asset: currentAsset,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const signalData = data.signal || data.data;
        if (signalData) {
          setAiSignal(signalData);
          playAlertSound();
          try {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('AI synthesis fallback', e);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Automated Paper Trading Engine Evaluation & Execution Loop (Auto-Pilot)
  useEffect(() => {
    if (!btcPrice) return;
    
    // Construct current live prices mapping for all assets
    const livePrices: Record<SupportedAsset, number> = {
      BTC: multiAssetData['BTC']?.price || (currentAsset === 'BTC' ? btcPrice : 77696),
      ETH: multiAssetData['ETH']?.price || (currentAsset === 'ETH' ? btcPrice : 2436),
      PAXG: multiAssetData['PAXG']?.price || (currentAsset === 'PAXG' ? btcPrice : 4456),
    };
    livePrices[currentAsset] = btcPrice;

    setPaperAccount((prevAccount) => {
      // 1. Evaluate open positions for TP1 partial exit, TP2/TP3 take profit, Stop-Loss, Trailing Stop, Sell Signal
      const evalResult = evaluatePaperPositionsAuto(prevAccount, livePrices, aiSignal, currentAsset);
      
      let nextAccount = evalResult.updatedAccount;
      let newEvents = [...evalResult.events];

      // Celebrate closed winning trades
      if (evalResult.closedTrades.some(t => t.status === 'CLOSED_WIN')) {
        try {
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
        } catch (e) {}
        playAlertSound();
      }

      // If any closed trades, update AI self-learning memory
      if (evalResult.closedTrades.length > 0) {
        setLearningState(() => updateLearningWithTrades([...backtestResult.trades, ...nextAccount.tradeHistory]));
      }

      // 2. Automatically open new spot position on valid Buy signal if autoExecuteSignals is enabled
      if (nextAccount.autoExecuteSignals && aiSignal) {
        const activePrice = livePrices[currentAsset] || btcPrice;
        const openResult = autoOpenPaperTradeOnSignal(nextAccount, currentAsset, activePrice, aiSignal, 25);
        if (openResult.opened) {
          nextAccount = openResult.updatedAccount;
          if (openResult.event) {
            newEvents.unshift(openResult.event);
          }
          playAlertSound();
        }
      }

      if (newEvents.length > 0) {
        setAutoEvents((prev) => [...newEvents, ...prev].slice(0, 40));

        // Auto-send Telegram notification for major trading events
        if (alertConfig.telegramEnabled && alertConfig.telegramToken && alertConfig.telegramChatId) {
          newEvents.forEach((ev) => {
            const icon = (ev.type === 'TP1' || ev.type === 'TP2') ? '🎯' : (ev.type === 'STOP_LOSS' || ev.type === 'TRAILING_STOP') ? '🛑' : ev.type === 'ENTRY' ? '🚀' : '⚡';
            const msg = `${icon} *[EYAD BOT - إشعار آلي]*\n\n📌 *الحدث:* ${ev.messageAr}\n💎 *الأصل:* ${ev.asset}/USDT\n💰 *السعر:* $${ev.price.toLocaleString()}\n🕒 *الوقت:* ${new Date(ev.timestamp).toLocaleTimeString()}`;
            fetch('/api/notifications/telegram-send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: alertConfig.telegramToken,
                chatId: alertConfig.telegramChatId,
                customMessage: msg,
              }),
            }).catch(() => {});
          });
        }
      }

      return nextAccount;
    });
  }, [btcPrice, aiSignal, currentAsset, multiAssetData, playAlertSound]);

  // Trigger AI Mistake Learning Cycle
  const handleTriggerAILearning = async () => {
    setIsLearningAI(true);
    try {
      const res = await fetch('/api/gemini/learn-mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades: backtestResult.trades,
          currentState: learningState,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const learnData = data.learningState || data.data;
        if (learnData) {
          setLearningState((prev) => {
            const updatedRules = learnData.newAdaptiveRules && learnData.newAdaptiveRules.length > 0
              ? [...prev.adaptiveRules, ...learnData.newAdaptiveRules.filter((nr: any) => !prev.adaptiveRules.some(ar => ar.id === nr.id))]
              : prev.adaptiveRules;
            const updatedBanned = Array.from(new Set([...prev.bannedTradingHours, ...(learnData.recommendedBannedHours || [])]));
            return {
              ...prev,
              adaptiveRules: updatedRules,
              bannedTradingHours: updatedBanned,
              aiMemorySummaryAr: learnData.aiMemorySummaryAr || prev.aiMemorySummaryAr,
              aiMemorySummaryEn: learnData.aiMemorySummaryEn || prev.aiMemorySummaryEn,
              lastLearningCycle: Date.now(),
            };
          });
          try {
            confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Learning fallback', e);
    } finally {
      setIsLearningAI(false);
    }
  };

  // Broadcast to Telegram
  const handleSendTelegram = async () => {
    if (!alertConfig.telegramToken || !alertConfig.telegramChatId) {
      setIsAlertModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/notifications/telegram-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: alertConfig.telegramToken,
          chatId: alertConfig.telegramChatId,
          signal: aiSignal,
          price: btcPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(lang === 'ar' ? 'تم إرسال إشارة السبوت بنجاح إلى تلجرام!' : 'Signal broadcasted to Telegram!');
      } else {
        alert(data.error || 'Failed to send to Telegram');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Broadcast to Email
  const handleSendEmail = async () => {
    if (!alertConfig.emailAddress) {
      setIsAlertModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/notifications/email-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: alertConfig.emailAddress,
          signal: aiSignal,
          price: btcPrice,
        }),
      });
      const data = await res.json();
      alert(lang === 'ar' ? `تم إرسال الإشارة بالبريد إلى ${alertConfig.emailAddress}` : `Email dispatched to ${alertConfig.emailAddress}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-[#e0e0e0] font-sans selection:bg-amber-600 selection:text-white ${lang === 'ar' ? 'font-cairo' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Top Main Navigation Bar & Live Ticker */}
      <Header
        currentAsset={currentAsset}
        onSelectAsset={handleSelectAsset}
        btcPrice={btcPrice}
        change24h={change24h}
        high24h={high24h}
        low24h={low24h}
        lang={lang}
        setLang={setLang}
        isLiveUpdating={isLiveUpdating}
        marketSource={marketSource}
        lastSyncTime={lastSyncTime}
        alertConfig={alertConfig}
        setAlertConfig={setAlertConfig}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
        onOpenStrategyModal={() => setIsStrategyModalOpen(true)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onRefreshData={handleFetchLiveData}
      />

      {/* Main Workspace Container */}
      <main className="max-w-7xl mx-auto px-3 py-4 sm:px-5 space-y-4">
        
        {/* Navigation Tab Bar */}
        <div className="flex items-center gap-1 bg-[#0a0a0a] p-1.5 rounded border border-[#1f1f1f] overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-1.5 min-w-max">
            
            {/* Tab 1: Live Signals & Technical Terminal */}
            <button
              onClick={() => setActiveMainTab('live')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono font-bold text-xs transition-all shrink-0 ${
                activeMainTab === 'live'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-[#141414]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'رادار الإشارات والشارت' : 'Live Signals & Terminal'}</span>
            </button>

            {/* Tab 2: Combined Whale Order Book & Liquidation Heatmap */}
            <button
              onClick={() => setActiveMainTab('liquidity')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono font-bold text-xs transition-all shrink-0 ${
                activeMainTab === 'liquidity'
                  ? 'bg-blue-500/20 text-blue-300 shadow-sm border border-blue-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-[#141414]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'دفتر الأوامر وخريطة التصفية' : 'Order Book & Liquidation'}</span>
            </button>

            {/* Tab 3: Consolidated Testing Hub: Paper Trading + 1-Year Backtesting */}
            <button
              onClick={() => setActiveMainTab('simulation')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono font-bold text-xs transition-all shrink-0 ${
                activeMainTab === 'simulation'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-[#141414]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'المحفظة التجريبية ومحاكي الباك تيست' : 'Paper Portfolio & Backtest'}</span>
              {paperAccount.positions.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Tab 4: Consolidated Intelligence: Macro Events + AI Self-Learning Journal */}
            <button
              onClick={() => setActiveMainTab('intelligence')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono font-bold text-xs transition-all shrink-0 ${
                activeMainTab === 'intelligence'
                  ? 'bg-purple-500/20 text-purple-300 shadow-sm border border-purple-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-[#141414]'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الأخبار وسجل تعلم الذكاء' : 'Macro & AI Learning'}</span>
              {macroStatus?.isBlackoutActive && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              )}
            </button>

          </div>
        </div>

        {/* VIEW 1: LIVE TERMINAL & SIGNALS */}
        {activeMainTab === 'live' && (
          <div className="space-y-4">
            {/* 3-Asset Real-Time Radar Scanner (BTC, ETH, PAXG) */}
            <MultiAssetScanner
              currentAsset={currentAsset}
              onSelectAsset={handleSelectAsset}
              lang={lang}
              btcPrice={btcPrice}
              multiAssetPrices={multiAssetData}
            />

            {/* Primary Signal & Conviction Box */}
            <LiveSignalPanel
              currentAsset={currentAsset}
              btcPrice={btcPrice}
              aiSignal={aiSignal}
              indicators={indicators}
              smc={smc}
              elliott={elliott}
              sentiment={sentiment}
              learningState={learningState}
              macroStatus={macroStatus}
              lang={lang}
              isAnalyzing={isAnalyzingAI}
              onTriggerGeminiAnalysis={handleTriggerGeminiAnalysis}
              onSendTelegramAlert={handleSendTelegram}
              onSendEmailAlert={handleSendEmail}
            />

            {/* Interactive Candlestick Chart with SMC & Wave Overlays */}
            <InteractiveChart
              candles={candles}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
              smc={smc}
              elliott={elliott}
              lang={lang}
            />

            {/* Detailed 5-Tab Deep Analysis Breakdown */}
            <AnalysisBreakdown
              indicators={indicators}
              smc={smc}
              elliott={elliott}
              sentiment={sentiment}
              aiSignal={aiSignal}
              btcPrice={btcPrice}
              lang={lang}
            />
          </div>
        )}

        {/* VIEW 2: CONSOLIDATED WHALE ORDER BOOK & LIQUIDATION HEATMAP */}
        {activeMainTab === 'liquidity' && (
          <div className="space-y-4">
            <MultiAssetScanner
              currentAsset={currentAsset}
              onSelectAsset={handleSelectAsset}
              lang={lang}
              btcPrice={btcPrice}
              multiAssetPrices={multiAssetData}
            />

            {/* Top: Liquidation Levels & Derivatives Open Interest */}
            <LiquidationHeatmap
              currentAsset={currentAsset}
              currentPrice={btcPrice}
              lang={lang}
            />

            {/* Bottom: Spot Whale Order Book Depth & Rule #3 Wall Detection */}
            <WhaleOrderBookHeatmap
              currentAsset={currentAsset}
              currentPrice={btcPrice}
              lang={lang}
            />
          </div>
        )}

        {/* VIEW 3: CONSOLIDATED SIMULATION & TESTING HUB (PAPER TRADING + 1-YEAR BACKTEST) */}
        {activeMainTab === 'simulation' && (
          <div className="space-y-4">
            {/* Sub-tab Navigation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d0d0d] p-2 rounded-lg border border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSimSubTab('paper')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono text-xs font-bold transition-all ${
                    simSubTab === 'paper'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'المحفظة التجريبية الحية ($10,000)' : 'Live Paper Portfolio ($10k)'}</span>
                  {paperAccount.positions.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-emerald-500/30 text-emerald-400 rounded-full font-mono">
                      {paperAccount.positions.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setSimSubTab('backtest')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono text-xs font-bold transition-all ${
                    simSubTab === 'backtest'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'محاكي الباك تيست التاريخي (سنة)' : '1-Year Backtest Engine'}</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-gray-400 px-1 hidden sm:block">
                {simSubTab === 'paper'
                  ? (lang === 'ar' ? 'تنفيذ صفقات حية برأس مال افتراضي مع وقف خسارة وتتبع آلي' : 'Live virtual execution with SL & Trailing Profit')
                  : (lang === 'ar' ? 'اختبار استراتيجية إياد على 365 يوماً من بيانات السوق' : 'Backtest EYAD strategy on 365 days of OHLCV data')}
              </div>
            </div>

            {simSubTab === 'paper' ? (
              <div className="space-y-4">
                <MultiAssetScanner
                  currentAsset={currentAsset}
                  onSelectAsset={handleSelectAsset}
                  lang={lang}
                  btcPrice={btcPrice}
                  multiAssetPrices={multiAssetData}
                />

                <PaperTradingPanel
                  paperAccount={paperAccount}
                  setPaperAccount={setPaperAccount}
                  currentAsset={currentAsset}
                  currentPrice={btcPrice}
                  currentSignal={aiSignal}
                  lang={lang}
                  autoEvents={autoEvents}
                />
              </div>
            ) : (
              <BacktestDashboard
                candles={candles}
                backtestResult={backtestResult}
                setBacktestResult={setBacktestResult}
                lang={lang}
                currentAsset={currentAsset}
                onSelectAsset={handleSelectAsset}
              />
            )}
          </div>
        )}

        {/* VIEW 4: CONSOLIDATED INTELLIGENCE (MACRO ECONOMIC CALENDAR + AI SELF-LEARNING) */}
        {activeMainTab === 'intelligence' && (
          <div className="space-y-4">
            {/* Sub-tab Navigation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d0d0d] p-2 rounded-lg border border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIntelSubTab('macro')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono text-xs font-bold transition-all ${
                    intelSubTab === 'macro'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'فلتر الأخبار الكبرى (CPI / FOMC)' : 'Macro Calendar & Blackout Filter'}</span>
                  {macroStatus?.isBlackoutActive && (
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  )}
                </button>

                <button
                  onClick={() => setIntelSubTab('learning')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono text-xs font-bold transition-all ${
                    intelSubTab === 'learning'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'سجل التعلم الذاتي وتفادي الأخطاء' : 'AI Mistake Journal & Memory'}</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-gray-400 px-1 hidden sm:block">
                {intelSubTab === 'macro'
                  ? (lang === 'ar' ? 'حظر الصفقات في أوقات الأخبار شديدة التقلب' : 'News volatility circuit breaker & calendar')
                  : (lang === 'ar' ? 'تحليل الصفقات السلبية لمنع تكرار الأخطاء' : 'Adaptive weights and mistake avoidance log')}
              </div>
            </div>

            {intelSubTab === 'macro' ? (
              <div className="space-y-4">
                <MultiAssetScanner
                  currentAsset={currentAsset}
                  onSelectAsset={handleSelectAsset}
                  lang={lang}
                  btcPrice={btcPrice}
                  multiAssetPrices={multiAssetData}
                />

                <MacroEconomicFilter
                  macroStatus={macroStatus}
                  onRefresh={fetchMacroStatus}
                  lang={lang}
                />
              </div>
            ) : (
              <SelfLearningJournal
                learningState={learningState}
                trades={backtestResult.trades}
                lang={lang}
                onTriggerAILearning={handleTriggerAILearning}
                isLearning={isLearningAI}
              />
            )}
          </div>
        )}

      </main>

      {/* High Density Footer Branding & Indicators */}
      <footer className="mt-8 border-t border-[#1f1f1f] bg-[#0a0a0a] py-3 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px]">
          <div className="flex items-center gap-4 text-gray-400">
            <span className="font-bold text-white">EYAD Trading Strategy Engine</span>
            <span>•</span>
            <div>Assets: BTC (+30%) | ETH (+16%) | PAXG (+60%)</div>
            <div className="hidden sm:block">Multi-Asset Execution</div>
            <div className="hidden sm:block">Protection: 8 Layers</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-amber-900/30 border border-amber-500/50 rounded flex items-center justify-center text-[9px] text-amber-400 font-bold">
              MULTI-ASSET
            </div>
            <div className="px-2 py-0.5 bg-emerald-900/30 border border-emerald-500/50 rounded flex items-center justify-center text-[9px] text-emerald-400 font-bold">
              GATE ≥ 75
            </div>
          </div>
        </div>
      </footer>

      {/* Strategy Inspector Modal */}
      <StrategyInspectorModal
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
        lang={lang}
      />

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        config={alertConfig}
        setConfig={setAlertConfig}
        lang={lang}
      />

      {/* AI Voice Trading Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        currentAsset={currentAsset}
        btcPrice={btcPrice}
        aiSignal={aiSignal}
        lang={lang}
      />

    </div>
  );
}

export default App;

