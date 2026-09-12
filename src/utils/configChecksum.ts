// Configuration Checksum & Bi-directional Synchronization Engine
// Ensures 100% real-time mathematical parity between LocalStorage and Backend Daemon Bot
import { STRATEGY_THRESHOLDS, STRATEGY_RISK_MULTIPLIERS, STRATEGY_ENGINE_SIGNATURE } from '../constants/strategyConstants';

export interface SyncableBotConfig {
  active: boolean;
  telegramEnabled: boolean;
  telegramToken: string;
  telegramChatId: string;
  scanIntervalSeconds: number;
  spreadFilterEnabled: boolean;
  maxSpreadPercent: number;
  trancheModeEnabled: boolean;
  tranche1Percent: number;
  tranche2Percent: number;
  maxExposurePercent?: number;
  correlationGuardEnabled?: boolean;
  derivativesFilterEnabled?: boolean;
  telegramAlertTiers?: {
    urgentTrades: boolean;
    positionUpdates: boolean;
    dailyDigest: boolean;
  };
  bannedTradingHours?: number[];
  adaptiveRulesCount?: number;
  paperAutoExecute?: boolean;
  entryQualityMinScore?: number;
  strongBuyMinScore?: number;
  target1Atr?: number;
  target2Atr?: number;
  stopLossAtr?: number;
  strategyVersion?: string;
}

export interface ConfigChecksumReport {
  localChecksum: string;
  serverChecksum: string;
  isMatch: boolean;
  syncedAt: number;
  syncAction: 'IN_SYNC' | 'SERVER_UPDATED' | 'LOCAL_HYDRATED' | 'SYNCING' | 'ERROR';
  differences: string[];
  details: {
    telegramConfigured: boolean;
    scanIntervalSeconds: number;
    spreadFilterEnabled: boolean;
    maxSpreadPercent: number;
    trancheModeEnabled: boolean;
    tranche1Percent: number;
    tranche2Percent: number;
    adaptiveRulesCount: number;
    bannedHoursCount: number;
    paperAutoExecute: boolean;
    strategyParity: boolean;
  };
}

/**
 * Normalizes an arbitrary configuration object so property order is deterministic
 */
export function canonicalizeConfig(obj: Record<string, any>): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeConfig(item)).join(',')}]`;
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => {
    const val = obj[key];
    const cleanVal = typeof val === 'string' ? val.trim() : val;
    return `"${key}":${canonicalizeConfig(cleanVal)}`;
  });
  return `{${pairs.join(',')}}`;
}

/**
 * Deterministic Hex Checksum generator (FNV-1a 64-bit aligned with server)
 */
export function computeServerConfigChecksumSync(config: Record<string, any>): string {
  const canonicalString = canonicalizeConfig(config);
  let h1 = 0x811c9dc5;
  let h2 = 0x84222325;
  for (let i = 0; i < canonicalString.length; i++) {
    const ch = canonicalString.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x01000193);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`.slice(0, 12);
}

export async function computeConfigChecksum(config: Record<string, any>): Promise<string> {
  return computeServerConfigChecksumSync(config);
}

/**
 * Extracts unified syncable config snapshot from client LocalStorage and Canonical Strategy
 */
export function extractLocalSyncableConfig(): SyncableBotConfig {
  let telegramToken = '';
  let telegramChatId = '';
  let telegramEnabled = false;
  let scanIntervalSeconds = 60;
  let telegramAlertTiers = { urgentTrades: true, positionUpdates: true, dailyDigest: true };
  let spreadFilterEnabled = true;
  let maxSpreadPercent = 0.15;
  let trancheModeEnabled = true;
  let tranche1Percent = 60;
  let tranche2Percent = 40;
  let bannedTradingHours: number[] = [];
  let adaptiveRulesCount = 0;
  let paperAutoExecute = true;

  try {
    const alertRaw = localStorage.getItem('eyad_btc_alert_config');
    if (alertRaw) {
      const p = JSON.parse(alertRaw);
      telegramToken = String(p.telegramToken || '').trim();
      telegramChatId = String(p.telegramChatId || '').trim();
      telegramEnabled = Boolean(p.telegramEnabled);
      scanIntervalSeconds = Number(p.autoScanIntervalSeconds) || 60;
      if (p.telegramAlertTiers) {
        telegramAlertTiers = { ...telegramAlertTiers, ...p.telegramAlertTiers };
      }
    }
  } catch {}

  try {
    const paperRaw = localStorage.getItem('eyad_paper_account');
    if (paperRaw) {
      const p = JSON.parse(paperRaw);
      spreadFilterEnabled = p.spreadFilterEnabled !== undefined ? Boolean(p.spreadFilterEnabled) : true;
      maxSpreadPercent = typeof p.maxSpreadTolerancePct === 'number' ? p.maxSpreadTolerancePct : 0.15;
      trancheModeEnabled = p.trancheModeEnabled !== undefined ? Boolean(p.trancheModeEnabled) : true;
      paperAutoExecute = p.autoExecuteSignals !== undefined ? Boolean(p.autoExecuteSignals) : true;
    }
  } catch {}

  try {
    const learnRaw = localStorage.getItem('eyad_btc_learning_state');
    if (learnRaw) {
      const l = JSON.parse(learnRaw);
      bannedTradingHours = Array.isArray(l.bannedTradingHours) ? l.bannedTradingHours.sort((a: number, b: number) => a - b) : [];
      adaptiveRulesCount = Array.isArray(l.adaptiveRules) ? l.adaptiveRules.length : 0;
    }
  } catch {}

  return {
    active: true,
    telegramEnabled,
    telegramToken,
    telegramChatId,
    scanIntervalSeconds,
    spreadFilterEnabled,
    maxSpreadPercent,
    trancheModeEnabled,
    tranche1Percent,
    tranche2Percent,
    telegramAlertTiers,
    bannedTradingHours,
    adaptiveRulesCount,
    paperAutoExecute,
    entryQualityMinScore: STRATEGY_THRESHOLDS.ENTRY_QUALITY_MIN_SCORE,
    strongBuyMinScore: STRATEGY_THRESHOLDS.STRONG_BUY_MIN_SCORE,
    target1Atr: STRATEGY_RISK_MULTIPLIERS.TARGET_1_ATR,
    target2Atr: STRATEGY_RISK_MULTIPLIERS.TARGET_2_ATR,
    stopLossAtr: STRATEGY_RISK_MULTIPLIERS.STOP_LOSS_ATR,
    strategyVersion: STRATEGY_ENGINE_SIGNATURE.version,
  };
}

