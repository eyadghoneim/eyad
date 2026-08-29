import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { SupportedAsset } from '../types';

interface OpenInterestAsset {
  asset: string;
  symbol: string;
  available: boolean;
  openInterestContracts: number;
  openInterestUsd: number;
  lastPrice: number;
  priceChange24h: number;
}

interface OpenInterestResponse {
  source: string;
  updatedAt: number;
  fallbackReason?: string;
  totalOpenInterestUsd?: number;
  coverageNote?: string;
  assets?: OpenInterestAsset[];
  total24h?: number;
  total7d?: number;
  change1d?: number;
  change7d?: number;
  topProtocols?: Array<{ name: string; total24h: number; change1d: number }>;
}

interface OpenInterestPanelProps {
  lang: 'ar' | 'en';
  currentAsset: SupportedAsset;
}

function compactUsd(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value || 0);
}

export const OpenInterestPanel: React.FC<OpenInterestPanelProps> = ({ lang, currentAsset }) => {
  const [data, setData] = useState<OpenInterestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/llama/open-interest/overview');
      if (!res.ok) throw new Error(lang === 'ar' ? 'تعذر تحميل بيانات الفائدة المفتوحة.' : 'Failed to load open interest overview.');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Open interest fetch failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const highlightedAsset = data?.assets?.find((item) => item.asset === currentAsset);

  return (
    <div className="bg-[#09090b] border border-[#222227] rounded-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222227]">
        <div>
          <div className="text-[11px] uppercase font-mono text-gray-500">Leverage regime</div>
          <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2"><Activity className="w-4 h-4 text-orange-400" />{lang === 'ar' ? 'مقياس الرافعة والفائدة المفتوحة' : 'Leverage & Open Interest Gauge'}</h3>
          <p className="text-xs text-gray-400 mt-1">{lang === 'ar' ? 'يعرض ضغط المشتقات الحالي ويكمل قراءة التصفية والطلب اللحظي.' : 'Shows current derivatives pressure and complements liquidation/order-book reading.'}</p>
        </div>
        <button onClick={refresh} className="px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#111114] hover:bg-[#17171b] text-xs text-gray-100 flex items-center gap-2 font-mono"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />{lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
      </div>

      {data?.fallbackReason && <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>{data.fallbackReason}</span></div>}

      {data?.assets && data.assets.length > 0 ? (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 font-mono text-xs">
            <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'إجمالي OI التقريبي' : 'Approx total OI'}</div><div className="text-orange-300 text-lg font-bold">${compactUsd(data.totalOpenInterestUsd || 0)}</div></div>
            <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'الأصل النشط' : 'Focused asset'}</div><div className="text-white text-lg font-bold">{currentAsset}</div></div>
            <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'سعر الأصل الحالي' : 'Current price'}</div><div className="text-white text-lg font-bold">{highlightedAsset?.available ? `$${compactUsd(highlightedAsset.lastPrice)}` : '--'}</div></div>
            <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">24h</div><div className={`text-lg font-bold ${(highlightedAsset?.priceChange24h || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{highlightedAsset?.available ? `${(highlightedAsset?.priceChange24h || 0) > 0 ? '+' : ''}${highlightedAsset?.priceChange24h.toFixed(2)}%` : '--'}</div></div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {data.assets.map((item) => (
              <div key={item.asset} className="rounded-xl border border-[#222] bg-[#0d0d0d] p-3 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between"><div className="text-white font-bold">{item.asset}</div><div className={`px-2 py-0.5 rounded-full border ${item.available ? 'border-emerald-500/30 text-emerald-300 bg-emerald-950/20' : 'border-rose-500/30 text-rose-300 bg-rose-950/20'}`}>{item.available ? 'LIVE' : 'N/A'}</div></div>
                <div className="text-gray-500">{item.symbol}</div>
                <div className="text-orange-300 text-lg font-bold">${compactUsd(item.openInterestUsd)}</div>
                <div className="text-gray-300">{lang === 'ar' ? 'العقود المفتوحة:' : 'Open contracts:'} <span className="text-white font-bold">{compactUsd(item.openInterestContracts)}</span></div>
                <div className={`text-[11px] ${(item.priceChange24h || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{lang === 'ar' ? 'تغير السعر 24 ساعة:' : '24h price change:'} {item.available ? `${item.priceChange24h > 0 ? '+' : ''}${item.priceChange24h.toFixed(2)}%` : '--'}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 font-mono text-xs">
          <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">24h</div><div className="text-white text-lg font-bold">${compactUsd(data?.total24h || 0)}</div></div>
          <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">7D</div><div className="text-white text-lg font-bold">${compactUsd(data?.total7d || 0)}</div></div>
          <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">1D</div><div className={`text-lg font-bold ${(data?.change1d || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{data ? `${(data.change1d || 0) > 0 ? '+' : ''}${(data.change1d || 0).toFixed(2)}%` : '--'}</div></div>
          <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">7D</div><div className={`text-lg font-bold ${(data?.change7d || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{data ? `${(data.change7d || 0) > 0 ? '+' : ''}${(data.change7d || 0).toFixed(2)}%` : '--'}</div></div>
        </div>
      )}

      {data?.coverageNote && <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3 text-xs text-gray-300">{data.coverageNote}</div>}
      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</div>}
      <div className="text-[11px] text-gray-500 font-mono">{data?.source || 'Market data'} • {lang === 'ar' ? 'آخر تحديث' : 'Updated'}: {data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : '--'}</div>
    </div>
  );
};
