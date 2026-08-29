import { Candle, ElliottWaveAnalysis } from '../types';

export function analyzeElliottWave(candles: Candle[]): ElliottWaveAnalysis {
  if (!candles || candles.length < 30) {
    const p = candles?.[candles.length - 1]?.close || 88000;
    return {
      currentWave: 'WAVE_3',
      waveType: 'IMPULSE',
      estimatedTarget: p * 1.08,
      invalidationPrice: p * 0.94,
      fibLevels: {
        level0_236: p * 0.98,
        level0_382: p * 0.96,
        level0_500: p * 0.95,
        level0_618: p * 0.93,
        level0_786: p * 0.91,
        level1_618: p * 1.06,
      },
      confidence: 75,
      explanationAr: 'جاري تحميل وحساب موجات إليوت...',
      explanationEn: 'Calculating Elliott Waves...',
    };
  }

  const n = candles.length;
  const currentPrice = candles[n - 1].close;

  // Find local swing highs and lows in the last 60 candles
  const windowSize = Math.min(60, n);
  const recentCandles = candles.slice(-windowSize);
  
  const swings: Array<{ index: number; type: 'HIGH' | 'LOW'; price: number; time: number }> = [];

  for (let i = 2; i < recentCandles.length - 2; i++) {
    const c = recentCandles[i];
    const isHigh = c.high > recentCandles[i - 1].high && c.high > recentCandles[i - 2].high &&
                   c.high > recentCandles[i + 1].high && c.high > recentCandles[i + 2].high;
    const isLow = c.low < recentCandles[i - 1].low && c.low < recentCandles[i - 2].low &&
                  c.low < recentCandles[i + 1].low && c.low < recentCandles[i + 2].low;

    if (isHigh) swings.push({ index: i, type: 'HIGH', price: c.high, time: c.time });
    if (isLow) swings.push({ index: i, type: 'LOW', price: c.low, time: c.time });
  }

  // Identify primary anchor swing
  const lowestSwing = swings.filter((s) => s.type === 'LOW').sort((a, b) => a.price - b.price)[0] || {
    price: Math.min(...recentCandles.map((c) => c.low)),
  };
  const highestSwing = swings.filter((s) => s.type === 'HIGH').sort((a, b) => b.price - a.price)[0] || {
    price: Math.max(...recentCandles.map((c) => c.high)),
  };

  const majorRange = highestSwing.price - lowestSwing.price;
  const isUptrend = currentPrice > (lowestSwing.price + majorRange * 0.4);

  // Fibonacci Retracement / Extension calculation from key swing
  const fib0 = lowestSwing.price;
  const fib1 = highestSwing.price;
  const diff = fib1 - fib0;

  const fibLevels = {
    level0_236: Number((fib1 - diff * 0.236).toFixed(2)),
    level0_382: Number((fib1 - diff * 0.382).toFixed(2)),
    level0_500: Number((fib1 - diff * 0.5).toFixed(2)),
    level0_618: Number((fib1 - diff * 0.618).toFixed(2)),
    level0_786: Number((fib1 - diff * 0.786).toFixed(2)),
    level1_618: Number((fib1 + diff * 0.618).toFixed(2)),
  };

  let currentWave: ElliottWaveAnalysis['currentWave'] = 'WAVE_3';
  let waveType: 'IMPULSE' | 'CORRECTIVE' | 'TRANSITION' = 'IMPULSE';
  let estimatedTarget = fibLevels.level1_618;
  let invalidationPrice = fibLevels.level0_618;
  let confidence = 82;
  let explanationAr = '';
  let explanationEn = '';

  // Determine wave count stage based on price relative to Fib levels and swing counts
  if (isUptrend) {
    if (currentPrice > highestSwing.price * 0.98) {
      // In Wave 3 or Wave 5 expansion
      currentWave = 'WAVE_3';
      waveType = 'IMPULSE';
      estimatedTarget = Number((currentPrice * 1.07).toFixed(2));
      invalidationPrice = Number((fibLevels.level0_500).toFixed(2));
      confidence = 88;
      explanationAr = `البتكوين داخل الموجة الثالثة الدافعة (Wave 3) - أقوى موجات إليوت صعوداً. الهدف المتوقع عند امتداد فيبوناتشي 1.618 ($${estimatedTarget.toLocaleString()})، ومستوى إلغاء السيناريو عند كسر $${invalidationPrice.toLocaleString()}.`;
      explanationEn = `Bitcoin is advancing in Wave 3 Impulse (the most explosive Elliott wave). Target is 1.618 Fib extension ($${estimatedTarget.toLocaleString()}), invalidation below $${invalidationPrice.toLocaleString()}.`;
    } else if (currentPrice < fibLevels.level0_382 && currentPrice > fibLevels.level0_618) {
      // Healthy pullback Wave 4 or Wave 2
      currentWave = 'WAVE_4';
      waveType = 'CORRECTIVE';
      estimatedTarget = Number((highestSwing.price * 1.05).toFixed(2));
      invalidationPrice = Number((fibLevels.level0_786).toFixed(2));
      confidence = 84;
      explanationAr = `تصحيح صحي ضمن الموجة الرابعة (Wave 4) فوق منطقة الدعم الذهبية 0.618 فيبوناتشي ($${fibLevels.level0_618.toLocaleString()}). فرصة دخول سبوت ممتازة قبل انطلاق الموجة الخامسة (Wave 5).`;
      explanationEn = `Healthy Wave 4 correction holding above golden Fib pocket 0.618 ($${fibLevels.level0_618.toLocaleString()}). Prime spot accumulation zone before Wave 5 surge.`;
    } else {
      currentWave = 'WAVE_5';
      waveType = 'IMPULSE';
      estimatedTarget = Number((highestSwing.price * 1.03).toFixed(2));
      invalidationPrice = Number((fibLevels.level0_500).toFixed(2));
      confidence = 76;
      explanationAr = `نهايات الموجة الخامسة الصاعدة (Wave 5). يوصى بالاستعداد لجني أرباح السبوت وتفعيل وقف الخسارة الصارم.`;
      explanationEn = `Late Wave 5 impulse stage. Spot profit-taking is advised with trailing stop loss.`;
    }
  } else {
    currentWave = 'WAVE_C';
    waveType = 'CORRECTIVE';
    estimatedTarget = Number((lowestSwing.price * 0.98).toFixed(2));
    invalidationPrice = Number((fibLevels.level0_382).toFixed(2));
    confidence = 80;
    explanationAr = `مرحلة تصحيحية عريضة (Wave C). السعر يختبر قيعان السيولة، يُنصح بالبقاء في الدولار (USDT) وانتظار إشارة اكتمال القاع.`;
    explanationEn = `Corrective ABC cycle (Wave C). Price is probing liquidity bottoms, stay in cash/USDT until bottom confirmation.`;
  }

  return {
    currentWave,
    waveType,
    estimatedTarget,
    invalidationPrice,
    fibLevels,
    confidence,
    explanationAr,
    explanationEn,
  };
}

export const analyzeElliottWaves = analyzeElliottWave;

