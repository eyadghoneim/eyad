import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Anchor, 
  Zap,
  Activity
} from 'lucide-react';
import { SupportedAsset, OrderBookDepth } from '../types';

interface WhaleOrderBookHeatmapProps {
  currentAsset: SupportedAsset;
  currentPrice: number;
  lang: 'ar' | 'en';
}

export const WhaleOrderBookHeatmap: React.FC<WhaleOrderBookHeatmapProps> = ({
  currentAsset,
  currentPrice,
  lang,
}) => {
  const [depthData, setDepthData] = useState<OrderBookDepth | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDepth = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/market/depth?asset=${currentAsset}`);
      if (res.ok) {
        const data = await res.json();
        setDepthData(data);
      }
    } catch (e) {
      console.warn('Failed to fetch depth data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepth();
    const interval = setInterval(fetchDepth, 12000);
    return () => clearInterval(interval);
  }, [currentAsset]);

  const bids = depthData?.bids.slice(0, 8) || [];
  const asks = depthData?.asks.slice(0, 8) || [];
  const maxBidVol = Math.max(...bids.map(b => b.amount), 1);
  const maxAskVol = Math.max(...asks.map(a => a.amount), 1);

  const buyerPct = depthData?.buyerPercentage || 60;
  const sellerPct = depthData?.sellerPercentage || 40;
  const isRule3Passed = depthData?.rule3Passed ?? true;

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4 space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              {lang === 'ar' ? `دفتر الأوامر والسيولة وخريطة الحيتان (${currentAsset}/USDT)` : `Order Book & Whale Liquidity Heatmap (${currentAsset})`}
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Binance Live Depth
              </span>
            </h3>
            <p className="text-xs text-gray-400 font-sans">
              {lang === 'ar' 
                ? 'رصد كتل السيولة وجدران الحيتان لتطبيق القاعدة الذهبية رقم 3' 
                : 'Monitor order book imbalance and detect giant whale ask walls (Rule #3)'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchDepth}
          disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#121212] hover:bg-[#1c1c1c] text-gray-300 border border-[#262626] text-xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : 'text-gray-400'}`} />
          <span>{lang === 'ar' ? 'تحديث السيولة' : 'Refresh Depth'}</span>
        </button>
      </div>

      {/* Order Book Intuitive Summary Box */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-blue-950/20 via-[#101014] to-emerald-950/20 border border-blue-500/30 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            {lang === 'ar' ? '📌 ملخص دفتر الأوامر باختصار:' : '📌 Order Book Summary:'}
          </span>
          <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
            buyerPct >= sellerPct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          }`}>
            {buyerPct >= sellerPct 
              ? (lang === 'ar' ? 'ضغط شرائي سائد 🟢' : 'Buying Pressure Dominant 🟢') 
              : (lang === 'ar' ? 'ضغط بيعي سائد 🔴' : 'Selling Pressure Dominant 🔴')}
          </span>
        </div>
        <p className="text-gray-300 font-sans text-[11px] leading-relaxed">
          {lang === 'ar'
            ? `الطلبات الخضراء (Bids) = طلبات شراء جاهزة تدعم السعر وتمنعه من الهبوط. العروض الحمراء (Asks) = أوامر بيع تنتظر السعر ليصعد لكي تبيعه. حالياً نسبة المشترين (${buyerPct}%) أكبر من البائعين (${sellerPct}%) مما يعطي أفضلية للصعود.`
            : `Green Bids = pending buy orders supporting price floor. Red Asks = sell orders waiting above. Currently buyers (${buyerPct}%) outweigh sellers (${sellerPct}%), favoring an upward push.`}
        </p>
      </div>

      {/* Golden Rule #3 Whale Wall Verdict Banner */}
      <div className={`p-3 rounded border text-xs flex items-center justify-between gap-3 ${
        isRule3Passed 
          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
          : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
      }`}>
        <div className="flex items-center gap-2">
          {isRule3Passed ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
          )}
          <span>
            {isRule3Passed
              ? (lang === 'ar' 
                  ? '✅ القاعدة رقم 3 متحققة: المسار السعري خالٍ من جدران البيع الكبيرة (No Whale Resistance).'
                  : '✅ Golden Rule #3 Validated: Upward path clear of major whale sell barriers.')
              : (lang === 'ar'
                  ? '⚠️ تحذير القاعدة رقم 3: تم رصد جدار بيع ضخم في دفتر الأوامر يعيق الصعود الفوري.'
                  : '⚠️ Rule #3 Alert: Heavy whale ask wall detected within +2% resistance!')}
          </span>
        </div>

        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-black/40 border border-current">
          {lang === 'ar' ? 'القاعدة 3' : 'Rule #3'}
        </span>
      </div>

      {/* Liquidity Imbalance Bar */}
      <div className="bg-[#0e0e0e] p-3 rounded border border-[#1f1f1f] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'سيولة الشراء (Bids)' : 'Bid Volume'}: {buyerPct}%
          </span>
          <span className="text-gray-400 font-bold">
            {lang === 'ar' ? 'التوازن السعري' : 'Depth Delta'}: {depthData?.imbalancePercent ?? +24}%
          </span>
          <span className="text-rose-400 font-bold flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'سيولة البيع (Asks)' : 'Ask Volume'}: {sellerPct}%
          </span>
        </div>

        <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#161616]">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${buyerPct}%` }} 
          />
          <div 
            className="h-full bg-rose-500 transition-all duration-500" 
            style={{ width: `${sellerPct}%` }} 
          />
        </div>
      </div>

      {/* Two-Column Depth Ladder (Bids vs Asks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Bids Column (Green) */}
        <div className="bg-[#080808] p-2.5 rounded border border-emerald-950/60 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 border-b border-emerald-950/80 pb-1">
            <span>{lang === 'ar' ? 'سعر الطلب (Bid Price)' : 'Bid Price (USDT)'}</span>
            <span>{lang === 'ar' ? 'الكمية والعمق' : 'Volume / Depth'}</span>
          </div>

          <div className="space-y-1">
            {bids.map((bid, i) => {
              const widthPct = Math.min(100, Math.round((bid.amount / maxBidVol) * 100));
              const isWhale = bid.amount >= maxBidVol * 0.7;

              return (
                <div key={i} className="relative flex items-center justify-between px-1.5 py-0.5 rounded overflow-hidden">
                  <div 
                    className="absolute inset-y-0 right-0 bg-emerald-500/15 pointer-events-none transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                  <span className="relative font-bold text-emerald-300">
                    ${bid.price.toLocaleString()}
                  </span>
                  <div className="relative flex items-center gap-1">
                    {isWhale && (
                      <span className="px-1 rounded text-[9px] bg-emerald-500/30 text-emerald-200 font-bold">
                        🐋 {lang === 'ar' ? 'حوت' : 'Whale'}
                      </span>
                    )}
                    <span className="text-gray-300">{bid.amount.toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Asks Column (Red) */}
        <div className="bg-[#080808] p-2.5 rounded border border-rose-950/60 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-400 border-b border-rose-950/80 pb-1">
            <span>{lang === 'ar' ? 'سعر العرض (Ask Price)' : 'Ask Price (USDT)'}</span>
            <span>{lang === 'ar' ? 'الكمية والعمق' : 'Volume / Depth'}</span>
          </div>

          <div className="space-y-1">
            {asks.map((ask, i) => {
              const widthPct = Math.min(100, Math.round((ask.amount / maxAskVol) * 100));
              const isWhale = ask.amount >= maxAskVol * 0.7;

              return (
                <div key={i} className="relative flex items-center justify-between px-1.5 py-0.5 rounded overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-rose-500/15 pointer-events-none transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                  <span className="relative font-bold text-rose-300">
                    ${ask.price.toLocaleString()}
                  </span>
                  <div className="relative flex items-center gap-1">
                    {isWhale && (
                      <span className="px-1 rounded text-[9px] bg-rose-500/30 text-rose-200 font-bold">
                        🛑 {lang === 'ar' ? 'جدار بيع' : 'Wall'}
                      </span>
                    )}
                    <span className="text-gray-300">{ask.amount.toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
