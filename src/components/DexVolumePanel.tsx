import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, Waves } from 'lucide-react';

interface DexProtocol {
  name: string;
  total24h: number;
  total7d: number;
  change1d: number;
  change7d: number;
  chainsCount: number;
}

interface DexOverviewResponse {
  source: string;
  updatedAt: number;
  total24h: number;
  total7d: number;
  total30d: number;
  totalAllTime: number;
  change1d: number;
  change7d: number;
  change1m: number;
  topProtocols: DexProtocol[];
}

interface DexVolumePanelProps {
  lang: 'ar' | 'en';
}

function compactUsd(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value || 0);
}

export const DexVolumePanel: React.FC<DexVolumePanelProps> = ({ lang }) => {
  const [data, setData] = useState<DexOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/llama/dexs/overview');
      if (!res.ok) throw new Error(lang === 'ar' ? 'تعذر تحميل أحجام الـ DEX.' : 'Failed to load DEX volume overview.');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'DEX overview fetch failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="bg-[#09090b] border border-[#222227] rounded-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222227]">
        <div>
          <div className="text-[11px] uppercase font-mono text-gray-500">On-chain volume</div>
          <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2"><Waves className="w-4 h-4 text-blue-400" />{lang === 'ar' ? 'نبض أحجام DEX' : 'DEX Volume Pulse'}</h3>
          <p className="text-xs text-gray-400 mt-1">{lang === 'ar' ? 'طبقة تأكيد لنشاط السيولة اللامركزي عبر أكبر المنصات.' : 'A confirmation layer for decentralized activity and liquidity rotation.'}</p>
        </div>
        <button onClick={refresh} className="px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#111114] hover:bg-[#17171b] text-xs text-gray-100 flex items-center gap-2 font-mono"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />{lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">24h</div><div className="text-white text-lg font-bold">${compactUsd(data?.total24h || 0)}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">7D</div><div className="text-white text-lg font-bold">${compactUsd(data?.total7d || 0)}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'تغير يومي' : '1D change'}</div><div className={`text-lg font-bold ${(data?.change1d || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{data ? `${data.change1d > 0 ? '+' : ''}${data.change1d}%` : '--'}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'تغير أسبوعي' : '7D change'}</div><div className={`text-lg font-bold ${(data?.change7d || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{data ? `${data.change7d > 0 ? '+' : ''}${data.change7d}%` : '--'}</div></div>
      </div>

      <div className="rounded-xl border border-[#222] bg-[#0d0d0d] p-3 space-y-2">
        <div className="text-white font-bold text-xs font-mono flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-amber-400" />{lang === 'ar' ? 'أكبر منصات DEX خلال 24 ساعة' : 'Top DEX venues by 24h volume'}</div>
        {(data?.topProtocols || []).slice(0, 8).map((item, index) => (
          <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border border-[#1b1b1b] bg-black/20 px-3 py-2 text-xs font-mono">
            <div className="min-w-0"><span className="text-gray-500 mr-2">{index + 1}</span><span className="text-white truncate">{item.name}</span></div>
            <div className="text-blue-300 font-bold">${compactUsd(item.total24h)}</div>
            <div className={`text-[11px] ${(item.change1d || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{item.change1d > 0 ? '+' : ''}{item.change1d.toFixed(2)}%</div>
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</div>}
      <div className="text-[11px] text-gray-500 font-mono">{data?.source || 'DefiLlama'} • {lang === 'ar' ? 'آخر تحديث' : 'Updated'}: {data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : '--'}</div>
    </div>
  );
};
