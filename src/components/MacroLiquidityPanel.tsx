import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Database, RefreshCw } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ChainItem {
  name: string;
  tokenSymbol: string;
  tvl: number;
}

interface ChainsOverviewResponse {
  source: string;
  updatedAt: number;
  totalChains: number;
  totalTvl: number;
  topChains: ChainItem[];
  featuredChains: ChainItem[];
}

interface ChainHistoryPoint {
  timestamp: number;
  tvl: number;
  label: string;
}

interface ChainHistoryResponse {
  source: string;
  updatedAt: number;
  chain: string;
  latestTvl: number;
  delta7dPct: number;
  delta30dPct: number;
  points: ChainHistoryPoint[];
}

interface MacroLiquidityPanelProps {
  lang: 'ar' | 'en';
}

const watchedChains = ['ethereum', 'base', 'arbitrum', 'bsc', 'solana', 'tron'];

function compactUsd(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value || 0);
}

export const MacroLiquidityPanel: React.FC<MacroLiquidityPanelProps> = ({ lang }) => {
  const [overview, setOverview] = useState<ChainsOverviewResponse | null>(null);
  const [history, setHistory] = useState<ChainHistoryResponse | null>(null);
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshOverview = async () => {
    const res = await fetch('/api/llama/chains');
    if (!res.ok) throw new Error(lang === 'ar' ? 'تعذر تحميل بيانات سيولة السلاسل.' : 'Failed to load chain liquidity data.');
    const data = await res.json();
    setOverview(data);
  };

  const refreshHistory = async (chain: string) => {
    const res = await fetch(`/api/llama/chains/${chain}/history`);
    if (!res.ok) throw new Error(lang === 'ar' ? 'تعذر تحميل الاتجاه التاريخي للسيولة.' : 'Failed to load historical liquidity trend.');
    const data = await res.json();
    setHistory(data);
  };

  const refreshAll = async (chain = selectedChain) => {
    setIsLoading(true);
    setError('');
    try {
      await Promise.all([refreshOverview(), refreshHistory(chain)]);
    } catch (e: any) {
      setError(e.message || 'Failed to refresh liquidity data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll(selectedChain);
  }, []);

  useEffect(() => {
    refreshHistory(selectedChain).catch((e: any) => setError(e.message || 'Failed to load chain trend.'));
  }, [selectedChain]);

  const chartData = useMemo(() => (history?.points || []).slice(-30), [history]);

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1f1f1f]">
        <div>
          <div className="text-[11px] uppercase font-mono text-gray-500">{lang === 'ar' ? 'Macro liquidity regime' : 'Macro liquidity regime'}</div>
          <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2"><Database className="w-4 h-4 text-cyan-400" />{lang === 'ar' ? 'رادار سيولة السلاسل' : 'Chain Liquidity Radar'}</h3>
          <p className="text-xs text-gray-400 mt-1">{lang === 'ar' ? 'قياس السيولة المتمركزة على السلاسل الكبرى لتقدير شهية المخاطرة.' : 'Tracks major chain TVL to estimate broad crypto liquidity appetite.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedChain} onChange={(e) => setSelectedChain(e.target.value)} className="bg-[#111114] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-gray-100 font-mono">
            {watchedChains.map((chain) => <option key={chain} value={chain}>{chain.toUpperCase()}</option>)}
          </select>
          <button onClick={() => refreshAll(selectedChain)} className="px-3 py-2 rounded-lg border border-[#2a2a2a] bg-[#111114] hover:bg-[#17171b] text-xs text-gray-100 flex items-center gap-2 font-mono"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />{lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'عدد السلاسل' : 'Chains covered'}</div><div className="text-white text-lg font-bold">{overview?.totalChains ?? '--'}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'إجمالي TVL' : 'Aggregate TVL'}</div><div className="text-cyan-300 text-lg font-bold">${compactUsd(overview?.totalTvl || 0)}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'تغير 7 أيام' : '7D TVL change'}</div><div className={`text-lg font-bold ${(history?.delta7dPct || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{history ? `${history.delta7dPct > 0 ? '+' : ''}${history.delta7dPct}%` : '--'}</div></div>
        <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-3"><div className="text-gray-500">{lang === 'ar' ? 'تغير 30 يوم' : '30D TVL change'}</div><div className={`text-lg font-bold ${(history?.delta30dPct || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{history ? `${history.delta30dPct > 0 ? '+' : ''}${history.delta30dPct}%` : '--'}</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 rounded-xl border border-[#222] bg-[#0d0d0d] p-3">
          <div className="flex items-center justify-between mb-3 text-xs font-mono"><div className="text-white font-bold flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-emerald-400" />{lang === 'ar' ? 'اتجاه TVL التاريخي' : 'Historical TVL Trend'}</div><div className="text-gray-500">{history?.chain?.toUpperCase() || selectedChain.toUpperCase()}</div></div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="label" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" tickFormatter={(v) => compactUsd(Number(v))} tick={{ fontSize: 10 }} width={55} />
                <Tooltip contentStyle={{ background: '#0f0f10', border: '1px solid #2a2a2a', fontSize: 12 }} formatter={(value: any) => [`$${compactUsd(Number(value))}`, 'TVL']} />
                <Line type="monotone" dataKey="tvl" stroke="#22d3ee" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 rounded-xl border border-[#222] bg-[#0d0d0d] p-3 space-y-2">
          <div className="text-white font-bold text-xs font-mono flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-amber-400" />{lang === 'ar' ? 'أكبر السلاسل الآن' : 'Top chains now'}</div>
          {(overview?.topChains || []).slice(0, 6).map((item, index) => (
            <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-[#1b1b1b] bg-black/20 px-3 py-2 text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0"><span className="text-gray-500 w-4">{index + 1}</span><span className="text-white truncate">{item.name}</span><span className="text-[10px] text-gray-500">{item.tokenSymbol || 'CHAIN'}</span></div>
              <div className="text-cyan-300 font-bold">${compactUsd(item.tvl)}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</div>}
      <div className="text-[11px] text-gray-500 font-mono">{overview?.source || 'DefiLlama'} • {lang === 'ar' ? 'آخر تحديث' : 'Updated'}: {overview?.updatedAt ? new Date(overview.updatedAt).toLocaleTimeString() : '--'}</div>
    </div>
  );
};