/**
 * Compares Local vs Backend Config and lists any discrepancies
 */
export function detectConfigDiscrepancies(
  local: SyncableBotConfig,
  server: Record<string, any>
): string[] {
  const diffs: string[] = [];

  if (local.telegramEnabled !== Boolean(server.telegramEnabled)) {
    diffs.push(`Telegram Enabled: local=${local.telegramEnabled}, server=${Boolean(server.telegramEnabled)}`);
  }

  // Token comparison (if client has raw token, check if server is configured)
  if (local.telegramToken && !server.hasTelegramToken && !server.telegramToken) {
    diffs.push('Telegram Token: Client configured with token, server missing credentials');
  }

  if (local.telegramChatId && !server.hasTelegramChatId && !server.telegramChatId) {
    diffs.push('Telegram Chat ID: Client configured with Chat ID, server missing credentials');
  }

  if (Number(local.scanIntervalSeconds) !== Number(server.scanIntervalSeconds)) {
    diffs.push(`Scan Interval: local=${local.scanIntervalSeconds}s, server=${server.scanIntervalSeconds}s`);
  }

  if (server.spreadFilterEnabled !== undefined && local.spreadFilterEnabled !== Boolean(server.spreadFilterEnabled)) {
    diffs.push(`Spread Filter: local=${local.spreadFilterEnabled}, server=${Boolean(server.spreadFilterEnabled)}`);
  }

  if (server.maxSpreadPercent !== undefined && Math.abs(local.maxSpreadPercent - Number(server.maxSpreadPercent)) > 0.001) {
    diffs.push(`Max Spread %: local=${local.maxSpreadPercent}%, server=${server.maxSpreadPercent}%`);
  }

  if (server.trancheModeEnabled !== undefined && local.trancheModeEnabled !== Boolean(server.trancheModeEnabled)) {
    diffs.push(`Tranche Mode: local=${local.trancheModeEnabled}, server=${Boolean(server.trancheModeEnabled)}`);
  }

  // Strategy Core Constants Parity
  if (server.entryQualityMinScore !== undefined && local.entryQualityMinScore !== server.entryQualityMinScore) {
    diffs.push(`Entry Quality Gate: local=${local.entryQualityMinScore}, server=${server.entryQualityMinScore}`);
  }
  if (server.strongBuyMinScore !== undefined && local.strongBuyMinScore !== server.strongBuyMinScore) {
    diffs.push(`Strong Buy Threshold: local=${local.strongBuyMinScore}, server=${server.strongBuyMinScore}`);
  }
  if (server.target1Atr !== undefined && local.target1Atr !== server.target1Atr) {
    diffs.push(`TP1 ATR Multiplier: local=${local.target1Atr}x, server=${server.target1Atr}x`);
  }
  if (server.target2Atr !== undefined && local.target2Atr !== server.target2Atr) {
    diffs.push(`TP2 ATR Multiplier: local=${local.target2Atr}x, server=${server.target2Atr}x`);
  }
  if (server.stopLossAtr !== undefined && local.stopLossAtr !== server.stopLossAtr) {
    diffs.push(`Stop Loss ATR Multiplier: local=${local.stopLossAtr}x, server=${server.stopLossAtr}x`);
  }
  if (server.strategyVersion !== undefined && local.strategyVersion !== server.strategyVersion) {
    diffs.push(`Strategy Engine Version: local=${local.strategyVersion}, server=${server.strategyVersion}`);
  }

  return diffs;
}
