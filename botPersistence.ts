import { db } from './serverFirebaseAdmin';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy, limit as fLimit, getCountFromServer } from 'firebase/firestore';

export interface ServerBotConfig {
  active: boolean;
  telegramEnabled: boolean;
  telegramToken: string;
  telegramChatId: string;
  scanIntervalSeconds: number;
}

export interface ServerBotLog {
  id: string;
  timestamp: number;
  type: 'INFO' | 'SIGNAL' | 'ALERT' | 'ERROR' | 'SECURITY' | 'WARN';
  message: string;
  asset?: string;
}

export interface PersistedBotSignal {
  id: string;
  timestamp: number;
  asset: string;
  signalType: string;
  spotAction: string;
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

export interface AssetRuntimeState {
  asset: string;
  lastKnownPrice: number;
  lastAlertSentAt: number;
  lastSignalHash: string;
}

export interface BotSignalStats {
  totalSignals: number;
  actionableSignals: number;
  buySignals: number;
  sellSignals: number;
  byAsset: Record<string, number>;
  lastSignalAt: number;
}

export interface PersistenceHealth {
  databasePath: string;
  databaseSizeBytes: number;
  walSizeBytes: number;
  signalRows: number;
  logRows: number;
  assetStateRows: number;
  lastPrunedAt: number;
  schemaVersion: number;
}

export interface NotificationRecord {
  id: string;
  timestamp: number;
  channel: 'TELEGRAM';
  targetMasked: string;
  asset?: string;
  status: 'SENT' | 'FAILED' | 'TEST';
  message: string;
  errorMessage?: string;
}

export const DEFAULT_BOT_CONFIG: ServerBotConfig = {
  active: true,
  telegramEnabled: false,
  telegramToken: '',
  telegramChatId: '',
  scanIntervalSeconds: 60,
};

function sanitizeForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = sanitizeForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

const MAX_LOG_ROWS = 2000;
const MAX_SIGNAL_ROWS = 4000;

export async function getMeta(key: string, defaultVal: string): Promise<string> {
  if (!db) return defaultVal;
  try {
    const docRef = doc(db, 'bot_meta', key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data()?.value ?? defaultVal;
    }
  } catch (e) {
    console.error('getMeta error', e);
  }
  return defaultVal;
}

export async function setMeta(key: string, value: string): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'bot_meta', key), { value });
  } catch (e) {
    console.error('setMeta error', e);
  }
}

export async function loadBotConfig(): Promise<ServerBotConfig> {
  if (!db) return DEFAULT_BOT_CONFIG;
  try {
    const docSnap = await getDoc(doc(db, 'bot_config', 'singleton'));
    if (docSnap.exists()) {
      return { ...DEFAULT_BOT_CONFIG, ...(docSnap.data() as Partial<ServerBotConfig>) };
    }
  } catch (e) {
    console.error('loadBotConfig error', e);
  }
  return DEFAULT_BOT_CONFIG;
}

export async function saveBotConfig(nextConfig: ServerBotConfig): Promise<ServerBotConfig> {
  if (!db) return nextConfig;
  try {
    await setDoc(doc(db, 'bot_config', 'singleton'), sanitizeForFirestore(nextConfig), { merge: true });
  } catch (e) {
    console.error('saveBotConfig error', e);
  }
  return nextConfig;
}

export async function getAssetState(asset: string): Promise<AssetRuntimeState> {
  const defaultState: AssetRuntimeState = { asset, lastKnownPrice: 0, lastAlertSentAt: 0, lastSignalHash: '' };
  if (!db) return defaultState;
  try {
    const docSnap = await getDoc(doc(db, 'bot_asset_state', asset.toUpperCase()));
    if (docSnap.exists()) {
      return { ...defaultState, ...(docSnap.data() as Partial<AssetRuntimeState>) };
    }
  } catch (e) {
    console.error('getAssetState error', e);
  }
  return defaultState;
}

export async function upsertAssetState(state: AssetRuntimeState): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'bot_asset_state', String(state.asset || '').toUpperCase()), sanitizeForFirestore(state), { merge: true });
  } catch (e) {
    console.error('upsertAssetState error', e);
  }
}

