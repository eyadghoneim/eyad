export type Timeframe = '15m' | '1h' | '4h' | '1d';

export interface Candle {
  time: number; // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' | 'NO_TRADE';

export type SpotAction = 'SPOT_BUY' | 'SPOT_SELL_ALL' | 'SPOT_HOLD';

export type SupportedAsset = 'BTC' | 'ETH' | 'PAXG';

export interface IndicatorValues {
  rsi: number;
  rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' | 'BULLISH_DIVERGENCE' | 'BEARISH_DIVERGENCE';
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    trend: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'BULLISH' | 'BEARISH';
  };
  ema9: number;
  ema21: number;
  ema20: number;
  ema50: number;
  ema200: number;
  emaTrend: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'STRONG_BULLISH' | 'STRONG_BEARISH' | 'NEUTRAL';
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
  };
  superTrend: {
    value: number;
    direction: 'BULLISH' | 'BEARISH';
  };
  atr: number;
  adx: number;
  vwap: number;
  stochRsi: {
    k: number;
    d: number;
    status: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  };
}

export interface SMCZone {
  id: string;
  type: 'BULLISH_OB' | 'BEARISH_OB' | 'BULLISH_FVG' | 'BEARISH_FVG' | 'LIQUIDITY_SWEEP';
  topPrice: number;
  bottomPrice: number;
  timestamp: number;
  isMitigated: boolean;
  strength: 'HIGH' | 'MEDIUM' | 'LOW';
  descriptionAr: string;
  descriptionEn: string;
}

export interface SMCAnalysis {
  zones: SMCZone[];
  marketStructure: 'BOS_BULLISH' | 'BOS_BEARISH' | 'CHOCH_BULLISH' | 'CHOCH_BEARISH' | 'RANGING';
  liquiditySwept: {
    highSwept: boolean;
    lowSwept: boolean;
    lastSweepPrice?: number;
    lastSweepTime?: number;
  };
  premiumDiscountZone: 'DEEP_DISCOUNT' | 'DISCOUNT' | 'EQUILIBRIUM' | 'PREMIUM' | 'DEEP_PREMIUM';
  summaryAr: string;
  summaryEn: string;
}

export interface ElliottWaveAnalysis {
  currentWave: 'WAVE_1' | 'WAVE_2' | 'WAVE_3' | 'WAVE_4' | 'WAVE_5' | 'WAVE_A' | 'WAVE_B' | 'WAVE_C' | 'UNDEFINED';
  waveType: 'IMPULSE' | 'CORRECTIVE' | 'TRANSITION';
  estimatedTarget: number;
  invalidationPrice: number;
  fibLevels: {
    level0_236: number;
    level0_382: number;
    level0_500: number;
    level0_618: number;
    level0_786: number;
    level1_618: number;
  };
  confidence: number;
  explanationAr: string;
  explanationEn: string;
}

export interface LiquiditySentimentData {
  fearAndGreedIndex: number;
  fearAndGreedLabel: string;
  orderBookImbalance: number; // -100 to +100 (Negative: Ask heavy, Positive: Bid heavy)
  estimatedFundingRate: number; // %
  exchangeInflowOutflow: 'NET_INFLOW' | 'NET_OUTFLOW' | 'BALANCED';
  mvrvScore: number;
  cvdTrend: 'RISING' | 'FALLING' | 'NEUTRAL';
  newsSentimentScore: number; // -100 to +100
  recentHeadlines: Array<{
    title: string;
    source: string;
    time: string;
    impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  }>;
}

export interface ProtectionLayerStatus {
  id: string;
  name: string;
  nameAr: string;
  passed: boolean;
  reasonAr: string;
  reasonEn: string;
}

export interface AIReasoning {
  convictionScore: number; // 0 to 100
  signalType: SignalType;
  spotAction: SpotAction;
  entryPrice: number;
  target1: number;
  target2: number;
  target3: number;
  stopLoss: number;
  riskRewardRatio: number;
  summaryAr: string;
  summaryEn: string;
  confluenceFactors: string[];
  riskWarningAr: string;
  riskWarningEn: string;
  modelUsed: string;
  generatedAt: number;
  // Strategy specific extensions
  entryQualityScore?: number;
  entryQualityPassed?: boolean;
  entryQualityStage?: 'ideal' | 'good' | 'wait' | 'skip';
  protectionLayers?: ProtectionLayerStatus[];
  whaleSentiment?: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  adxTrend?: 'STRONG_TREND' | 'WEAK_CHOPPY';
  asset?: SupportedAsset;
}

export interface TradeRecord {
  id: string;
  asset?: SupportedAsset;
  timestamp: number;
  dateFormatted: string;
  hourOfDay: number; // 0-23 UTC
  dayOfWeek: string;
  action: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  currentPrice?: number;
  amountBtc: number;
  capitalUsd: number;
  pnlUsd: number;
  pnlPercent: number;
  status: 'OPEN' | 'CLOSED_WIN' | 'CLOSED_LOSS';
  durationHours: number;
  signalConfidence: number;
  confluenceReason: string;
  lossRootCause?: string;
  learnedLessonAr?: string;
  learnedLessonEn?: string;
  marketCondition: 'HIGH_VOLATILITY' | 'RANGE' | 'STRONG_TREND' | 'NEWS_SPIKE';
  partialExitTaken?: boolean;
  entryQualityScore?: number;
}

