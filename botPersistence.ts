import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

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

const DB_SCHEMA_VERSION = 2;
const MAX_LOG_ROWS = 2000;
const MAX_SIGNAL_ROWS = 4000;

const dataDir = path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'eyad-bot.sqlite');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA synchronous = NORMAL;
  PRAGMA temp_store = MEMORY;

  CREATE TABLE IF NOT EXISTS system_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bot_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    active INTEGER NOT NULL,
    telegram_enabled INTEGER NOT NULL,
    telegram_token TEXT NOT NULL,
    telegram_chat_id TEXT NOT NULL,
    email_enabled INTEGER NOT NULL,
    email_address TEXT NOT NULL,
    scan_interval_seconds INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bot_asset_state (
    asset TEXT PRIMARY KEY,
    last_known_price REAL NOT NULL DEFAULT 0,
    last_alert_sent_at INTEGER NOT NULL DEFAULT 0,
    last_signal_hash TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS bot_logs (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    asset TEXT
  );

  CREATE TABLE IF NOT EXISTS bot_notifications (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    channel TEXT NOT NULL,
    target_masked TEXT NOT NULL,
    asset TEXT,
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS bot_signals (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    asset TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    spot_action TEXT NOT NULL,
    conviction_score REAL NOT NULL,
    price REAL NOT NULL,
    change_24h REAL NOT NULL,
    entry_price REAL NOT NULL,
    stop_loss REAL NOT NULL,
    target1 REAL NOT NULL,
    target2 REAL NOT NULL,
    target3 REAL NOT NULL,
    summary_ar TEXT NOT NULL,
    summary_en TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    dedup_hash TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_bot_logs_timestamp ON bot_logs(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_bot_logs_type_timestamp ON bot_logs(type, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_bot_notifications_timestamp ON bot_notifications(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_bot_signals_timestamp ON bot_signals(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_bot_signals_asset ON bot_signals(asset, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_bot_signals_dedup ON bot_signals(asset, dedup_hash, timestamp DESC);
`);

const setMetaStmt = db.prepare(`
  INSERT INTO system_meta(key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);
const getMetaStmt = db.prepare(`SELECT value FROM system_meta WHERE key = ?`);

function setMeta(key: string, value: string) {
  setMetaStmt.run(key, value, Date.now());
}

function getMeta(key: string, fallback = '') {
  const row = getMetaStmt.get(key) as { value?: string } | undefined;
  return row?.value ?? fallback;
}

setMeta('schema_version', String(DB_SCHEMA_VERSION));
if (!getMeta('last_pruned_at')) {
  setMeta('last_pruned_at', '0');
}

const cfgCountRow = db.prepare('SELECT COUNT(*) as count FROM bot_config').get() as { count: number };
if (!cfgCountRow.count) {
  db.prepare(`
    INSERT INTO bot_config(
      id, active, telegram_enabled, telegram_token, telegram_chat_id, email_enabled, email_address, scan_interval_seconds, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    DEFAULT_BOT_CONFIG.active ? 1 : 0,
    DEFAULT_BOT_CONFIG.telegramEnabled ? 1 : 0,
    DEFAULT_BOT_CONFIG.telegramToken,
    DEFAULT_BOT_CONFIG.telegramChatId,
    0,
    '',
    DEFAULT_BOT_CONFIG.scanIntervalSeconds,
    Date.now(),
  );
}

function normalizeConfig(row: any): ServerBotConfig {
  return {
    active: Boolean(row.active),
    telegramEnabled: Boolean(row.telegram_enabled),
    telegramToken: String(row.telegram_token || ''),
    telegramChatId: String(row.telegram_chat_id || ''),
    scanIntervalSeconds: Math.max(10, Number(row.scan_interval_seconds) || DEFAULT_BOT_CONFIG.scanIntervalSeconds),
  };
}

export function loadBotConfig(): ServerBotConfig {
  const row = db.prepare('SELECT * FROM bot_config WHERE id = 1').get() as any;
  return row ? normalizeConfig(row) : DEFAULT_BOT_CONFIG;
}

export function saveBotConfig(nextConfig: ServerBotConfig): ServerBotConfig {
  const safeConfig: ServerBotConfig = {
    active: Boolean(nextConfig.active),
    telegramEnabled: Boolean(nextConfig.telegramEnabled),
    telegramToken: String(nextConfig.telegramToken || '').trim(),
    telegramChatId: String(nextConfig.telegramChatId || '').trim(),
    scanIntervalSeconds: Math.max(10, Math.floor(Number(nextConfig.scanIntervalSeconds) || DEFAULT_BOT_CONFIG.scanIntervalSeconds)),
  };

  db.prepare(`
    UPDATE bot_config SET
      active = ?,
      telegram_enabled = ?,
      telegram_token = ?,
      telegram_chat_id = ?,
      email_enabled = 0,
      email_address = '',
      scan_interval_seconds = ?,
      updated_at = ?
    WHERE id = 1
  `).run(
    safeConfig.active ? 1 : 0,
    safeConfig.telegramEnabled ? 1 : 0,
    safeConfig.telegramToken,
    safeConfig.telegramChatId,
    safeConfig.scanIntervalSeconds,
    Date.now(),
  );

  return loadBotConfig();
}

export function getAssetState(asset: string): AssetRuntimeState {
  const safeAsset = String(asset || '').toUpperCase();
  const row = db.prepare('SELECT * FROM bot_asset_state WHERE asset = ?').get(safeAsset) as any;
  if (row) {
    return {
      asset: row.asset,
      lastKnownPrice: Number(row.last_known_price || 0),
      lastAlertSentAt: Number(row.last_alert_sent_at || 0),
      lastSignalHash: String(row.last_signal_hash || ''),
    };
  }
  return {
    asset: safeAsset,
    lastKnownPrice: 0,
    lastAlertSentAt: 0,
    lastSignalHash: '',
  };
}

export function upsertAssetState(state: AssetRuntimeState) {
  db.prepare(`
    INSERT INTO bot_asset_state(asset, last_known_price, last_alert_sent_at, last_signal_hash)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(asset) DO UPDATE SET
      last_known_price = excluded.last_known_price,
      last_alert_sent_at = excluded.last_alert_sent_at,
      last_signal_hash = excluded.last_signal_hash
  `).run(
    String(state.asset || '').toUpperCase(),
    Number(state.lastKnownPrice || 0),
    Number(state.lastAlertSentAt || 0),
    String(state.lastSignalHash || ''),
  );
}

export function listAssetStates(): AssetRuntimeState[] {
  const rows = db.prepare('SELECT * FROM bot_asset_state ORDER BY asset ASC').all() as any[];
  return rows.map((row) => ({
    asset: row.asset,
    lastKnownPrice: Number(row.last_known_price || 0),
    lastAlertSentAt: Number(row.last_alert_sent_at || 0),
    lastSignalHash: String(row.last_signal_hash || ''),
  }));
}

export function appendBotLog(log: ServerBotLog) {
  db.prepare(`
    INSERT OR REPLACE INTO bot_logs(id, timestamp, type, message, asset)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    log.id,
    Number(log.timestamp || Date.now()),
    log.type,
    log.message,
    log.asset ? String(log.asset).toUpperCase() : null,
  );
  pruneData();
}

export function listBotLogs(limit = 100, type?: ServerBotLog['type']): ServerBotLog[] {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const rows = type
    ? db.prepare(`SELECT * FROM bot_logs WHERE type = ? ORDER BY timestamp DESC LIMIT ${safeLimit}`).all(type)
    : db.prepare(`SELECT * FROM bot_logs ORDER BY timestamp DESC LIMIT ${safeLimit}`).all();

  return (rows as any[]).map((row) => ({
    id: row.id,
    timestamp: Number(row.timestamp),
    type: row.type,
    message: row.message,
    asset: row.asset || undefined,
  }));
}

export function appendSignal(signal: PersistedBotSignal) {
  db.prepare(`
    INSERT OR REPLACE INTO bot_signals(
      id, timestamp, asset, signal_type, spot_action, conviction_score, price, change_24h,
      entry_price, stop_loss, target1, target2, target3, summary_ar, summary_en, metadata_json, dedup_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    signal.id,
    Number(signal.timestamp || Date.now()),
    String(signal.asset || '').toUpperCase(),
    signal.signalType,
    signal.spotAction,
    Number(signal.convictionScore || 0),
    Number(signal.price || 0),
    Number(signal.change24h || 0),
    Number(signal.entryPrice || 0),
    Number(signal.stopLoss || 0),
    Number(signal.target1 || 0),
    Number(signal.target2 || 0),
    Number(signal.target3 || 0),
    signal.summaryAr || '',
    signal.summaryEn || '',
    signal.metadataJson || '{}',
    signal.dedupHash || '',
  );
  pruneData();
}

export function listSignals(limit = 100, asset?: string): PersistedBotSignal[] {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const safeAsset = asset ? String(asset).toUpperCase() : undefined;
  const rows = safeAsset
    ? db.prepare(`SELECT * FROM bot_signals WHERE asset = ? ORDER BY timestamp DESC LIMIT ${safeLimit}`).all(safeAsset)
    : db.prepare(`SELECT * FROM bot_signals ORDER BY timestamp DESC LIMIT ${safeLimit}`).all();

  return (rows as any[]).map((row) => ({
    id: row.id,
    timestamp: Number(row.timestamp),
    asset: row.asset,
    signalType: row.signal_type,
    spotAction: row.spot_action,
    convictionScore: Number(row.conviction_score),
    price: Number(row.price),
    change24h: Number(row.change_24h),
    entryPrice: Number(row.entry_price),
    stopLoss: Number(row.stop_loss),
    target1: Number(row.target1),
    target2: Number(row.target2),
    target3: Number(row.target3),
    summaryAr: row.summary_ar,
    summaryEn: row.summary_en,
    metadataJson: row.metadata_json,
    dedupHash: row.dedup_hash,
  }));
}

export function getSignalStats(): BotSignalStats {
  const totalSignals = Number((db.prepare('SELECT COUNT(*) AS count FROM bot_signals').get() as any)?.count || 0);
  const actionableSignals = Number((db.prepare(`SELECT COUNT(*) AS count FROM bot_signals WHERE spot_action IN ('SPOT_BUY', 'SPOT_SELL_ALL')`).get() as any)?.count || 0);
  const buySignals = Number((db.prepare(`SELECT COUNT(*) AS count FROM bot_signals WHERE spot_action = 'SPOT_BUY'`).get() as any)?.count || 0);
  const sellSignals = Number((db.prepare(`SELECT COUNT(*) AS count FROM bot_signals WHERE spot_action = 'SPOT_SELL_ALL'`).get() as any)?.count || 0);
  const lastSignalAt = Number((db.prepare('SELECT COALESCE(MAX(timestamp), 0) AS ts FROM bot_signals').get() as any)?.ts || 0);
  const byAssetRows = db.prepare('SELECT asset, COUNT(*) AS count FROM bot_signals GROUP BY asset').all() as any[];
  const byAsset = Object.fromEntries(byAssetRows.map((row) => [row.asset, Number(row.count || 0)]));
  return { totalSignals, actionableSignals, buySignals, sellSignals, byAsset, lastSignalAt };
}

export function pruneData() {
  db.prepare(`
    DELETE FROM bot_logs
    WHERE id IN (
      SELECT id FROM bot_logs
      ORDER BY timestamp DESC
      LIMIT -1 OFFSET ${MAX_LOG_ROWS}
    )
  `).run();

  db.prepare(`
    DELETE FROM bot_notifications
    WHERE id IN (
      SELECT id FROM bot_notifications
      ORDER BY timestamp DESC
      LIMIT -1 OFFSET ${MAX_LOG_ROWS}
    )
  `).run();

  db.prepare(`
    DELETE FROM bot_signals
    WHERE id IN (
      SELECT id FROM bot_signals
      ORDER BY timestamp DESC
      LIMIT -1 OFFSET ${MAX_SIGNAL_ROWS}
    )
  `).run();

  setMeta('last_pruned_at', String(Date.now()));
}

export function getPersistenceHealth(): PersistenceHealth {
  const signalRows = Number((db.prepare('SELECT COUNT(*) AS count FROM bot_signals').get() as any)?.count || 0);
  const logRows = Number((db.prepare('SELECT COUNT(*) AS count FROM bot_logs').get() as any)?.count || 0);
  const assetStateRows = Number((db.prepare('SELECT COUNT(*) AS count FROM bot_asset_state').get() as any)?.count || 0);
  const walPath = `${dbPath}-wal`;
  return {
    databasePath: dbPath,
    databaseSizeBytes: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
    walSizeBytes: fs.existsSync(walPath) ? fs.statSync(walPath).size : 0,
    signalRows,
    logRows,
    assetStateRows,
    lastPrunedAt: Number(getMeta('last_pruned_at', '0') || 0),
    schemaVersion: Number(getMeta('schema_version', String(DB_SCHEMA_VERSION)) || DB_SCHEMA_VERSION),
  };
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

export function appendNotification(notification: NotificationRecord) {
  db.prepare(`
    INSERT OR REPLACE INTO bot_notifications(id, timestamp, channel, target_masked, asset, status, message, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    notification.id,
    Number(notification.timestamp || Date.now()),
    notification.channel,
    notification.targetMasked,
    notification.asset ? String(notification.asset).toUpperCase() : null,
    notification.status,
    notification.message,
    notification.errorMessage || null,
  );
  pruneData();
}

export function countBotLogs() {
  return Number((db.prepare('SELECT COUNT(*) AS count FROM bot_logs').get() as any)?.count || 0);
}

export function countSignals() {
  return Number((db.prepare('SELECT COUNT(*) AS count FROM bot_signals').get() as any)?.count || 0);
}

export function countNotifications() {
  return Number((db.prepare('SELECT COUNT(*) AS count FROM bot_notifications').get() as any)?.count || 0);
}

export function getDbPath() {
  return dbPath;
}
