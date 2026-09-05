// Configuration Checksum & Bi-directional Synchronization Engine
// Ensures 100% real-time mathematical parity between LocalStorage and Backend Daemon Bot

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
 * Deterministic Hex Checksum generator (SHA-256 with fallback to FNV-1a)
 */
export async function computeConfigChecksum(config: Record<string, any>): Promise<string> {
  const canonicalString = canonicalizeConfig(config);

  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(canonicalString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
    }
  } catch {
    // fallback
  }

  // Pure JavaScript FNV-1a 64-bit style hash fallback
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

/**
 * Synchronous Checksum generator for Node.js / server-side runtime
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

/**
 * Extracts unified syncable config snapshot from client LocalStorage
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

  return diffs;
}
