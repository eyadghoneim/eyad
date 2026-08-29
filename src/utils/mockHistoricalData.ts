import { Candle, SupportedAsset, Timeframe } from '../types';

export function generate1YearAssetData(asset: SupportedAsset = 'BTC', currentBasePrice?: number): Candle[] {
  let defaultPrice = 77696;
  let startPrice = 54200;

  if (asset === 'ETH') {
    defaultPrice = 2436;
    startPrice = 1850;
  } else if (asset === 'PAXG') {
    defaultPrice = 4456;
    startPrice = 2050;
  }

  const basePrice = currentBasePrice || defaultPrice;
  const candles: Candle[] = [];
  const totalDays = 365;
  const candlesPerDay = 6; // 4-hour candles
  const totalCandles = totalDays * candlesPerDay;
  const now = Date.now();
  const stepMs = 4 * 60 * 60 * 1000; // 4 hours

  let price = startPrice;

  // Realistic Market Cycle Waves (Accumulation -> Markup -> Healthy Re-test -> Expansion)
  for (let i = totalCandles; i >= 0; i--) {
    const timestamp = now - i * stepMs;
    const progress = (totalCandles - i) / totalCandles;

    let macroTarget = startPrice;
    if (progress < 0.25) {
      // Phase 1: Institutional Accumulation & Initial Breakout
      macroTarget = startPrice + (startPrice * 0.24) * (progress / 0.25) + Math.sin(progress * 18) * (startPrice * 0.02);
    } else if (progress < 0.65) {
      // Phase 2: Strong Markup Bull Run & Higher Highs
      const subProg = (progress - 0.25) / 0.40;
      macroTarget = (startPrice * 1.24) + (basePrice * 1.15 - startPrice * 1.24) * Math.pow(subProg, 0.88) + Math.sin(subProg * 24) * (startPrice * 0.03);
    } else if (progress < 0.82) {
      // Phase 3: Healthy Retracement / Liquidity Sweep & EMA Pullback
      const subProg = (progress - 0.65) / 0.17;
      macroTarget = (basePrice * 1.15) - (basePrice * 0.12) * subProg + Math.sin(subProg * 20) * (basePrice * 0.025);
    } else {
      // Phase 4: Final Expansion & Consolidation into current base price
      const subProg = (progress - 0.82) / 0.18;
      macroTarget = (basePrice * 0.98) + (basePrice - basePrice * 0.98) * subProg + Math.sin(subProg * 15) * (basePrice * 0.015);
    }

    const pull = (macroTarget - price) * 0.045;
    const volatilityFactor = asset === 'PAXG' ? 0.0045 : asset === 'ETH' ? 0.009 : 0.008;
    const shock = (Math.random() - 0.485) * (price * volatilityFactor);
    const delta = pull + shock;

    const open = price;
    const close = Math.max(10, price + delta);
    const wickHigh = Math.random() * (price * (asset === 'PAXG' ? 0.003 : 0.005));
    const wickLow = Math.random() * (price * (asset === 'PAXG' ? 0.003 : 0.005));
    const high = Math.max(open, close) + wickHigh;
    const low = Math.min(open, close) - wickLow;
    const volume = Math.floor(1000 + Math.random() * 5000 + Math.abs(delta / price) * 80000);

    price = close;

    candles.push({
      time: timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
  }

  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.high, basePrice);
    last.low = Math.min(last.low, basePrice);
  }

  return candles;
}

export function generate1YearBtcData(currentBasePrice: number = 79473): Candle[] {
  return generate1YearAssetData('BTC', currentBasePrice);
}

export function aggregateCandles(candles: Candle[], timeframe: Timeframe): Candle[] {
  if (timeframe === '4h') return candles;

  if (timeframe === '1d') {
    const daily: Candle[] = [];
    let currentDayBucket: Candle[] = [];
    let currentDayStr = '';

    for (const c of candles) {
      const dateStr = new Date(c.time).toISOString().split('T')[0];
      if (dateStr !== currentDayStr && currentDayBucket.length > 0) {
        daily.push({
          time: currentDayBucket[0].time,
          open: currentDayBucket[0].open,
          high: Math.max(...currentDayBucket.map((x) => x.high)),
          low: Math.min(...currentDayBucket.map((x) => x.low)),
          close: currentDayBucket[currentDayBucket.length - 1].close,
          volume: currentDayBucket.reduce((sum, x) => sum + x.volume, 0),
        });
        currentDayBucket = [];
      }
      currentDayStr = dateStr;
      currentDayBucket.push(c);
    }
    if (currentDayBucket.length > 0) {
      daily.push({
        time: currentDayBucket[0].time,
        open: currentDayBucket[0].open,
        high: Math.max(...currentDayBucket.map((x) => x.high)),
        low: Math.min(...currentDayBucket.map((x) => x.low)),
        close: currentDayBucket[currentDayBucket.length - 1].close,
        volume: currentDayBucket.reduce((sum, x) => sum + x.volume, 0),
      });
    }
    return daily;
  }

  // For 1h or 15m, interpolate sub-candles for rich intraday view
  const subCount = timeframe === '1h' ? 4 : 16;
  const refined: Candle[] = [];
  const stepMs = timeframe === '1h' ? 60 * 60 * 1000 : 15 * 60 * 1000;

  // Use last 100 4h candles to generate high resolution intraday
  const sample = candles.slice(-80);
  for (let i = 0; i < sample.length; i++) {
    const parent = sample[i];
    let prevClose = parent.open;
    for (let s = 0; s < subCount; s++) {
      const t = parent.time + s * stepMs;
      const progress = (s + 1) / subCount;
      const targetSubClose = parent.open + (parent.close - parent.open) * progress;
      const noise = (Math.random() - 0.5) * (parent.high - parent.low) * 0.2;
      const subClose = targetSubClose + noise;
      const subOpen = prevClose;
      const subHigh = Math.max(subOpen, subClose) + Math.random() * (parent.high - parent.low) * 0.1;
      const subLow = Math.min(subOpen, subClose) - Math.random() * (parent.high - parent.low) * 0.1;

      refined.push({
        time: t,
        open: Number(subOpen.toFixed(2)),
        high: Number(subHigh.toFixed(2)),
        low: Number(subLow.toFixed(2)),
        close: Number(subClose.toFixed(2)),
        volume: Math.floor(parent.volume / subCount),
      });
      prevClose = subClose;
    }
  }

  return refined;
}
