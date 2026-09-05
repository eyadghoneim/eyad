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
import { BotOperationsPanel } from './components/BotOperationsPanel';
import { LiquidationHeatmap } from './components/LiquidationHeatmap';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { MacroLiquidityPanel } from './components/MacroLiquidityPanel';
import { StablecoinFlowPanel } from './components/StablecoinFlowPanel';
import { DexVolumePanel } from './components/DexVolumePanel';
import { OpenInterestPanel } from './components/OpenInterestPanel';
import { BridgeFlowPanel } from './components/BridgeFlowPanel';
import { LiquidityRegimeScorecard } from './components/LiquidityRegimeScorecard';
import { 
  AIReasoning, 
  AlertConfig, 
  BacktestResult, 
  Candle, 
  ElliottWaveAnalysis, 
  IndicatorValues, 
  LearningState, 
  LiquidityRegimeScorecard as LiquidityRegimeData,
  LiquiditySentimentData, 
  MacroNewsStatus,
  PaperAccount,
  PaperPosition,
  SMCAnalysis, 
  SupportedAsset,
  Timeframe, 
  TradeRecord,
  ConfigChecksumReport,
  SyncableBotConfig
} from './types';
import { 
  extractLocalSyncableConfig, 
  computeConfigChecksum, 
  detectConfigDiscrepancies 
} from './utils/configChecksum';
import { generate1YearAssetData } from './utils/mockHistoricalData';
import { calculateAllIndicators } from './utils/technicalAnalysis';
import { analyzeSMC } from './utils/smcAnalysis';
import { analyzeElliottWaves } from './utils/elliottWave';
import { initialLearningState, updateLearningWithTrades } from './utils/learningEngine';
import { run1YearBacktest } from './utils/backtestingEngine';
import { evaluatePaperPositionsAuto, autoOpenPaperTradeOnSignal, AutoTradeExecutionResult } from './utils/paperTradingEngine';
import { getBotAdminHeaders } from './utils/botAdminAuth';
import { QuantRiskDashboard } from './components/QuantRiskDashboard';
import { Activity, BarChart2, BrainCircuit, Sparkles, CheckCircle2, ShieldCheck, Code2, Wallet, Layers, Calendar, Flame, Columns, Radio, Cpu } from 'lucide-react';
import confetti from 'canvas-confetti';

function applyLiquidityRegimeToSignal(signal: AIReasoning, regime: LiquidityRegimeData | null, lang: 'ar' | 'en'): AIReasoning {
  if (!signal || !regime) return signal;

  const previousAdjustment = signal.liquidityRegime?.totalAdjustment || 0;
  const baseConviction = (signal.convictionScore || 0) - previousAdjustment;
  const adjustedConviction = Math.max(0, Math.min(100, Math.round(baseConviction + (regime.totalAdjustment || 0))));
  const signalType = adjustedConviction >= 85
    ? 'STRONG_BUY'
    : adjustedConviction >= 70
    ? 'BUY'
    : adjustedConviction <= 18
    ? 'STRONG_SELL'
    : adjustedConviction <= 35
    ? 'SELL'
    : 'HOLD';
  const spotAction = adjustedConviction >= 70
    ? 'SPOT_BUY'
    : adjustedConviction <= 35
    ? 'SPOT_SELL_ALL'
    : 'SPOT_HOLD';

  const overlayLineAr = `طبقة السيولة الكلية عدّلت الثقة بمقدار ${regime.totalAdjustment > 0 ? '+' : ''}${regime.totalAdjustment} نقطة (${regime.verdict}).`;
  const overlayLineEn = `Liquidity regime overlay adjusted conviction by ${regime.totalAdjustment > 0 ? '+' : ''}${regime.totalAdjustment} points (${regime.verdict}).`;
  const cleanSummaryAr = (signal.summaryAr || '').replace(/\s*طبقة السيولة الكلية عدّلت الثقة بمقدار .*?\./g, '').trim();
  const cleanSummaryEn = (signal.summaryEn || '').replace(/\s*Liquidity regime overlay adjusted conviction by .*?\./g, '').trim();
  const overlayFactor = lang === 'ar'
    ? `طبقة السيولة: ${regime.summaryAr}`
    : `Liquidity overlay: ${regime.summaryEn}`;

  return {
    ...signal,
    convictionScore: adjustedConviction,
    signalType,
    spotAction,
    summaryAr: `${cleanSummaryAr} ${overlayLineAr}`.trim(),
    summaryEn: `${cleanSummaryEn} ${overlayLineEn}`.trim(),
    confluenceFactors: [overlayFactor, ...(signal.confluenceFactors || []).filter((item) => !item.startsWith('طبقة السيولة:') && !item.startsWith('Liquidity overlay:'))].slice(0, 8),
    liquidityRegime: regime,
  };
}

