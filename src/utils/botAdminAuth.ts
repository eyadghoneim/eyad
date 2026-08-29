const BOT_ADMIN_SESSION_KEY = 'eyad_bot_admin_token';

export function getBotAdminToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(BOT_ADMIN_SESSION_KEY) || '';
  } catch {
    return '';
  }
}

export function setBotAdminToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    const normalized = token.trim();
    if (normalized) {
      sessionStorage.setItem(BOT_ADMIN_SESSION_KEY, normalized);
    } else {
      sessionStorage.removeItem(BOT_ADMIN_SESSION_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function clearBotAdminToken() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(BOT_ADMIN_SESSION_KEY);
  } catch {
    // ignore storage failures
  }
}

export function getBotAdminHeaders(baseHeaders: Record<string, string> = {}): Record<string, string> {
  const headers = { ...baseHeaders };
  const token = getBotAdminToken().trim();
  if (token) {
    headers['x-bot-admin-token'] = token;
  }
  return headers;
}