export async function listAssetStates(): Promise<AssetRuntimeState[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'bot_asset_state'), orderBy('asset', 'asc')));
    return snap.docs.map(d => d.data() as AssetRuntimeState);
  } catch (e) {
    console.error('listAssetStates error', e);
    return [];
  }
}

export async function appendBotLog(log: ServerBotLog): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'bot_logs', log.id), sanitizeForFirestore(log));
    pruneData().catch(console.error);
  } catch (e) {
    console.error('appendBotLog error', e);
  }
}

export async function listBotLogs(limit = 100, type?: ServerBotLog['type']): Promise<ServerBotLog[]> {
  if (!db) return [];
  try {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    let q = query(collection(db, 'bot_logs'), orderBy('timestamp', 'desc'), fLimit(safeLimit));
    if (type) {
      q = query(collection(db, 'bot_logs'), where('type', '==', type), orderBy('timestamp', 'desc'), fLimit(safeLimit));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ServerBotLog);
  } catch (e) {
    console.error('listBotLogs error', e);
    return [];
  }
}

export async function appendSignal(signal: PersistedBotSignal): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'bot_signals', signal.id), sanitizeForFirestore(signal));
    pruneData().catch(console.error);
  } catch (e) {
    console.error('appendSignal error', e);
  }
}

export async function listSignals(limit = 100, asset?: string): Promise<PersistedBotSignal[]> {
  if (!db) return [];
  try {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    let q = query(collection(db, 'bot_signals'), orderBy('timestamp', 'desc'), fLimit(safeLimit));
    if (asset) {
      q = query(collection(db, 'bot_signals'), where('asset', '==', String(asset).toUpperCase()), orderBy('timestamp', 'desc'), fLimit(safeLimit));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PersistedBotSignal);
  } catch (e) {
    console.error('listSignals error', e);
    return [];
  }
}

export async function getSignalStats(): Promise<BotSignalStats> {
  const stats: BotSignalStats = {
    totalSignals: 0,
    actionableSignals: 0,
    buySignals: 0,
    sellSignals: 0,
    byAsset: {},
    lastSignalAt: 0
  };
  if (!db) return stats;
  try {
    const totalSnap = await getCountFromServer(collection(db, 'bot_signals'));
    stats.totalSignals = totalSnap.data().count;

    const buySnap = await getCountFromServer(query(collection(db, 'bot_signals'), where('spotAction', '==', 'SPOT_BUY')));
    stats.buySignals = buySnap.data().count;

    const sellSnap = await getCountFromServer(query(collection(db, 'bot_signals'), where('spotAction', '==', 'SPOT_SELL_ALL')));
    stats.sellSignals = sellSnap.data().count;

    stats.actionableSignals = stats.buySignals + stats.sellSignals;

    const lastSnap = await getDocs(query(collection(db, 'bot_signals'), orderBy('timestamp', 'desc'), fLimit(1)));
    if (!lastSnap.empty) {
      stats.lastSignalAt = lastSnap.docs[0].data().timestamp || 0;
    }
    
    // Efficiently aggregate counts for monitored assets without full table scan
    const trackedAssets = ['BTC', 'ETH', 'PAXG', 'SOL'];
    await Promise.all(
      trackedAssets.map(async (assetName) => {
        try {
          const cSnap = await getCountFromServer(query(collection(db!, 'bot_signals'), where('asset', '==', assetName)));
          const count = cSnap.data().count;
          if (count > 0) {
            stats.byAsset[assetName] = count;
          }
        } catch {
          // ignore per-asset count errors
        }
      })
    );

  } catch (e) {
    console.error('getSignalStats error', e);
  }
  return stats;
}

