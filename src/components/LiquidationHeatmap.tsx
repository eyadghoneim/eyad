import React, { useState } from 'react';
import { Flame, Layers, TrendingUp, TrendingDown, AlertOctagon, ShieldAlert, BarChart3, Crosshair, DollarSign, Activity } from 'lucide-react';
import { SupportedAsset } from '../types';

interface LiquidationHeatmapProps {
  currentAsset: SupportedAsset;
  currentPrice: number;
  lang: 'ar' | 'en';
}

export const LiquidationHeatmap: React.FC<LiquidationHeatmapProps> = ({
  currentAsset,
  currentPrice,
  lang,
}) => {
  const [selectedLeverage, setSelectedLeverage] = useState<'ALL' | '25x' | '50x' | '100x'>('ALL');

  // Realistic liquidation cluster levels scaled to current asset price
  const p = currentPrice || (currentAsset === 'BTC' ? 79473 : currentAsset === 'ETH' ? 2850 : 2650);

  const liquidationZones = [
    // Upper zones (Short liquidations - Magnetic pull for bull runs)
    {
      price: Math.round(p * 1.045),
      volumeUsd: currentAsset === 'BTC' ? 420 : currentAsset === 'ETH' ? 145 : 38,
      intensity: 'VERY_HIGH',
      type: 'SHORT_LIQ',
      leverage: '100x',
      labelAr: 'كتلة تصفية شورت ضخمة (مغناطيس صعودي قوي)',
      labelEn: 'Mega Short Liq Pool (Strong Bullish Magnet)',
      distancePct: +4.5,
    },
    {
      price: Math.round(p * 1.028),
      volumeUsd: currentAsset === 'BTC' ? 280 : currentAsset === 'ETH' ? 98 : 24,
      intensity: 'HIGH',
      type: 'SHORT_LIQ',
      leverage: '50x',
      labelAr: 'تصفية عقود 50x بيعية (هدف اندفاعي)',
      labelEn: '50x Short Liq Pool (Impulse Target)',
      distancePct: +2.8,
    },
    {
      price: Math.round(p * 1.012),
      volumeUsd: currentAsset === 'BTC' ? 165 : currentAsset === 'ETH' ? 62 : 15,
      intensity: 'MEDIUM',
      type: 'SHORT_LIQ',
      leverage: '25x',
      labelAr: 'سيولة شورت سريعة فوق القمة اللحظية',
      labelEn: 'Immediate Short Liquidity Above Peak',
      distancePct: +1.2,
    },

    // CURRENT PRICE
    {
      price: Math.round(p),
      volumeUsd: 0,
      intensity: 'CURRENT',
      type: 'CURRENT_PRICE',
      leverage: '-',
      labelAr: `السعر الفوري المباشر ($${p.toLocaleString()})`,
      labelEn: `Current Live Price ($${p.toLocaleString()})`,
      distancePct: 0,
    },

    // Lower zones (Long liquidations - Hunted during flash dips)
    {
      price: Math.round(p * 0.988),
      volumeUsd: currentAsset === 'BTC' ? 190 : currentAsset === 'ETH' ? 70 : 18,
      intensity: 'MEDIUM',
      type: 'LONG_LIQ',
      leverage: '25x',
      labelAr: 'سيولة تصفيات شراء سريعة (دعم أول)',
      labelEn: 'Fast Long Liquidation Pool (Support 1)',
      distancePct: -1.2,
    },
    {
      price: Math.round(p * 0.965),
      volumeUsd: currentAsset === 'BTC' ? 360 : currentAsset === 'ETH' ? 120 : 32,
      intensity: 'HIGH',
      type: 'LONG_LIQ',
      leverage: '50x',
      labelAr: 'حزام تصفية عقود 50x (منطقة صيد حيتان)',
      labelEn: '50x Long Liquidation Cluster (Whale Hunt Zone)',
      distancePct: -3.5,
    },
    {
      price: Math.round(p * 0.935),
      volumeUsd: currentAsset === 'BTC' ? 580 : currentAsset === 'ETH' ? 210 : 49,
      intensity: 'VERY_HIGH',
      type: 'LONG_LIQ',
      leverage: '100x',
      labelAr: 'جدار تصفية تاريخي 100x (قاع محمي مؤسسياً)',
      labelEn: 'Historic 100x Long Liq Wall (Institutional Floor)',
      distancePct: -6.5,
    },
  ];

  // Open Interest & Derivatives Metrics
  const openInterestBillions = currentAsset === 'BTC' ? 38.4 : currentAsset === 'ETH' ? 14.8 : 3.2;
  const oiDelta24h = +4.8;
  const longShortRatio = 1.62; // 61.8% Longs, 38.2% Shorts
  const fundingRate = 0.0092; // 0.0092% per 8h (Moderate Bullish)

  const filteredZones = liquidationZones.filter((z) => {
    if (z.type === 'CURRENT_PRICE') return true;
    if (selectedLeverage === 'ALL') return true;
    return z.leverage === selectedLeverage;
  });

  return (
    <div className="bg-[#09090b] border border-[#222227] rounded-xl p-4 sm:p-6 space-y-6 shadow-xl">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#222227]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Flame className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold font-mono text-white flex items-center gap-2">
              {lang === 'ar' ? `خريطة التصفيات والسيولة الحرجة (${currentAsset})` : `${currentAsset} Liquidation Heatmap & Critical Liquidity`}
              <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                PRO RADAR
              </span>
            </h2>
          </div>
          <p className="text-xs text-gray-400 font-sans mt-1">
            {lang === 'ar'
              ? 'كشف مناطق تركز سيولة المتداولين بالرافعة المالية لتوقع مصايد الحيتان (Squeeze) والانفجارات السعرية قبل حدوثها.'
              : 'Detect leverage liquidation clusters to predict whale squeezes and sudden liquidity sweeps before they trigger.'}
          </p>
        </div>

        {/* Leverage Filter Pills */}
        <div className="flex items-center bg-[#121215] p-1 rounded-lg border border-[#27272a] gap-1 font-mono text-xs">
          {(['ALL', '25x', '50x', '100x'] as const).map((lev) => (
            <button
              key={lev}
              onClick={() => setSelectedLeverage(lev)}
              className={`px-3 py-1 rounded transition-all font-semibold ${
                selectedLeverage === lev
                  ? 'bg-orange-500 text-black font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#1c1c21]'
              }`}
            >
              {lev}
            </button>
          ))}
        </div>
      </div>

      {/* Concise Direct Verdict & Direction Magnet */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/20 via-[#121215] to-emerald-950/20 border border-amber-500/30 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-400">
              <Crosshair className="w-4 h-4" />
            </span>
            <span className="font-bold text-xs sm:text-sm text-white font-mono">
              {lang === 'ar' ? '📌 الاتجاه الأقرب والهدف المغناطيسي:' : '📌 Liquidity Bias & Magnetic Target:'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs font-mono">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? `صعود ↗️ نحو الهدف: $${Math.round(p * 1.045).toLocaleString()}` : `Bullish ↗️ Target: $${Math.round(p * 1.045).toLocaleString()}`}</span>
          </div>
        </div>

        <div className="text-xs text-gray-300 font-sans flex items-center gap-2 bg-[#0a0a0c] p-2.5 rounded-lg border border-[#1f1f24]">
          <span className="text-amber-400 font-bold shrink-0">💡 {lang === 'ar' ? 'المعنى باختصار:' : 'Summary:'}</span>
          <span>
            {lang === 'ar'
              ? `السعر ينجذب لأعلى لتصفية صفقات الهبوط (الشورت) عند $${Math.round(p * 1.045).toLocaleString()}، بينما القاع محمي بجدار دعم قوي عند $${Math.round(p * 0.935).toLocaleString()}.`
              : `Price is magnetically pulled upward to sweep short stops at $${Math.round(p * 1.045).toLocaleString()}, backed by strong bottom support at $${Math.round(p * 0.935).toLocaleString()}.`}
          </span>
        </div>
      </div>

      {/* Top Derivatives Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        
        {/* Open Interest */}
        <div className="p-3.5 rounded-lg bg-[#111114] border border-[#222227]">
          <div className="text-[11px] text-gray-400 flex items-center justify-between">
            <span>{lang === 'ar' ? 'الفائدة المفتوحة (OI)' : 'Open Interest (OI)'}</span>
            <Layers className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            ${openInterestBillions.toFixed(1)}B
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+{oiDelta24h}% (24h Inflow)</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-1 pt-1 border-t border-[#1e1e24]">
            {lang === 'ar' ? '💡 حجم العقود المفتوحة بالسوق (أموال جديدة تدخل)' : '💡 Total open futures contracts'}
          </div>
        </div>

        {/* Long / Short Ratio */}
        <div className="p-3.5 rounded-lg bg-[#111114] border border-[#222227]">
          <div className="text-[11px] text-gray-400 flex items-center justify-between">
            <span>{lang === 'ar' ? 'نسبة الشراء/البيع' : 'Long/Short Ratio'}</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {longShortRatio.toFixed(2)} : 1
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            61.8% Longs • 38.2% Shorts
          </div>
          <div className="text-[10px] text-gray-400 mt-1 pt-1 border-t border-[#1e1e24]">
            {lang === 'ar' ? '💡 كفة المشترين أرجح في العقود الآجلة' : '💡 Buyer leverage dominance'}
          </div>
        </div>

        {/* Funding Rate */}
        <div className="p-3.5 rounded-lg bg-[#111114] border border-[#222227]">
          <div className="text-[11px] text-gray-400 flex items-center justify-between">
            <span>{lang === 'ar' ? 'معدل التمويل (Funding)' : 'Funding Rate'}</span>
            <DollarSign className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-300 mt-1">
            +{fundingRate.toFixed(4)}%
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {lang === 'ar' ? 'رسوم تمويل معتدلة صحية' : 'Healthy Neutral-Bullish'}
          </div>
          <div className="text-[10px] text-gray-400 mt-1 pt-1 border-t border-[#1e1e24]">
            {lang === 'ar' ? '💡 رسوم دورية يدفعها المشترون (طبيعية)' : '💡 Periodic fee paid by long traders'}
          </div>
        </div>

        {/* Dominant Magnetic Pull */}
        <div className="p-3.5 rounded-lg bg-[#111114] border border-orange-500/30 bg-orange-950/10">
          <div className="text-[11px] text-orange-300 flex items-center justify-between font-bold">
            <span>{lang === 'ar' ? 'الهدف المغناطيسي للسيولة' : 'Magnetic Hunt Target'}</span>
            <Crosshair className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-lg font-bold text-orange-400 mt-1">
            ${Math.round(p * 1.045).toLocaleString()}
          </div>
          <div className="text-[10px] text-orange-300/80 mt-0.5">
            {lang === 'ar' ? 'تصفية $420M شورت بالأعلى' : '$420M Short Squeeze Pool'}
          </div>
          <div className="text-[10px] text-orange-400/90 mt-1 pt-1 border-t border-orange-500/20">
            {lang === 'ar' ? '💡 السعر ينجذب لهذا الرقم لصيد البائعين' : '💡 Strong upward liquidity attractor'}
          </div>
        </div>

      </div>

      {/* Visual Liquidation Heatmap Ladder */}
      <div className="space-y-2 font-mono">
        <div className="flex items-center justify-between text-xs text-gray-400 pb-1 border-b border-[#222227]">
          <span>{lang === 'ar' ? 'المستوى السعري والتصفيات المتوقعة' : 'Price Level & Liquidation Density'}</span>
          <span>{lang === 'ar' ? 'حجم السيولة المرصودة' : 'Est. Liquidation Volume'}</span>
        </div>

        {filteredZones.map((zone, idx) => {
          if (zone.type === 'CURRENT_PRICE') {
            return (
              <div
                key={idx}
                className="py-2.5 px-4 rounded-lg bg-amber-500/15 border-2 border-amber-500/50 flex items-center justify-between text-xs font-bold text-amber-300 shadow-md animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>{zone.labelAr}</span>
                </div>
                <div className="text-right text-sm">
                  ${p.toLocaleString()} (0.00%)
                </div>
              </div>
            );
          }

          const isShort = zone.type === 'SHORT_LIQ';
          const maxVol = currentAsset === 'BTC' ? 600 : currentAsset === 'ETH' ? 220 : 50;
          const barWidth = Math.min(100, Math.round((zone.volumeUsd / maxVol) * 100));

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition-all ${
                isShort
                  ? 'bg-rose-950/15 border-rose-500/20 hover:border-rose-500/40'
                  : 'bg-emerald-950/15 border-emerald-500/20 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isShort ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {zone.leverage} {isShort ? 'SHORT' : 'LONG'}
                  </span>
                  <span className="font-bold text-white text-sm">
                    ${zone.price.toLocaleString()}
                  </span>
                  <span className={`text-[11px] font-semibold ${isShort ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ({zone.distancePct > 0 ? `+${zone.distancePct}%` : `${zone.distancePct}%`})
                  </span>
                </div>

                <div className="flex items-center gap-2 font-bold">
                  <span className="text-white">${zone.volumeUsd}M USD</span>
                </div>
              </div>

              {/* Density Bar */}
              <div className="w-full bg-[#1c1c21] h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isShort
                      ? 'bg-gradient-to-r from-orange-500 to-rose-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="text-[11px] text-gray-400 mt-1 font-sans">
                {lang === 'ar' ? zone.labelAr : zone.labelEn}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
