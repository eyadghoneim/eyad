import React, { useEffect, useState } from 'react';
import { Coins, RefreshCw, ShieldCheck } from 'lucide-react';

interface StablecoinChain {
  name: string;
  totalStablecoinUsd: number;
}

interface StablecoinResponse {
  source: string;
  updatedAt: number;
  totalChains: number;
  totalStablecoinUsd: number;
  topChains: StablecoinChain[];
  featuredChains: StablecoinChain[];
}

interface StablecoinFlowPanelProps {
  lang: 'ar' | 'en';
}

function compactUsd(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value || 0);
}

export const StablecoinFlowPanel: React.FC<StablecoinFlowPanelProps> = ({ lang }) => {
  const [data, setData] = useState<StablecoinResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/llama/stablecoins/chains');
      if (!res.ok) throw new Error(lang === 'ar' ? 'تعذر تحميل بيانات الستيبلكوين.' : 'Failed to load stablecoin liquidity data.');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Stablecoin flow fetch failed.');
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
          <div className="text-[11px] uppercase font-mono text-gray-500">Stablecoin liquidity</div>
          <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2"><Coins className="w-4 h-4 text-emerald-400" />{lang === 'ar' ? 'رادار سيولة الستيبلكوين' : 'Stablecoin Liquidity Radar'}</h3>
          <p className="text-xs text-gray-400 mt-1">{lang === 'ar' ? 'مراقبة أماكن تركز رأس المال الجاهز للدخول في المخاطرة عبر السلاسل.' : 'Shows where deployable stablecoin capital is concentrated across chains.'}</p>
        </div>
        <button onClick={refresh} className="px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#111114] hover:bg-[#17171b] text-xs text-gray-100 flex items-center gap-2 font-mono"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />{lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'السلاسل المغطاة' : 'Chains covered'}</div><div className="text-white text-lg font-bold">{data?.totalChains ?? '--'}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'إجمالي الستيبلكوين' : 'Stablecoin mcap'}</div><div className="text-emerald-300 text-lg font-bold">${compactUsd(data?.totalStablecoinUsd || 0)}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">Top 1</div><div className="text-white text-base font-bold">{data?.topChains?.[0]?.name || '--'}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">Top 1 Value</div><div className="text-emerald-300 text-base font-bold">${compactUsd(data?.topChains?.[0]?.totalStablecoinUsd || 0)}</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#222] bg-[#0d0d0d] p-3 space-y-2">
          <div className="text-white font-bold text-xs font-mono">{lang === 'ar' ? 'أكبر السلاسل من حيث رأس المال المستقر' : 'Top stablecoin chains'}</div>
          {(data?.topChains || []).slice(0, 8).map((item, index) => (
            <div key={item.name} className="flex items-center justify-between rounded-lg border border-[#1b1b1b] bg-black/20 px-3 py-2 text-xs font-mono">
              <div className="flex items-center gap-2"><span className="text-gray-500 w-4">{index + 1}</span><span className="text-white">{item.name}</span></div>
              <div className="text-emerald-300 font-bold">${compactUsd(item.totalStablecoinUsd)}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0d0d0d] p-3 space-y-3">
          <div className="text-white font-bold text-xs font-mono flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />{lang === 'ar' ? 'قراءة سريعة' : 'Quick read'}</div>
          <div className="rounded-lg border border-[#1b1b1b] bg-black/20 p-3 text-sm text-gray-300 leading-7">
            {lang === 'ar'
              ? 'ارتفاع المعروض المستقر على السلاسل الكبرى يعني سيولة جاهزة للدخول في السوق، بينما انكماشه قد يشير إلى ضعف شهية المخاطرة أو سحب رأس المال.'
              : 'Rising stablecoin capitalization across major chains often signals deployable liquidity, while contraction can imply weaker risk appetite or capital withdrawal.'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(data?.featuredChains || []).slice(0, 6).map((item) => (
              <div key={item.name} className="rounded-lg border border-[#1b1b1b] bg-black/20 p-3 text-xs font-mono">
                <div className="text-gray-500">{item.name}</div>
                <div className="text-emerald-300 font-bold mt-1">${compactUsd(item.totalStablecoinUsd)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</div>}
      <div className="text-[11px] text-gray-500 font-mono">{data?.source || 'DefiLlama'} • {lang === 'ar' ? 'آخر تحديث' : 'Updated'}: {data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : '--'}</div>
    </div>
  );
};
