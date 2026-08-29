type CacheEntry<T = any> = {
  expiresAt: number;
  data: T;
};

const responseCache = new Map<string, CacheEntry>();

function readCached<T>(key: string): T | null {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return cached.data as T;
}

function writeCached<T>(key: string, data: T, ttlMs: number) {
  responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function fetchJsonCached<T = any>(key: string, url: string, ttlMs: number): Promise<T> {
  const cached = readCached<T>(key);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'eyad-trading-llama-proxy/1.0',
      'Accept': 'application/json',
    },
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const error: any = new Error(`HTTP ${res.status} while fetching ${url}`);
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  writeCached(key, data, ttlMs);
  return data as T;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function computePctChange(current: number, previous: number) {
  if (!previous) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export async function getLlamaChainsOverview() {
  const rows = await fetchJsonCached<any[]>('llama:chains', 'https://api.llama.fi/v2/chains', 5 * 60 * 1000);
  const normalized = (rows || [])
    .map((item) => ({
      name: String(item?.name || 'Unknown'),
      geckoId: item?.gecko_id ? String(item.gecko_id) : '',
      tokenSymbol: item?.tokenSymbol ? String(item.tokenSymbol) : '',
      chainId: item?.chainId ?? null,
      tvl: toNumber(item?.tvl),
    }))
    .filter((item) => item.tvl >= 0)
    .sort((a, b) => b.tvl - a.tvl);

  const featuredNames = ['Ethereum', 'Solana', 'Base', 'BSC', 'Arbitrum', 'Tron'];
  const featuredChains = featuredNames
    .map((name) => normalized.find((item) => item.name.toLowerCase() === name.toLowerCase()))
    .filter(Boolean);

  return {
    source: 'DefiLlama Free API',
    updatedAt: Date.now(),
    totalChains: normalized.length,
    totalTvl: normalized.reduce((sum, item) => sum + item.tvl, 0),
    topChains: normalized.slice(0, 12),
    featuredChains,
  };
}

export async function getLlamaChainHistory(chain: string) {
  const safeChain = String(chain || 'ethereum').toLowerCase();
  const rows = await fetchJsonCached<any[]>(`llama:chain-history:${safeChain}`, `https://api.llama.fi/v2/historicalChainTvl/${encodeURIComponent(safeChain)}`, 15 * 60 * 1000);

  const points = (rows || [])
    .map((item) => ({
      timestamp: toNumber(item?.date) * 1000,
      tvl: toNumber(item?.tvl),
    }))
    .filter((item) => item.timestamp > 0 && item.tvl >= 0)
    .slice(-120)
    .map((item) => ({
      ...item,
      label: new Date(item.timestamp).toISOString().slice(5, 10),
    }));

  const latest = points[points.length - 1] || { tvl: 0 };
  const point7d = points[Math.max(0, points.length - 8)] || latest;
  const point30d = points[Math.max(0, points.length - 31)] || latest;

  return {
    source: 'DefiLlama Free API',
    updatedAt: Date.now(),
    chain: safeChain,
    latestTvl: latest.tvl,
    delta7dPct: computePctChange(latest.tvl, point7d.tvl),
    delta30dPct: computePctChange(latest.tvl, point30d.tvl),
    points,
  };
}

export async function getLlamaStablecoinChains() {
  const rows = await fetchJsonCached<any[]>('llama:stablecoin-chains', 'https://stablecoins.llama.fi/stablecoinchains', 5 * 60 * 1000);
  const normalized = (rows || [])
    .map((item) => ({
      name: String(item?.name || 'Unknown'),
      totalStablecoinUsd: toNumber(item?.totalCirculatingUSD?.peggedUSD),
    }))
    .filter((item) => item.totalStablecoinUsd >= 0)
    .sort((a, b) => b.totalStablecoinUsd - a.totalStablecoinUsd);

  const featuredNames = ['Ethereum', 'Tron', 'Solana', 'Base', 'BSC', 'Arbitrum'];
  const featuredChains = featuredNames
    .map((name) => normalized.find((item) => item.name.toLowerCase() === name.toLowerCase()))
    .filter(Boolean);

  return {
    source: 'DefiLlama Stablecoins API',
    updatedAt: Date.now(),
    totalChains: normalized.length,
    totalStablecoinUsd: normalized.reduce((sum, item) => sum + item.totalStablecoinUsd, 0),
    topChains: normalized.slice(0, 12),
    featuredChains,
  };
}

export async function getLlamaDexOverview() {
  const data = await fetchJsonCached<any>('llama:dex-overview', 'https://api.llama.fi/overview/dexs', 5 * 60 * 1000);
  const topProtocols = ((data?.protocols || []) as any[])
    .map((item) => ({
      name: String(item?.displayName || item?.name || 'Unknown DEX'),
      total24h: toNumber(item?.total24h),
      total7d: toNumber(item?.total7d),
      change1d: toNumber(item?.change_1d),
      change7d: toNumber(item?.change_7d),
      chainsCount: item?.breakdown24h && typeof item.breakdown24h === 'object' ? Object.keys(item.breakdown24h).length : 0,
    }))
    .sort((a, b) => b.total24h - a.total24h)
    .slice(0, 10);

  return {
    source: 'DefiLlama Free API',
    updatedAt: Date.now(),
    total24h: toNumber(data?.total24h),
    total7d: toNumber(data?.total7d),
    total30d: toNumber(data?.total30d),
    totalAllTime: toNumber(data?.totalAllTime),
    change1d: toNumber(data?.change_1d),
    change7d: toNumber(data?.change_7d),
    change1m: toNumber(data?.change_1m),
    topProtocols,
  };
}

async function fetchBinanceOpenInterestAsset(symbol: string, asset: string) {
  try {
    const [oiRes, tickerRes] = await Promise.all([
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`, { headers: { 'User-Agent': 'eyad-trading-derivatives-proxy/1.0' } }),
      fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`, { headers: { 'User-Agent': 'eyad-trading-derivatives-proxy/1.0' } }),
    ]);

    if (!oiRes.ok || !tickerRes.ok) {
      return {
        asset,
        symbol,
        available: false,
        openInterestContracts: 0,
        openInterestUsd: 0,
        lastPrice: 0,
        priceChange24h: 0,
      };
    }

    const oiData: any = await oiRes.json();
    const tickerData: any = await tickerRes.json();
    const openInterestContracts = toNumber(oiData?.openInterest);
    const lastPrice = toNumber(tickerData?.lastPrice);

    return {
      asset,
      symbol,
      available: true,
      openInterestContracts,
      openInterestUsd: Number((openInterestContracts * lastPrice).toFixed(2)),
      lastPrice,
      priceChange24h: toNumber(tickerData?.priceChangePercent),
    };
  } catch {
    return {
      asset,
      symbol,
      available: false,
      openInterestContracts: 0,
      openInterestUsd: 0,
      lastPrice: 0,
      priceChange24h: 0,
    };
  }
}

export async function getOpenInterestOverview() {
  try {
    const data = await fetchJsonCached<any>('llama:derivatives-overview', 'https://api.llama.fi/overview/derivatives', 2 * 60 * 1000);
    const topProtocols = ((data?.protocols || []) as any[])
      .map((item) => ({
        name: String(item?.displayName || item?.name || 'Unknown venue'),
        total24h: toNumber(item?.total24h),
        total7d: toNumber(item?.total7d),
        change1d: toNumber(item?.change_1d),
      }))
      .sort((a, b) => b.total24h - a.total24h)
      .slice(0, 8);

    return {
      source: 'DefiLlama Free API',
      updatedAt: Date.now(),
      total24h: toNumber(data?.total24h),
      total7d: toNumber(data?.total7d),
      change1d: toNumber(data?.change_1d),
      change7d: toNumber(data?.change_7d),
      topProtocols,
      coverageNote: 'Overview provided by DefiLlama derivatives endpoint.',
    };
  } catch (error: any) {
    const assets = await Promise.all([
      fetchBinanceOpenInterestAsset('BTCUSDT', 'BTC'),
      fetchBinanceOpenInterestAsset('ETHUSDT', 'ETH'),
      fetchBinanceOpenInterestAsset('PAXGUSDT', 'PAXG'),
    ]);

    return {
      source: 'Binance Futures Public API',
      updatedAt: Date.now(),
      fallbackReason: error?.status === 402 ? 'DefiLlama derivatives overview currently requires paid access.' : 'Fell back to public exchange data.',
      totalOpenInterestUsd: Number(assets.reduce((sum, item) => sum + item.openInterestUsd, 0).toFixed(2)),
      assets,
      coverageNote: 'BTC and ETH are usually available on public futures APIs. PAXG coverage may be limited.',
    };
  }
}
