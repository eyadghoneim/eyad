import type { LiquidityRegimeScorecard, SupportedAsset } from './src/types';

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
      'User-Agent': 'eyad-trading-liquidity-proxy/1.0',
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

async function fetchJsonCachedPost<T = any>(key: string, url: string, body: object, ttlMs: number): Promise<T> {
  const cached = readCached<T>(key);
  if (cached) return cached;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'eyad-trading-liquidity-proxy/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computePctChange(current: number, previous: number) {
  if (!previous) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function formatSignedCompactUsd(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const abs = Math.abs(value || 0);
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(abs);
  return `${sign}$${compact}`;
}

function findPreviousPoint<T extends { timestamp: number }>(points: T[], targetTimestamp: number) {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].timestamp <= targetTimestamp) return points[i];
  }
  return points[0] || null;
}

function normalizeTimeseries(rows: any[] | undefined, valueIndexOrKey: number | string = 1) {
  return (rows || [])
    .map((item: any) => {
      if (Array.isArray(item)) {
        const timestamp = toNumber(item[0]) * 1000;
        const value = typeof valueIndexOrKey === 'number' ? toNumber(item[valueIndexOrKey]) : 0;
        return { timestamp, value };
      }
      const timestamp = toNumber(item?.date ?? item?.timestamp) * (String(item?.date || item?.timestamp).length <= 10 ? 1000 : 1);
      const value = typeof valueIndexOrKey === 'string'
        ? toNumber(item?.[valueIndexOrKey])
        : toNumber(item?.value ?? item?.totalLiquidityUSD ?? item?.tvl);
      return { timestamp, value };
    })
    .filter((item) => item.timestamp > 0 && Number.isFinite(item.value))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function extractProtocolSeries(chainTvls: Record<string, any> | undefined) {
  const byTimestamp = new Map<number, number>();
  Object.values(chainTvls || {}).forEach((chainEntry: any) => {
    const series = normalizeTimeseries(chainEntry?.tvl, 'totalLiquidityUSD');
    series.forEach((point) => {
      byTimestamp.set(point.timestamp, (byTimestamp.get(point.timestamp) || 0) + point.value);
    });
  });

  return Array.from(byTimestamp.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function buildBridgeFlowSummary(name: string, slug: string, url: string, currentTvlHint: number, chainTvls: Record<string, any> | undefined, chains: string[] = []) {
  const points = extractProtocolSeries(chainTvls);
  const latest = points[points.length - 1] || { timestamp: Date.now(), value: currentTvlHint || 0 };
  const point7d = findPreviousPoint(points, latest.timestamp - 7 * 24 * 60 * 60 * 1000) || latest;
  const point30d = findPreviousPoint(points, latest.timestamp - 30 * 24 * 60 * 60 * 1000) || point7d || latest;
  const currentTvl = currentTvlHint > 0 ? currentTvlHint : latest.value;
  const delta7dUsd = Number((currentTvl - point7d.value).toFixed(2));
  const delta30dUsd = Number((currentTvl - point30d.value).toFixed(2));

  return {
    name,
    slug,
    url,
    chainsCount: chains.length,
    currentTvl,
    delta7dUsd,
    delta30dUsd,
    delta7dPct: computePctChange(currentTvl, point7d.value),
    delta30dPct: computePctChange(currentTvl, point30d.value),
    updatedAt: latest.timestamp,
  };
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

async function getHyperliquidOpenInterestAssets() {
  const payload = await fetchJsonCachedPost<any>('hyperliquid:meta-and-asset-ctxs', 'https://api.hyperliquid.xyz/info', { type: 'metaAndAssetCtxs' }, 2 * 60 * 1000);
  const universe = payload?.[0]?.universe || [];
  const assetCtxs = payload?.[1] || [];
  const watchlist = ['BTC', 'ETH', 'PAXG'];

  return watchlist.map((asset) => {
    const index = universe.findIndex((item: any) => String(item?.name || '').toUpperCase() === asset);
    if (index === -1) {
      return {
        asset,
        symbol: `${asset}-PERP`,
        venue: 'Hyperliquid',
        available: false,
        openInterestContracts: 0,
        openInterestUsd: 0,
        lastPrice: 0,
        fundingRate: 0,
        premiumPct: 0,
        dayNotionalVolume: 0,
        maxLeverage: 0,
      };
    }

    const meta = universe[index] || {};
    const ctx = assetCtxs[index] || {};
    const openInterestContracts = toNumber(ctx?.openInterest);
    const lastPrice = toNumber(ctx?.markPx || ctx?.oraclePx || ctx?.midPx);
    const prevDayPx = toNumber(ctx?.prevDayPx);
    const priceChange24h = prevDayPx > 0 ? ((lastPrice - prevDayPx) / prevDayPx) * 100 : 0;

    return {
      asset,
      symbol: `${asset}-PERP`,
      venue: 'Hyperliquid',
      available: openInterestContracts > 0 && lastPrice > 0,
      openInterestContracts,
      openInterestUsd: Number((openInterestContracts * lastPrice).toFixed(2)),
      lastPrice,
      priceChange24h,
      fundingRate: Number((toNumber(ctx?.funding) * 100).toFixed(4)),
      premiumPct: Number((toNumber(ctx?.premium) * 100).toFixed(4)),
      dayNotionalVolume: toNumber(ctx?.dayNtlVlm),
      maxLeverage: toNumber(meta?.maxLeverage),
    };
  });
}

export async function getOpenInterestOverview() {
  const sources: string[] = [];
  let fallbackReason = '';
  let chartPoints: Array<{ timestamp: number; value: number }> = [];

  try {
    const data = await fetchJsonCached<any>('llama:open-interest-overview', 'https://api.llama.fi/overview/open-interest', 2 * 60 * 1000);
    chartPoints = normalizeTimeseries(data?.totalDataChart, 1);
    if (chartPoints.length > 0) {
      sources.push('DefiLlama Free API');
    }
  } catch (error: any) {
    fallbackReason = error?.message || 'DefiLlama open-interest overview unavailable.';
  }

  let assets = [] as any[];
  try {
    assets = await getHyperliquidOpenInterestAssets();
    if (assets.length > 0) {
      sources.push('Hyperliquid Public API');
    }
  } catch (error: any) {
    fallbackReason = fallbackReason || error?.message || 'Hyperliquid open-interest snapshot unavailable.';
  }

  const latest = chartPoints[chartPoints.length - 1] || { timestamp: Date.now(), value: 0 };
  const point1d = findPreviousPoint(chartPoints, latest.timestamp - 24 * 60 * 60 * 1000) || latest;
  const point7d = findPreviousPoint(chartPoints, latest.timestamp - 7 * 24 * 60 * 60 * 1000) || latest;
  const totalFromAssets = Number(assets.reduce((sum, item) => sum + toNumber(item.openInterestUsd), 0).toFixed(2));
  const latestTotalOpenInterestUsd = latest.value > 0 ? latest.value : totalFromAssets;
  const delta1dPct = computePctChange(latest.value || totalFromAssets, point1d.value || totalFromAssets);
  const delta7dPct = computePctChange(latest.value || totalFromAssets, point7d.value || totalFromAssets);

  return {
    source: sources.join(' + ') || 'Hyperliquid Public API',
    sources,
    updatedAt: Date.now(),
    fallbackReason: fallbackReason || undefined,
    latestTotalOpenInterestUsd,
    totalOpenInterestUsd: latestTotalOpenInterestUsd,
    delta1dPct,
    delta7dPct,
    totalDataChart: chartPoints.slice(-60),
    assets,
    coverageNote: 'Global open-interest trend comes from DefiLlama free data, while BTC/ETH/PAXG per-asset snapshots come from Hyperliquid public perpetuals data.',
  };
}

export async function getBridgeFlowOverview() {
  const protocols = await fetchJsonCached<any[]>('llama:protocols', 'https://api.llama.fi/protocols', 15 * 60 * 1000);
  const preferredSlugs = ['layerzero-v2', 'hyperliquid-bridge', 'ccip', 'portal', 'across', 'synapse', 'orbiter-finance', 'stargate-v2', 'stargate'];
  const bridgeProtocols = (protocols || [])
    .filter((item) => String(item?.category || '').toLowerCase() === 'bridge')
    .filter((item) => Array.isArray(item?.chains) && item.chains.length > 1)
    .sort((a, b) => toNumber(b?.tvl) - toNumber(a?.tvl));

  const selected = [
    ...preferredSlugs
      .map((slug) => bridgeProtocols.find((item) => String(item?.slug || '') === slug))
      .filter(Boolean),
    ...bridgeProtocols,
  ]
    .filter((item, index, self) => self.findIndex((candidate) => candidate?.slug === item?.slug) === index)
    .slice(0, 6);

  const details = await Promise.all(
    selected.map(async (item: any) => {
      try {
        const detail = await fetchJsonCached<any>(`llama:protocol:${item.slug}`, `https://api.llama.fi/protocol/${encodeURIComponent(item.slug)}`, 30 * 60 * 1000);
        return buildBridgeFlowSummary(
          String(detail?.name || item?.name || 'Unknown Bridge'),
          String(item?.slug || detail?.slug || ''),
          String(detail?.url || item?.url || ''),
          toNumber(item?.tvl),
          detail?.chainTvls,
          detail?.chains || item?.chains || [],
        );
      } catch {
        return buildBridgeFlowSummary(
          String(item?.name || 'Unknown Bridge'),
          String(item?.slug || ''),
          String(item?.url || ''),
          toNumber(item?.tvl),
          undefined,
          item?.chains || [],
        );
      }
    }),
  );

  const topBridges = details
    .filter((item) => item.currentTvl > 0)
    .sort((a, b) => b.currentTvl - a.currentTvl);

  return {
    source: 'DefiLlama Free API',
    updatedAt: Date.now(),
    bridgeCount: bridgeProtocols.length,
    totalBridgeLiquidityUsd: Number(topBridges.reduce((sum, item) => sum + item.currentTvl, 0).toFixed(2)),
    aggregate7dFlowUsd: Number(topBridges.reduce((sum, item) => sum + item.delta7dUsd, 0).toFixed(2)),
    aggregate30dFlowUsd: Number(topBridges.reduce((sum, item) => sum + item.delta30dUsd, 0).toFixed(2)),
    topBridges,
    coverageNote: 'Bridge flow cards are derived from free DefiLlama bridge protocol TVL histories and show capital rotation across major bridge venues.',
  };
}

export async function getLiquidityRegimeSnapshot(asset: SupportedAsset = 'BTC'): Promise<LiquidityRegimeScorecard> {
  const [chains, stablecoins, dexs, openInterest, bridges] = await Promise.all([
    getLlamaChainsOverview(),
    getLlamaStablecoinChains(),
    getLlamaDexOverview(),
    getOpenInterestOverview(),
    getBridgeFlowOverview(),
  ]);

  let macroScore = 0;
  let stablecoinScore = 0;
  let dexScore = 0;
  let openInterestScore = 0;
  let bridgeScore = 0;
  const highlightsAr: string[] = [];
  const highlightsEn: string[] = [];

  if (chains.totalTvl >= 85000000000) {
    macroScore += 2;
    highlightsAr.push(`إجمالي سيولة السلاسل الكبرى قوي عند ${formatSignedCompactUsd(chains.totalTvl).replace('+', '')}.`);
    highlightsEn.push(`Aggregate chain liquidity remains deep at ${formatSignedCompactUsd(chains.totalTvl).replace('+', '')}.`);
  } else if (chains.totalTvl <= 65000000000) {
    macroScore -= 2;
    highlightsAr.push('إجمالي TVL ضعيف نسبياً مقارنة بموجات المخاطرة القوية.');
    highlightsEn.push('Aggregate TVL is relatively soft versus strong risk-on periods.');
  }

  if (stablecoins.totalStablecoinUsd >= 250000000000) {
    stablecoinScore += 2;
    highlightsAr.push(`رأس المال المستقر مرتفع عند ${formatSignedCompactUsd(stablecoins.totalStablecoinUsd).replace('+', '')} ويعني ذخيرة شراء جاهزة.`);
    highlightsEn.push(`Stablecoin capitalization is elevated at ${formatSignedCompactUsd(stablecoins.totalStablecoinUsd).replace('+', '')}, signaling deployable dry powder.`);
  } else if (stablecoins.totalStablecoinUsd <= 180000000000) {
    stablecoinScore -= 2;
    highlightsAr.push('انكماش رأس المال المستقر يضغط على شهية المخاطرة.');
    highlightsEn.push('Stablecoin contraction is pressuring risk appetite.');
  }

  if (dexs.change1d >= 3) {
    dexScore += 2;
    highlightsAr.push(`أحجام DEX اليومية تتسارع (+${dexs.change1d}%).`);
    highlightsEn.push(`DEX activity is accelerating on a daily basis (+${dexs.change1d}%).`);
  } else if (dexs.change1d <= -3) {
    dexScore -= 2;
    highlightsAr.push(`أحجام DEX اليومية تتراجع (${dexs.change1d}%).`);
    highlightsEn.push(`DEX activity is fading on a daily basis (${dexs.change1d}%).`);
  }

  if (dexs.change7d >= 0) {
    dexScore += 1;
  } else {
    dexScore -= 1;
  }

  if (openInterest.delta1dPct >= 2) {
    openInterestScore += 2;
    highlightsAr.push(`الفائدة المفتوحة العالمية ترتفع يومياً (+${openInterest.delta1dPct}%).`);
    highlightsEn.push(`Global open interest is expanding day-over-day (+${openInterest.delta1dPct}%).`);
  } else if (openInterest.delta1dPct <= -2) {
    openInterestScore -= 2;
    highlightsAr.push(`الفائدة المفتوحة العالمية تنكمش يومياً (${openInterest.delta1dPct}%).`);
    highlightsEn.push(`Global open interest is contracting day-over-day (${openInterest.delta1dPct}%).`);
  }

  if (openInterest.delta7dPct >= 0) {
    openInterestScore += 1;
  } else {
    openInterestScore -= 1;
  }

  const assetOi = (openInterest.assets || []).find((item: any) => item.asset === asset);
  if (assetOi?.available) {
    if (assetOi.fundingRate > 0 && assetOi.fundingRate <= 0.02) {
      openInterestScore += 1;
      highlightsAr.push(`${asset} تمويله معتدل وإيجابي (${assetOi.fundingRate}%).`);
      highlightsEn.push(`${asset} funding is mildly positive (${assetOi.fundingRate}%).`);
    } else if (assetOi.fundingRate >= 0.05) {
      openInterestScore -= 1;
      highlightsAr.push(`${asset} مزدحم لونج بسبب ارتفاع التمويل (${assetOi.fundingRate}%).`);
      highlightsEn.push(`${asset} looks crowded on the long side with high funding (${assetOi.fundingRate}%).`);
    } else if (assetOi.fundingRate < -0.02) {
      openInterestScore += 1;
      highlightsAr.push(`${asset} يحمل تمويلاً سلبياً قد يدعم ارتداد squeeze (${assetOi.fundingRate}%).`);
      highlightsEn.push(`${asset} is carrying negative funding, which can support a squeeze rebound (${assetOi.fundingRate}%).`);
    }
  }

  if (bridges.aggregate7dFlowUsd >= 250000000) {
    bridgeScore += 2;
    highlightsAr.push(`تدفقات الجسور خلال 7 أيام إيجابية (${formatSignedCompactUsd(bridges.aggregate7dFlowUsd)}).`);
    highlightsEn.push(`Bridge capital rotation is positive over 7 days (${formatSignedCompactUsd(bridges.aggregate7dFlowUsd)}).`);
  } else if (bridges.aggregate7dFlowUsd <= -250000000) {
    bridgeScore -= 2;
    highlightsAr.push(`تدفقات الجسور خلال 7 أيام سلبية (${formatSignedCompactUsd(bridges.aggregate7dFlowUsd)}).`);
    highlightsEn.push(`Bridge capital rotation is negative over 7 days (${formatSignedCompactUsd(bridges.aggregate7dFlowUsd)}).`);
  }

  if (bridges.aggregate30dFlowUsd >= 0) {
    bridgeScore += 1;
  } else {
    bridgeScore -= 1;
  }

  const totalAdjustment = clamp(macroScore + stablecoinScore + dexScore + openInterestScore + bridgeScore, -10, 10);
  const verdict: LiquidityRegimeScorecard['verdict'] = totalAdjustment >= 3 ? 'RISK_ON' : totalAdjustment <= -3 ? 'RISK_OFF' : 'NEUTRAL';

  const summaryAr = verdict === 'RISK_ON'
    ? 'البيئة الكلية والسيولة المشتقة تدعم رفع الثقة قليلاً في إشارات السبوت النظيفة.'
    : verdict === 'RISK_OFF'
      ? 'البيئة الكلية تشير إلى ضرورة خفض الثقة وتشديد الانتقائية قبل فتح صفقات جديدة.'
      : 'بيئة سيولة متوازنة؛ لا توجد دفعة كلية قوية ولا انهيار واضح، لذا يفضل الاعتماد على التوافق الفني أولاً.';

  const summaryEn = verdict === 'RISK_ON'
    ? 'Macro liquidity and derivatives positioning support a mild confidence boost for clean spot setups.'
    : verdict === 'RISK_OFF'
      ? 'The broader liquidity regime argues for reduced conviction and tighter selectivity before new entries.'
      : 'Liquidity conditions are balanced, so technical confluence should remain the primary decision driver.';

  return {
    signature: `${asset}|${verdict}|${totalAdjustment}|${Math.round(openInterest.delta1dPct * 10)}|${Math.round(bridges.aggregate7dFlowUsd / 1000000)}`,
    verdict,
    totalAdjustment,
    macroScore,
    stablecoinScore,
    dexScore,
    openInterestScore,
    bridgeScore,
    asset,
    summaryAr,
    summaryEn,
    highlightsAr: highlightsAr.slice(0, 5),
    highlightsEn: highlightsEn.slice(0, 5),
    updatedAt: Date.now(),
    source: [chains.source, stablecoins.source, dexs.source, openInterest.source, bridges.source],
  };
}