export interface LearningState {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  hourlyLossMap: Record<number, { wins: number; losses: number; winRate: number }>;
  bannedTradingHours: number[]; // Hours where bot learned to avoid trading due to high loss frequency
  adaptiveRules: Array<{
    id: string;
    ruleAr: string;
    ruleEn: string;
    triggerCondition: string;
    confidenceAdjustment: number;
    active: boolean;
    createdAt: number;
  }>;
  lossPatternsIdentified: Array<{
    pattern: string;
    frequency: number;
    preventativeActionAr: string;
    preventativeActionEn: string;
  }>;
  aiMemorySummaryAr: string;
  aiMemorySummaryEn: string;
  lastLearningCycle: number;
}

export interface BacktestParams {
  periodDays: number;
  initialCapital: number;
  riskPerTradePercent: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  useSMCFilter: boolean;
  useElliottWaveFilter: boolean;
  useSelfLearningFilter: boolean;
  minConvictionThreshold: number;
}

export interface BacktestResult {
  initialCapital: number;
  finalCapital: number;
  totalReturnPercent: number;
  btcBuyHoldReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  avgTradeReturnPercent: number;
  bestTradePercent: number;
  worstTradePercent: number;
  trades: TradeRecord[];
  equityCurve: Array<{
    timestamp: number;
    date: string;
    botEquity: number;
    btcHoldEquity: number;
    btcPrice: number;
  }>;
  monthlyPerformance: Array<{
    month: string;
    returnPercent: number;
    tradesCount: number;
    winRate: number;
  }>;
}

export interface AlertConfig {
  telegramToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  emailAddress: string;
  emailEnabled: boolean;
  soundEnabled: boolean;
  autoScanIntervalSeconds: number;
  lastAlertSentAt?: number;
  serverHasTelegramToken?: boolean;
  serverHasTelegramChatId?: boolean;
  maskedTelegramToken?: string;
  maskedTelegramChatId?: string;
  serverEmailMasked?: string;
}

export interface PaperPosition {
  id: string;
  asset: SupportedAsset;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  allocatedUsd: number;
  tp1: number;
  tp2: number;
  stopLoss: number;
  entryTime: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPercent: number;
  partialSold: boolean;
  highestPrice: number;
  trailingStopPrice?: number;
}

export interface PaperAccount {
  virtualBalanceUsd: number;
  allocatedCapitalUsd: number;
  totalRealizedPnlUsd: number;
  positions: PaperPosition[];
  tradeHistory: TradeRecord[];
  autoExecuteSignals: boolean;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBookDepth {
  asset: SupportedAsset;
  symbol: string;
  midPrice: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  totalBidVolume: number;
  totalAskVolume: number;
  imbalancePercent: number;
  buyerPercentage: number;
  sellerPercentage: number;
  whaleBidWalls: OrderBookLevel[];
  whaleAskWalls: OrderBookLevel[];
  isSellWallBlocking: boolean;
  rule3Passed: boolean;
  source: string;
  timestamp: number;
}

export interface MacroEvent {
  id: string;
  name: string;
  nameAr: string;
  category: 'FOMC' | 'CPI' | 'NFP' | 'PPI' | 'GDP' | 'CRYPTO_EVENT';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: number;
  timeFormatted: string;
  previousValue?: string;
  forecastValue?: string;
  actualValue?: string;
  blackoutHoursBefore: number;
  blackoutHoursAfter: number;
  status: 'UPCOMING' | 'ACTIVE_BLACKOUT' | 'PASSED';
  descriptionAr: string;
}

export interface MacroNewsStatus {
  isBlackoutActive: boolean;
  activeEventName?: string;
  activeEventNameAr?: string;
  minutesUntilNextEvent: number;
  minutesSinceActiveEvent?: number;
  upcomingEvents: MacroEvent[];
  lockReasonAr?: string;
}

export interface BotSafeConfig {
  active: boolean;
  telegramEnabled: boolean;
  emailEnabled: boolean;
  emailAddress: string;
  scanIntervalSeconds: number;
  telegramConfigured: boolean;
  maskedTelegramToken: string;
  maskedTelegramChatId: string;
  hasTelegramToken: boolean;
  hasTelegramChatId: boolean;
}

export interface BotPublicStatus {
  active: boolean;
  lastScanTime: number;
  scanIntervalSeconds: number;
  scanInProgress: boolean;
  requiresAdminToken: boolean;
  securityMode: 'open' | 'protected';
}

export interface BotDaemonStatus extends BotPublicStatus {
  uptimeSeconds: number;
  scanCount: number;
  monitoredAssets: string[];
  lastKnownPrices: Record<string, number>;
  telegramConfigured: boolean;
  databaseEngine: string;
  logCount: number;
  signalCount: number;
  notificationCount: number;
}

export interface BotLogRecord {
  id: string;
  timestamp: number;
  type: 'INFO' | 'SIGNAL' | 'ALERT' | 'ERROR' | 'SECURITY' | 'WARN';
  message: string;
  asset?: string;
}

export interface BotSignalRecord {
  id: string;
  timestamp: number;
  asset: string;
  signalType: SignalType;
  spotAction: SpotAction;
  convictionScore: number;
  price: number;
  change24h: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  summaryAr: string;
  summaryEn: string;
  metadataJson: string;
  dedupHash: string;
}
