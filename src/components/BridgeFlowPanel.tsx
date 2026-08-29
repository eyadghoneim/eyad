import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

interface BridgeFlowItem {
  name: string;
  slug: string;
  url: string;
  chainsCount: number;
  currentTvl: number;
  delta7dUsd: number;
  delta30dUsd: number;
  delta7dPct: number;
  delta30dPct: number;
}

interface BridgeFlowResponse {
  source: string;
  updatedAt: number;
  bridgeCount: number;
  totalBridgeLiquidityUsd: number;
  aggregate7dFlowUsd: number;
  aggregate30dFlowUsd: number;
  topBridges: BridgeFlowItem[];
  coverageNote?: string;
}

interface BridgeFlowPanelProps {
  lang: 'ar' | 'en';
}

function compactUsd(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value || 0);
}

function signedCompactUsd(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${compactUsd(Math.abs(value || 0))}`;
}

export const BridgeFlowPanel: React.FC<BridgeFlowPanelProps> = ({ lang }) => {
  const [data, setData] = useState<BridgeFlowResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/llama/bridges/flows');
      if (!res.ok) throw new Error(lang === 'ar' ? 'تعذر تحميل تدفقات الجسور.' : 'Failed to load bridge flows.');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Bridge flow fetch failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1f1f1f]">
        <div>
          <div className="text-[11px] uppercase font-mono text-gray-500">Bridge capital rotation</div>
          <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-fuchsia-400" />{lang === 'ar' ? 'رادار تدفقات الجسور' : 'Bridge Flow Radar'}</h3>
          <p className="text-xs text-gray-400 mt-1">{lang === 'ar' ? 'يراقب انتقال رأس المال عبر بروتوكولات الجسور الكبرى باستخدام تغيرات TVL الحرة.' : 'Tracks capital rotation across major bridge protocols using free TVL-change data.'}</p>
        </div>
        <button onClick={refresh} className="px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#111114] hover:bg-[#17171b] text-xs text-gray-100 flex items-center gap-2 font-mono"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />{lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'بروتوكولات الجسور' : 'Bridge venues'}</div><div className="text-white text-lg font-bold">{data?.bridgeCount ?? '--'}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'سيولة الجسور المختارة' : 'Tracked bridge liquidity'}</div><div className="text-fuchsia-300 text-lg font-bold">${compactUsd(data?.totalBridgeLiquidityUsd || 0)}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'تدفق 7 أيام' : '7D flow'}</div><div className={`text-lg font-bold ${(data?.aggregate7dFlowUsd || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{signedCompactUsd(data?.aggregate7dFlowUsd || 0)}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'تدفق 30 يوم' : '30D flow'}</div><div className={`text-lg font-bold ${(data?.aggregate30dFlowUsd || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{signedCompactUsd(data?.aggregate30dFlowUsd || 0)}</div></div>
      </div>

      <div className="rounded-xl border border-[#222] bg-[#0d0d0d] p-3 space-y-2">
        <div className="text-white font-bold text-xs font-mono">{lang === 'ar' ? 'أهم بروتوكولات الجسور حسب السيولة والتدفق' : 'Top bridge venues by liquidity and flow'}</div>
        {(data?.topBridges || []).slice(0, 6).map((item, index) => {
          const positive = item.delta7dUsd >= 0;
          return (
            <div key={item.slug || item.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border border-[#1b1b1b] bg-black/20 px-3 py-2 text-xs font-mono">
              <div className="min-w-0">
                <div className="text-white truncate"><span className="text-gray-500 mr-2">{index + 1}</span>{item.name}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{item.chainsCount} {lang === 'ar' ? 'سلاسل' : 'chains'} • TVL ${compactUsd(item.currentTvl)}</div>
              </div>
              <div className={`font-bold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>{signedCompactUsd(item.delta7dUsd)}</div>
              <div className={`text-[11px] flex items-center gap-1 ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>{positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{item.delta7dPct > 0 ? '+' : ''}{item.delta7dPct.toFixed(2)}%</div>
            </div>
          );
        })}
      </div>

      {data?.coverageNote && <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3 text-xs text-gray-300">{data.coverageNote}</div>}
      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</div>}
      <div className="text-[11px] text-gray-500 font-mono">{data?.source || 'DefiLlama'} • {lang === 'ar' ? 'آخر تحديث' : 'Updated'}: {data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : '--'}</div>
    </div>
  );
};