let lastPruneExecution = 0;
export async function pruneData(): Promise<void> {
  const now = Date.now();
  // Throttle pruning to at most once every 10 minutes to save Firestore operations
  if (now - lastPruneExecution < 10 * 60 * 1000) return;
  lastPruneExecution = now;

  if (!db) return;

  try {
    // 1. Prune logs exceeding MAX_LOG_ROWS
    const logCountSnap = await getCountFromServer(collection(db, 'bot_logs'));
    const totalLogs = logCountSnap.data().count;
    if (totalLogs > MAX_LOG_ROWS) {
      const deleteCount = Math.min(50, totalLogs - MAX_LOG_ROWS);
      const oldestLogs = await getDocs(query(collection(db, 'bot_logs'), orderBy('timestamp', 'asc'), fLimit(deleteCount)));
      for (const d of oldestLogs.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    }

    // 2. Prune signals exceeding MAX_SIGNAL_ROWS
    const signalCountSnap = await getCountFromServer(collection(db, 'bot_signals'));
    const totalSignals = signalCountSnap.data().count;
    if (totalSignals > MAX_SIGNAL_ROWS) {
      const deleteCount = Math.min(50, totalSignals - MAX_SIGNAL_ROWS);
      const oldestSignals = await getDocs(query(collection(db, 'bot_signals'), orderBy('timestamp', 'asc'), fLimit(deleteCount)));
      for (const d of oldestSignals.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    }

    await setMeta('last_pruned_at', String(now));
  } catch (err) {
    console.error('[Firebase] pruneData error:', err);
  }
}

export async function getPersistenceHealth(): Promise<PersistenceHealth> {
  const health: PersistenceHealth = {
    databasePath: 'Firebase Firestore',
    databaseSizeBytes: 0,
    walSizeBytes: 0,
    signalRows: 0,
    logRows: 0,
    assetStateRows: 0,
    lastPrunedAt: Number(await getMeta('last_pruned_at', '0') || 0),
    schemaVersion: 3,
  };
  if (!db) return health;
  try {
    health.signalRows = (await getCountFromServer(collection(db, 'bot_signals'))).data().count;
    health.logRows = (await getCountFromServer(collection(db, 'bot_logs'))).data().count;
    health.assetStateRows = (await getCountFromServer(collection(db, 'bot_asset_state'))).data().count;
  } catch (e) {
    console.error('getPersistenceHealth error', e);
  }
  return health;
}

export function maskToken(token: string) {
  if (!token) return '';
  if (token.length <= 8) return '••••';
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

export function maskChatId(chatId: string) {
  if (!chatId) return '';
  if (chatId.length <= 4) return '••••';
  return `${chatId.slice(0, 2)}••••${chatId.slice(-2)}`;
}

export function getSafeConfigForClient(config: ServerBotConfig) {
  return {
    active: config.active,
    telegramEnabled: config.telegramEnabled,
    scanIntervalSeconds: config.scanIntervalSeconds,
    telegramConfigured: Boolean(config.telegramToken && config.telegramChatId),
    maskedTelegramToken: maskToken(config.telegramToken),
    maskedTelegramChatId: maskChatId(config.telegramChatId),
    hasTelegramToken: Boolean(config.telegramToken),
    hasTelegramChatId: Boolean(config.telegramChatId),
  };
}

export async function appendNotification(notification: NotificationRecord): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'bot_notifications', notification.id), sanitizeForFirestore(notification));
    pruneData().catch(console.error);
  } catch (e) {
    console.error('appendNotification error', e);
  }
}

export async function countBotLogs(): Promise<number> {
  if (!db) return 0;
  try {
    const snap = await getCountFromServer(collection(db, 'bot_logs'));
    return snap.data().count;
  } catch (e) {
    return 0;
  }
}

export async function countSignals(): Promise<number> {
  if (!db) return 0;
  try {
    const snap = await getCountFromServer(collection(db, 'bot_signals'));
    return snap.data().count;
  } catch (e) {
    return 0;
  }
}

export async function countNotifications(): Promise<number> {
  if (!db) return 0;
  try {
    const snap = await getCountFromServer(collection(db, 'bot_notifications'));
    return snap.data().count;
  } catch (e) {
    return 0;
  }
}

export function getDbPath() {
  return 'Firebase Firestore';
}