export function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [currentAsset, setCurrentAsset] = useState<SupportedAsset>('BTC');
  const [activeMainTab, setActiveMainTab] = useState<'live' | 'liquidity' | 'simulation' | 'intelligence' | 'quant'>('live');
  const [simSubTab, setSimSubTab] = useState<'paper' | 'backtest' | 'quant'>('paper');
  const [intelSubTab, setIntelSubTab] = useState<'macro' | 'learning' | 'ops'>('macro');
  const [currentDerivatives, setCurrentDerivatives] = useState<{ fundingRate: number; sentiment: string } | null>(null);
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
      try {
        const parsed = JSON.parse(saved);
        return {
          telegramEnabled: Boolean(parsed.telegramEnabled),
          telegramToken: parsed.telegramToken || '',
          telegramChatId: parsed.telegramChatId || '',
          soundEnabled: parsed.soundEnabled !== undefined ? Boolean(parsed.soundEnabled) : true,
          autoScanIntervalSeconds: Number(parsed.autoScanIntervalSeconds) || 300,
          serverHasTelegramToken: Boolean(parsed.serverHasTelegramToken || parsed.telegramToken),
          serverHasTelegramChatId: Boolean(parsed.serverHasTelegramChatId || parsed.telegramChatId),
          maskedTelegramToken: parsed.maskedTelegramToken || (parsed.telegramToken ? `${parsed.telegramToken.slice(0, 4)}••••${parsed.telegramToken.slice(-4)}` : ''),
          maskedTelegramChatId: parsed.maskedTelegramChatId || (parsed.telegramChatId ? `${parsed.telegramChatId.slice(0, 2)}••••${parsed.telegramChatId.slice(-2)}` : ''),
        };
      } catch (e) {}
    }
    return {
      telegramEnabled: false,
      telegramToken: '',
      telegramChatId: '',
      soundEnabled: true,
      autoScanIntervalSeconds: 300,
      serverHasTelegramToken: false,
      serverHasTelegramChatId: false,
      maskedTelegramToken: '',
      maskedTelegramChatId: '',
    };
  });

  // Paper Trading Account State (Virtual $10,000 Spot) - Auto-Pilot by default
  const [paperAccount, setPaperAccount] = useState<PaperAccount>(() => {
    const saved = localStorage.getItem('eyad_paper_account');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        // Sanitize legacy glitched trades (e.g. cross-asset leak where ETH had PAXG $4,392 price)
        const validHistory = (parsed.tradeHistory || []).filter((t: any) => {
          const isGlitch = (t.asset === 'ETH' && t.exitPrice > 3500) || 
                           (t.asset === 'ETH' && t.entryPrice > 3500) || 
                           Math.abs(t.pnlPercent) > 60;
          return !isGlitch;
        });
        const recalculatedRealized = Number(validHistory.reduce((sum: number, t: any) => sum + (Number(t.pnlUsd) || 0), 0).toFixed(2));
        const currentAllocated = (parsed.positions || []).reduce((sum: number, p: any) => sum + (Number(p.allocatedUsd) || 0), 0);
        const correctedBalance = Number((10000 + recalculatedRealized - currentAllocated).toFixed(2));

        return {
          ...parsed,
          virtualBalanceUsd: Math.max(0, correctedBalance),
          totalRealizedPnlUsd: recalculatedRealized,
          tradeHistory: validHistory,
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
    localStorage.setItem('eyad_btc_alert_config', JSON.stringify({
      telegramEnabled: alertConfig.telegramEnabled,
      telegramToken: alertConfig.telegramToken || '',
      telegramChatId: alertConfig.telegramChatId || '',
      soundEnabled: alertConfig.soundEnabled,
      autoScanIntervalSeconds: alertConfig.autoScanIntervalSeconds,
      serverHasTelegramToken: alertConfig.serverHasTelegramToken,
      serverHasTelegramChatId: alertConfig.serverHasTelegramChatId,
      maskedTelegramToken: alertConfig.maskedTelegramToken,
      maskedTelegramChatId: alertConfig.maskedTelegramChatId,
    }));
  }, [alertConfig]);

  const [currentSpreadPct, setCurrentSpreadPct] = useState<number>(0.024);

  // Auto-sync paperAccount with server-side database
  useEffect(() => {
    localStorage.setItem('eyad_paper_account', JSON.stringify(paperAccount));
    const timer = setTimeout(() => {
      fetch('/api/paper/account', {
        method: 'POST',
        headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ account: paperAccount }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [paperAccount]);

  // Track live order book spread for active asset
  useEffect(() => {
    const fetchSpread = async () => {
      try {
        const res = await fetch(`/api/market/depth?asset=${currentAsset}`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data.spreadPercent === 'number') {
            setCurrentSpreadPct(data.spreadPercent);
          }
        }
      } catch {}
    };
    fetchSpread();
    const interval = setInterval(fetchSpread, 15000);
    return () => clearInterval(interval);
  }, [currentAsset]);

  // Checksum Engine State
  const [checksumReport, setChecksumReport] = useState<ConfigChecksumReport | null>(null);
  const [isChecksumSyncing, setIsChecksumSyncing] = useState<boolean>(false);

  // Verification & Sync function comparing localStorage with Backend Config
  const verifyAndSyncConfigChecksum = useCallback(async (forceUpdateServer = false) => {
    setIsChecksumSyncing(true);
    try {
      // 1. Hydrate paper account first if newer
      try {
        const paperRes = await fetch('/api/paper/account', { headers: getBotAdminHeaders() });
        if (paperRes.ok) {
          const pData = await paperRes.json();
          if (pData?.account && (pData.account.tradeHistory?.length > 0 || pData.account.positions?.length > 0)) {
            setPaperAccount((prev) => {
              if ((pData.account.tradeHistory?.length || 0) >= (prev.tradeHistory?.length || 0)) {
                return {
                  ...prev,
                  ...pData.account,
                  trancheModeEnabled: pData.account.trancheModeEnabled ?? prev.trancheModeEnabled ?? true,
                  spreadFilterEnabled: pData.account.spreadFilterEnabled ?? prev.spreadFilterEnabled ?? true,
                  maxSpreadTolerancePct: pData.account.maxSpreadTolerancePct ?? prev.maxSpreadTolerancePct ?? 0.15,
                };
              }
              return prev;
            });
          }
        }
      } catch {}

      // 2. Extract snapshot from client LocalStorage
      const localConfig = extractLocalSyncableConfig();
      const localChecksum = await computeConfigChecksum(localConfig);

      // 3. Fetch server configuration & checksum
      const res = await fetch('/api/bot/checksum', { headers: getBotAdminHeaders() });
      if (!res.ok) {
        setChecksumReport({
          localChecksum,
          serverChecksum: 'OFFLINE',
          isMatch: false,
          syncedAt: Date.now(),
          syncAction: 'ERROR',
          differences: ['Backend server offline or unreachable'],
          details: {
            telegramConfigured: Boolean(localConfig.telegramToken && localConfig.telegramChatId),
            scanIntervalSeconds: localConfig.scanIntervalSeconds,
            spreadFilterEnabled: localConfig.spreadFilterEnabled,
            maxSpreadPercent: localConfig.maxSpreadPercent,
            trancheModeEnabled: localConfig.trancheModeEnabled,
            tranche1Percent: localConfig.tranche1Percent,
            tranche2Percent: localConfig.tranche2Percent,
            adaptiveRulesCount: localConfig.adaptiveRulesCount || 0,
            bannedHoursCount: localConfig.bannedTradingHours?.length || 0,
            paperAutoExecute: localConfig.paperAutoExecute ?? true,
          },
        });
        return;
      }

      const data = await res.json();
      const serverChecksum = data.checksum || '';
      const serverCanonical = data.canonicalConfig || {};
      const serverSafe = data.config || {};

      const diffs = detectConfigDiscrepancies(localConfig, { ...serverSafe, ...serverCanonical });
      const hasDiscrepancy = diffs.length > 0 || forceUpdateServer;

      if (!hasDiscrepancy && (localChecksum === serverChecksum || serverSafe.hasTelegramToken)) {
        // Exact match confirmed
        setChecksumReport({
          localChecksum,
          serverChecksum: serverChecksum || localChecksum,
          isMatch: true,
          syncedAt: Date.now(),
          syncAction: 'IN_SYNC',
          differences: [],
          details: {
            telegramConfigured: Boolean(serverSafe.hasTelegramToken || localConfig.telegramToken),
            scanIntervalSeconds: serverCanonical.scanIntervalSeconds || localConfig.scanIntervalSeconds,
            spreadFilterEnabled: serverCanonical.spreadFilterEnabled ?? localConfig.spreadFilterEnabled,
            maxSpreadPercent: serverCanonical.maxSpreadPercent ?? localConfig.maxSpreadPercent,
            trancheModeEnabled: serverCanonical.trancheModeEnabled ?? localConfig.trancheModeEnabled,
            tranche1Percent: serverCanonical.tranche1Percent ?? localConfig.tranche1Percent,
            tranche2Percent: serverCanonical.tranche2Percent ?? localConfig.tranche2Percent,
            adaptiveRulesCount: localConfig.adaptiveRulesCount || 0,
            bannedHoursCount: localConfig.bannedTradingHours?.length || 0,
            paperAutoExecute: localConfig.paperAutoExecute ?? true,
          },
        });

        // Hydrate local UI with server-masked tokens if available
        setAlertConfig((prev) => ({
          ...prev,
          telegramEnabled: typeof serverSafe.telegramEnabled === 'boolean' ? serverSafe.telegramEnabled : prev.telegramEnabled,
          autoScanIntervalSeconds: Number(serverSafe.scanIntervalSeconds) || prev.autoScanIntervalSeconds,
          serverHasTelegramToken: Boolean(serverSafe.hasTelegramToken || prev.serverHasTelegramToken),
          serverHasTelegramChatId: Boolean(serverSafe.hasTelegramChatId || prev.serverHasTelegramChatId),
          maskedTelegramToken: serverSafe.maskedTelegramToken || prev.maskedTelegramToken,
          maskedTelegramChatId: serverSafe.maskedTelegramChatId || prev.maskedTelegramChatId,
        }));
        return;
      }

      // 4. Discrepancy detected: Immediately update backend server to match client settings
      const syncRes = await fetch('/api/bot/sync-checksum', {
        method: 'POST',
        headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          clientConfig: localConfig,
          clientChecksum: localChecksum,
        }),
      });

      if (syncRes.ok) {
        const syncData = await syncRes.json();
        const verifiedChecksum = syncData.checksum || localChecksum;
        
        setChecksumReport({
          localChecksum: verifiedChecksum,
          serverChecksum: verifiedChecksum,
          isMatch: true,
          syncedAt: Date.now(),
          syncAction: 'SERVER_UPDATED',
          differences: diffs,
          details: {
            telegramConfigured: Boolean(localConfig.telegramToken && localConfig.telegramChatId),
            scanIntervalSeconds: localConfig.scanIntervalSeconds,
            spreadFilterEnabled: localConfig.spreadFilterEnabled,
            maxSpreadPercent: localConfig.maxSpreadPercent,
            trancheModeEnabled: localConfig.trancheModeEnabled,
            tranche1Percent: localConfig.tranche1Percent,
            tranche2Percent: localConfig.tranche2Percent,
            adaptiveRulesCount: localConfig.adaptiveRulesCount || 0,
            bannedHoursCount: localConfig.bannedTradingHours?.length || 0,
            paperAutoExecute: localConfig.paperAutoExecute ?? true,
          },
        });

        if (syncData.config) {
          setAlertConfig((prev) => ({
            ...prev,
            telegramEnabled: syncData.config.telegramEnabled ?? true,
            serverHasTelegramToken: true,
            serverHasTelegramChatId: true,
            maskedTelegramToken: syncData.config.maskedTelegramToken || `${localConfig.telegramToken.slice(0, 4)}••••${localConfig.telegramToken.slice(-4)}`,
            maskedTelegramChatId: syncData.config.maskedTelegramChatId || `${localConfig.telegramChatId.slice(0, 2)}••••${localConfig.telegramChatId.slice(-2)}`,
            autoScanIntervalSeconds: syncData.config.scanIntervalSeconds || prev.autoScanIntervalSeconds,
          }));
        }
      }
    } catch (e) {
      console.warn('verifyAndSyncConfigChecksum failure:', e);
    } finally {
      setIsChecksumSyncing(false);
    }
  }, []);

  // Run Checksum verification immediately upon application load
  useEffect(() => {
    verifyAndSyncConfigChecksum();
  }, [verifyAndSyncConfigChecksum]);

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

          // Only update candles and AI signal if targetAsset is the active currentAsset!
          if (targetAsset === currentAsset) {
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
          }

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
        ar: `محاكاة الذهب الرقمي (PAXG/USDT): ارتداد إيجابي افتراضي من منطقة الطلب المؤسسية مع تدفق السيولة نحو الملاذات الآمنة. جميع البيانات والشروحات هي لمحاكاة الأبحاث فقط (Paper Trading).`,
        en: `PAXG/USDT Simulation: Virtual bounce off institutional Demand Zone driven by safe-haven macro liquidity flows. All data and analysis are for research and simulation purposes only.`,
      },
      ETH: {
        ar: `محاكاة الإيثريوم (ETH/USDT): إعادة اختبار وهمي لدعم EMA21 وزخم تصاعدي لمؤشر MACD مع تدفقات سيولة التمويل اللامركزي DeFi. الشرح التحليلي هو للمحاكاة والقياس التاريخي.`,
        en: `ETH/USDT Simulation: Theoretical EMA21 retest confirmed with bullish MACD momentum and DeFi liquidity inflows. Analysis is for simulation and historical measurement.`,
      },
      BTC: {
        ar: `محاكاة البتكوين (BTC/USDT): السعر يختبر دعم EMA21 مع حجم التداول ومؤشر ADX الصاعد. يرجى ملاحظة أن هذه الواجهة هي دراسة تحليلية (محاكاة) وليست إشارة دخول أو تنبيه تداول.`,
        en: `BTC/USDT Simulation: Price retests EMA21 with volume confirmation and ADX > 20. Note that this dashboard is purely an analytical simulation, not a live execution signal.`,
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
    fearAndGreedIndex: 50,
    fearAndGreedLabel: 'Neutral',
    isSimulated: true,
    recentHeadlines: [],
  });

  // Macro Economic Filter State
  const [macroStatus, setMacroStatus] = useState<MacroNewsStatus | null>(null);
  const [liquidityRegime, setLiquidityRegime] = useState<LiquidityRegimeData | null>(null);

  const fetchLiquidityRegime = useCallback(async (asset: SupportedAsset = currentAsset) => {
    try {
      const res = await fetch(`/api/llama/liquidity-regime?asset=${asset}`);
      if (!res.ok) return;
      const data = await res.json();
      setLiquidityRegime(data);
    } catch (e) {
      console.warn('Liquidity regime fetch failed', e);
    }
  }, [currentAsset]);

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
    fetchLiquidityRegime(currentAsset);
    const interval = setInterval(() => {
      fetchMacroStatus();
      fetchLiquidityRegime(currentAsset);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchMacroStatus, fetchLiquidityRegime, currentAsset]);

  // Periodically fetch live derivatives data for Funding & Overheat Risk Guards
  useEffect(() => {
    let isMounted = true;
    const fetchDeriv = async () => {
      try {
        const res = await fetch(`/api/market/derivatives?asset=${currentAsset}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setCurrentDerivatives({ fundingRate: data.fundingRate, sentiment: data.sentiment });
        }
      } catch {}
    };
    fetchDeriv();
    const interval = setInterval(fetchDeriv, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentAsset]);

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
  const [aiSignal, setAiSignal] = useState<AIReasoning | null>(null);

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
        headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          price: btcPrice,
          candles: candles.slice(-50),
          indicators,
          smc,
          elliott,
          sentiment,
          learningState,
          asset: currentAsset,
          liquidityRegime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const signalData = data.signal || data.data;
        if (signalData) {
          setAiSignal(applyLiquidityRegimeToSignal(signalData, liquidityRegime, lang));
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

  useEffect(() => {
    setAiSignal((prev) => (prev ? applyLiquidityRegimeToSignal(prev, liquidityRegime, lang) : prev));
  }, [liquidityRegime, lang]);

  // Automated Paper Trading Engine Evaluation & Execution Loop (Auto-Pilot)
  useEffect(() => {
    if (!btcPrice) return;
    
    // Construct current live prices mapping for all assets strictly isolated
    const livePrices: Record<SupportedAsset, number> = {
      BTC: currentAsset === 'BTC' ? btcPrice : (multiAssetData['BTC']?.price || 77696),
      ETH: currentAsset === 'ETH' ? btcPrice : (multiAssetData['ETH']?.price || 2436),
      PAXG: currentAsset === 'PAXG' ? btcPrice : (multiAssetData['PAXG']?.price || 4456),
    };

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
        const openResult = autoOpenPaperTradeOnSignal(
          nextAccount,
          currentAsset,
          activePrice,
          aiSignal,
          25,
          currentSpreadPct,
          currentDerivatives || undefined
        );
        if (openResult.opened) {
          nextAccount = openResult.updatedAccount;
          if (openResult.event) {
            newEvents.unshift(openResult.event);
          }
          playAlertSound();
        } else if (openResult.event) {
          // Log spread delay event
          newEvents.unshift(openResult.event);
        }
      }

      if (newEvents.length > 0) {
        setAutoEvents((prev) => [...newEvents, ...prev].slice(0, 40));

        // Auto-send Telegram notification for major trading events respecting Alert Tiers
        const alertTiers = alertConfig.telegramAlertTiers || { urgentTrades: true, positionUpdates: true, dailyDigest: true };
        if (alertConfig.telegramEnabled && alertConfig.telegramToken && alertConfig.telegramChatId) {
          newEvents.forEach((ev) => {
            // Check tier permissions
            const isUrgent = ev.type === 'ENTRY';
            const isPositionUpdate = ev.type === 'TP1' || ev.type === 'TP2' || ev.type === 'STOP_LOSS' || ev.type === 'TRAILING_STOP' || ev.type === 'SELL_SIGNAL';
            
            if (isUrgent && alertTiers.urgentTrades === false) return;
            if (isPositionUpdate && alertTiers.positionUpdates === false) return;

            const icon = (ev.type === 'TP1' || ev.type === 'TP2') ? '🎯' : (ev.type === 'STOP_LOSS' || ev.type === 'TRAILING_STOP') ? '🛑' : ev.type === 'ENTRY' ? '🚀' : '⚡';
            const tierTitle = isUrgent ? '🚨 [URGENT TRADE | تنفيذ فوري]' : '📊 [POSITION UPDATE | تحديث صفقة]';
            const msg = `${icon} <b>${tierTitle}</b>\n\n📌 <b>الحدث:</b> ${ev.messageAr}\n💎 <b>الأصل:</b> ${ev.asset}/USDT\n💰 <b>السعر:</b> $${ev.price.toLocaleString()}\n🕒 <b>الوقت:</b> ${new Date(ev.timestamp).toLocaleTimeString()}`;
            fetch('/api/notifications/telegram-send', {
              method: 'POST',
              headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
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
    const hasLocalTelegram = Boolean(alertConfig.telegramToken.trim() && alertConfig.telegramChatId.trim());
    const hasServerTelegram = Boolean(alertConfig.serverHasTelegramToken && alertConfig.serverHasTelegramChatId);
    if (!hasLocalTelegram && !hasServerTelegram) {
      setIsAlertModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/notifications/telegram-send', {
        method: 'POST',
        headers: getBotAdminHeaders({ 'Content-Type': 'application/json' }),
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
        checksumReport={checksumReport}
        isChecksumSyncing={isChecksumSyncing}
        onForceChecksumSync={() => verifyAndSyncConfigChecksum(true)}
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
              <span>{lang === 'ar' ? 'محفظة المحاكاة والباك تيست' : 'Simulation Portfolio & Backtest'}</span>
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

            {/* Tab 5: Institutional Quant & Risk Suite */}
            <button
              onClick={() => setActiveMainTab('quant')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono font-bold text-xs transition-all shrink-0 ${
                activeMainTab === 'quant'
                  ? 'bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-[#141414]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الترسانة الكمية وإدارة المخاطر' : 'Quant & Risk Suite'}</span>
              <span className="px-1.5 py-0.2 text-[9px] bg-indigo-500/30 text-indigo-300 rounded font-mono">
                4-in-1
              </span>
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
            />

            <LiquidityRegimeScorecard
              lang={lang}
              scorecard={liquidityRegime}
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

            <OpenInterestPanel
              currentAsset={currentAsset}
              lang={lang}
            />

            <BridgeFlowPanel
              lang={lang}
            />

            <DexVolumePanel
              lang={lang}
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

                <button
                  onClick={() => setSimSubTab('quant')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono text-xs font-bold transition-all ${
                    simSubTab === 'quant'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'الترسانة الكمية والمخاطر' : 'Quant & Risk'}</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-gray-400 px-1 hidden sm:block">
                {simSubTab === 'paper'
                  ? (lang === 'ar' ? 'تنفيذ صفقات حية برأس مال افتراضي مع وقف خسارة وتتبع آلي' : 'Live virtual execution with SL & Trailing Profit')
                  : simSubTab === 'backtest'
                  ? (lang === 'ar' ? 'اختبار استراتيجية إياد على 365 يوماً من بيانات السوق' : 'Backtest EYAD strategy on 365 days of OHLCV data')
                  : (lang === 'ar' ? 'مصفوفة الارتباط، مراقبة التمويل، مقارنة ألفا ومحاكاة مونت كارلو' : 'Correlation, funding squeeze, HODL alpha & Monte Carlo')}
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
            ) : simSubTab === 'backtest' ? (
              <BacktestDashboard
                candles={candles}
                backtestResult={backtestResult}
                setBacktestResult={setBacktestResult}
                lang={lang}
                currentAsset={currentAsset}
                onSelectAsset={handleSelectAsset}
              />
            ) : (
              <QuantRiskDashboard
                paperAccount={paperAccount}
                setPaperAccount={setPaperAccount}
                currentAsset={currentAsset}
                livePrices={{
                  BTC: multiAssetData['BTC']?.price || btcPrice || 68000,
                  ETH: multiAssetData['ETH']?.price || 2436,
                  PAXG: multiAssetData['PAXG']?.price || 4456,
                }}
                btcPrice={btcPrice}
                lang={lang}
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

                <button
                  onClick={() => setIntelSubTab('ops')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded font-mono text-xs font-bold transition-all ${
                    intelSubTab === 'ops'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'عمليات البوت والسجل' : 'Bot Ops & Logs'}</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-gray-400 px-1 hidden sm:block">
                {intelSubTab === 'macro'
                  ? (lang === 'ar' ? 'حظر الصفقات في أوقات الأخبار شديدة التقلب' : 'News volatility circuit breaker & calendar')
                  : intelSubTab === 'learning'
                    ? (lang === 'ar' ? 'تحليل الصفقات السلبية لمنع تكرار الأخطاء' : 'Adaptive weights and mistake avoidance log')
                    : (lang === 'ar' ? 'مراقبة الـ daemon وسجل الإشارات واللوجز المؤمنة' : 'Secure daemon monitoring, logs, and signal history')}
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

                <MacroLiquidityPanel
                  lang={lang}
                />

                <StablecoinFlowPanel
                  lang={lang}
                />

                <BridgeFlowPanel
                  lang={lang}
                />
              </div>
            ) : intelSubTab === 'learning' ? (
              <SelfLearningJournal
                learningState={learningState}
                trades={backtestResult.trades}
                paperTrades={paperAccount.tradeHistory}
                currentAsset={currentAsset}
                lang={lang}
                onTriggerAILearning={handleTriggerAILearning}
                isLearning={isLearningAI}
                onApplyAdaptiveRule={(newRule) => {
                  setLearningState((prev) => ({
                    ...prev,
                    adaptiveRules: [
                      ...prev.adaptiveRules.filter((r) => r.id !== newRule.id),
                      newRule,
                    ],
                  }));
                }}
                onApplyBannedHours={(newBannedHours) => {
                  setLearningState((prev) => ({
                    ...prev,
                    bannedTradingHours: Array.from(new Set([...prev.bannedTradingHours, ...newBannedHours])),
                  }));
                }}
              />
            ) : (
              <BotOperationsPanel
                lang={lang}
                currentAsset={currentAsset}
                paperTrades={paperAccount.tradeHistory}
                backtestResult={backtestResult}
              />
            )}
          </div>
        )}

        {/* VIEW 5: INSTITUTIONAL QUANT RISK & ALPHA SUITE */}
        {activeMainTab === 'quant' && (
          <div className="space-y-4">
            <MultiAssetScanner
              currentAsset={currentAsset}
              onSelectAsset={handleSelectAsset}
              lang={lang}
              btcPrice={btcPrice}
              multiAssetPrices={multiAssetData}
            />

            <QuantRiskDashboard
              paperAccount={paperAccount}
              setPaperAccount={setPaperAccount}
              currentAsset={currentAsset}
              livePrices={{
                BTC: multiAssetData['BTC']?.price || btcPrice || 68000,
                ETH: multiAssetData['ETH']?.price || 2436,
                PAXG: multiAssetData['PAXG']?.price || 4456,
              }}
              btcPrice={btcPrice}
              lang={lang}
            />
          </div>
        )}

      </main>

      {/* High Density Footer Branding & Indicators */}
      <footer className="mt-8 border-t border-[#1f1f1f] bg-[#0a0a0a] py-3 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px]">
          <div className="flex items-center gap-4 text-gray-400">
            <span className="font-bold text-white">EYAD Research Strategy Engine</span>
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

