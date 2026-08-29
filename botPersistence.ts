import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

export interface ServerBotConfig {
  active: boolean;
  telegramEnabled: boolean;
  telegramToken: string;
  telegramChatId: string;
  emailEnabled: boolean;
  emailAddress: string;
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

export interface BotNotificationDelivery {
  id: string;
  timestamp: number;
  channel: 'TELEGRAM' | 'EMAIL';
  targetMasked: string;
  asset?: string;
  status: 'SENT' | 'FAILED' | 'TEST';
  message: string;
  errorMessage?: string;
}

export interface AssetRuntimeState {
  asset: string;
  lastKnownPrice: number;
  lastAlertSentAt: number;
  lastSignalHash: string;
}

export const DEFAULT_BOT_CONFIG: ServerBotConfig = {
  active: true,
  telegramEnabled: false,
  telegramToken: '',
  telegramChatId: '',
  emailEnabled: false,
  emailAddress: '',
  scanIntervalSeconds: 60,
};

const dataDir = path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'eyad-bot.sqlite');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  PRAGMA synchronous = NORMAL;

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

  CREATE INDEX IF NOT EXISTS idx_bot_logs_timestamp ON bot_logs(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_bot_signals_timestamp ON bot_signals(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_bot_signals_asset ON bot_signals(asset, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_bot_notifications_timestamp ON bot_notifications(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_bot_notifications_channel ON bot_notifications(channel, timestamp DESC);
`);

const cfgCountRow = db.prepare('SELECT COUNT(*) as count FROM bot_config').get() as { count: number };
if (!cfgCountRow.count) {
  db.prepare(`
    INSERT INTO bot_config (
      id, active, telegram_enabled, telegram_token, telegram_chat_id,
      email_enabled, email_address, scan_interval_seconds, updated_at
    ) VALUES (1, @active, @telegram_enabled, @telegram_token, @telegram_chat_id, @email_enabled, @email_address, @scan_interval_seconds, @updated_at)
  `).run({
    active: DEFAULT_BOT_CONFIG.active ? 1 : 0,
    telegram_enabled: DEFAULT_BOT_CONFIG.telegramEnabled ? 1 : 0,
    telegram_token: DEFAULT_BOT_CONFIG.telegramToken,
    telegram_chat_id: DEFAULT_BOT_CONFIG.telegramChatId,
    email_enabled: DEFAULT_BOT_CONFIG.emailEnabled ? 1 : 0,
    email_address: DEFAULT_BOT_CONFIG.emailAddress,
    scan_interval_seconds: DEFAULT_BOT_CONFIG.scanIntervalSeconds,
    updated_at: Date.now(),
  });
}

const seedAssets = ['BTC', 'ETH', 'PAXG'];
for (const asset of seedAssets) {
  db.prepare(`INSERT OR IGNORE INTO bot_asset_state (asset, last_known_price, last_alert_sent_at, last_signal_hash) VALUES (?, 0, 0, '')`).run(asset);
}

function toBool(value: unknown) {
  return Boolean(Number(value));
}

function pruneTable(tableName: string, limit: number) {
  db.prepare(`DELETE FROM ${tableName} WHERE id NOT IN (SELECT id FROM ${tableName} ORDER BY timestamp DESC LIMIT ${limit})`).run();
}

export function loadBotConfig(): ServerBotConfig {
  const row = db.prepare('SELECT * FROM bot_config WHERE id = 1').get() as any;
  if (!row) return { ...DEFAULT_BOT_CONFIG };
  return {
    active: toBool(row.active),
    telegramEnabled: toBool(row.telegram_enabled),
    telegramToken: row.telegram_token || '',
    telegramChatId: row.telegram_chat_id || '',
    emailEnabled: toBool(row.email_enabled),
    emailAddress: row.email_address || '',
    scanIntervalSeconds: Math.max(10, Number(row.scan_interval_seconds) || DEFAULT_BOT_CONFIG.scanIntervalSeconds),
  };
}

export function saveBotConfig(nextConfig: ServerBotConfig): ServerBotConfig {
  const normalized: ServerBotConfig = {
    active: Boolean(nextConfig.active),
    telegramEnabled: Boolean(nextConfig.telegramEnabled),
    telegramToken: (nextConfig.telegramToken || '').trim(),
    telegramChatId: (nextConfig.telegramChatId || '').trim(),
    emailEnabled: Boolean(nextConfig.emailEnabled),
    emailAddress: (nextConfig.emailAddress || '').trim(),
    scanIntervalSeconds: Math.max(10, Math.floor(Number(nextConfig.scanIntervalSeconds) || DEFAULT_BOT_CONFIG.scanIntervalSeconds)),
  };

  db.prepare(`
    UPDATE bot_config SET
      active = @active,
      telegram_enabled = @telegram_enabled,
      telegram_token = @telegram_token,
      telegram_chat_id = @telegram_chat_id,
      email_enabled = @email_enabled,
      email_address = @email_address,
      scan_interval_seconds = @scan_interval_seconds,
      updated_at = @updated_at
    WHERE id = 1
  `).run({
    active: normalized.active ? 1 : 0,
    telegram_enabled: normalized.telegramEnabled ? 1 : 0,
    telegram_token: normalized.telegramToken,
    telegram_chat_id: normalized.telegramChatId,
    email_enabled: normalized.emailEnabled ? 1 : 0,
    email_address: normalized.emailAddress,
    scan_interval_seconds: normalized.scanIntervalSeconds,
    updated_at: Date.now(),
  });

  return normalized;
}

export function listAssetStates(): AssetRuntimeState[] {
  const rows = db.prepare('SELECT asset, last_known_price, last_alert_sent_at, last_signal_hash FROM bot_asset_state ORDER BY asset ASC').all() as any[];
  return rows.map((row) => ({
    asset: row.asset,
    lastKnownPrice: Number(row.last_known_price || 0),
    lastAlertSentAt: Number(row.last_alert_sent_at || 0),
    lastSignalHash: row.last_signal_hash || '',
  }));
}

export function getAssetState(asset: string): AssetRuntimeState {
  const row = db.prepare('SELECT asset, last_known_price, last_alert_sent_at, last_signal_hash FROM bot_asset_state WHERE asset = ?').get(asset) as any;
  if (!row) {
    db.prepare(`INSERT OR IGNORE INTO bot_asset_state (asset, last_known_price, last_alert_sent_at, last_signal_hash) VALUES (?, 0, 0, '')`).run(asset);
    return { asset, lastKnownPrice: 0, lastAlertSentAt: 0, lastSignalHash: '' };
  }
  return {
    asset: row.asset,
    lastKnownPrice: Number(row.last_known_price || 0),
    lastAlertSentAt: Number(row.last_alert_sent_at || 0),
    lastSignalHash: row.last_signal_hash || '',
  };
}

export function upsertAssetState(nextState: AssetRuntimeState) {
  db.prepare(`
    INSERT INTO bot_asset_state (asset, last_known_price, last_alert_sent_at, last_signal_hash)
    VALUES (@asset, @last_known_price, @last_alert_sent_at, @last_signal_hash)
    ON CONFLICT(asset) DO UPDATE SET
      last_known_price = excluded.last_known_price,
      last_alert_sent_at = excluded.last_alert_sent_at,
      last_signal_hash = excluded.last_signal_hash
  `).run({
    asset: nextState.asset,
    last_known_price: Number(nextState.lastKnownPrice || 0),
    last_alert_sent_at: Number(nextState.lastAlertSentAt || 0),
    last_signal_hash: nextState.lastSignalHash || '',
  });
}

export function appendBotLog(log: ServerBotLog) {
  db.prepare('INSERT OR REPLACE INTO bot_logs (id, timestamp, type, message, asset) VALUES (?, ?, ?, ?, ?)').run(
    log.id,
    log.timestamp,
    log.type,
    log.message,
    log.asset || null,
  );
  pruneTable('bot_logs', 800);
}

export function listBotLogs(limit = 100): ServerBotLog[] {
  const safeLimit = Math.max(1, Math.min(800, Math.floor(limit)));
  const rows = db.prepare(`SELECT id, timestamp, type, message, asset FROM bot_logs ORDER BY timestamp DESC LIMIT ${safeLimit}`).all() as any[];
  return rows.map((row) => ({
    id: row.id,
    timestamp: Number(row.timestamp),
    type: row.type,
    message: row.message,
    asset: row.asset || undefined,
  }));
}

export function countBotLogs() {
  const row = db.prepare('SELECT COUNT(*) as count FROM bot_logs').get() as any;
  return Number(row?.count || 0);
}

export function appendSignal(signal: PersistedBotSignal) {
  db.prepare(`
    INSERT OR REPLACE INTO bot_signals (
      id, timestamp, asset, signal_type, spot_action, conviction_score,
      price, change_24h, entry_price, stop_loss, target1, target2, target3,
      summary_ar, summary_en, metadata_json, dedup_hash
    ) VALUES (
      @id, @timestamp, @asset, @signal_type, @spot_action, @conviction_score,
      @price, @change_24h, @entry_price, @stop_loss, @target1, @target2, @target3,
      @summary_ar, @summary_en, @metadata_json, @dedup_hash
    )
  `).run({
    id: signal.id,
    timestamp: signal.timestamp,
    asset: signal.asset,
    signal_type: signal.signalType,
    spot_action: signal.spotAction,
    conviction_score: signal.convictionScore,
    price: signal.price,
    change_24h: signal.change24h,
    entry_price: signal.entryPrice,
    stop_loss: signal.stopLoss,
    target1: signal.target1,
    target2: signal.target2,
    target3: signal.target3,
    summary_ar: signal.summaryAr,
    summary_en: signal.summaryEn,
    metadata_json: signal.metadataJson,
    dedup_hash: signal.dedupHash,
  });
  pruneTable('bot_signals', 2500);
}

export function listSignals(limit = 100, asset?: string): PersistedBotSignal[] {
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  const rows = asset
    ? db.prepare(`SELECT * FROM bot_signals WHERE asset = ? ORDER BY timestamp DESC LIMIT ${safeLimit}`).all(asset)
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

export function countSignals() {
  const row = db.prepare('SELECT COUNT(*) as count FROM bot_signals').get() as any;
  return Number(row?.count || 0);
}

export function appendNotification(delivery: BotNotificationDelivery) {
  db.prepare(`
    INSERT OR REPLACE INTO bot_notifications (
      id, timestamp, channel, target_masked, asset, status, message, error_message
    ) VALUES (
      @id, @timestamp, @channel, @target_masked, @asset, @status, @message, @error_message
    )
  `).run({
    id: delivery.id,
    timestamp: delivery.timestamp,
    channel: delivery.channel,
    target_masked: delivery.targetMasked,
    asset: delivery.asset || null,
    status: delivery.status,
    message: delivery.message,
    error_message: delivery.errorMessage || null,
  });
  pruneTable('bot_notifications', 2500);
}

export function listNotifications(limit = 100): BotNotificationDelivery[] {
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  const rows = db.prepare(`SELECT * FROM bot_notifications ORDER BY timestamp DESC LIMIT ${safeLimit}`).all() as any[];
  return rows.map((row) => ({
    id: row.id,
    timestamp: Number(row.timestamp),
    channel: row.channel,
    targetMasked: row.target_masked,
    asset: row.asset || undefined,
    status: row.status,
    message: row.message,
    errorMessage: row.error_message || undefined,
  }));
}

export function countNotifications() {
  const row = db.prepare('SELECT COUNT(*) as count FROM bot_notifications').get() as any;
  return Number(row?.count || 0);
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

export function maskEmail(email: string) {
  if (!email || !email.includes('@')) return '';
  const [name, domain] = email.split('@');
  const maskedName = name.length <= 2 ? `${name[0] || ''}•` : `${name.slice(0, 2)}•••`;
  return `${maskedName}@${domain}`;
}

export function getSafeConfigForClient(config: ServerBotConfig) {
  return {
    active: config.active,
    telegramEnabled: config.telegramEnabled,
    emailEnabled: config.emailEnabled,
    emailAddress: maskEmail(config.emailAddress),
    scanIntervalSeconds: config.scanIntervalSeconds,
    telegramConfigured: Boolean(config.telegramToken && config.telegramChatId),
    maskedTelegramToken: maskToken(config.telegramToken),
    maskedTelegramChatId: maskChatId(config.telegramChatId),
    hasTelegramToken: Boolean(config.telegramToken),
    hasTelegramChatId: Boolean(config.telegramChatId),
  };
}

export function getDbPath() {
  return dbPath;
}
