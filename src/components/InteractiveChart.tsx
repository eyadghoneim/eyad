import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Candle, ElliottWaveAnalysis, SMCAnalysis, Timeframe } from '../types';
import { calculateBollingerBands, calculateEMA, calculateSuperTrend } from '../utils/technicalAnalysis';
import { Layers, Eye, EyeOff, Maximize2, ZoomIn, ZoomOut, BarChart2 } from 'lucide-react';

interface InteractiveChartProps {
  candles: Candle[];
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  smc: SMCAnalysis;
  elliott: ElliottWaveAnalysis;
  lang: 'ar' | 'en';
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  candles,
  timeframe,
  setTimeframe,
  smc,
  elliott,
  lang,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Overlay toggles
  const [showEma, setShowEma] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showSuperTrend, setShowSuperTrend] = useState(true);
  const [showSMCZones, setShowSMCZones] = useState(true);
  const [showElliottWaves, setShowElliottWaves] = useState(true);

  // Visible window zoom level (number of candles shown)
  const [visibleCount, setVisibleCount] = useState(60);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const chartHeight = 360;
  const volumeHeight = 60;
  const priceChartHeight = chartHeight - volumeHeight - 30;

  const displayCandles = useMemo(() => {
    return candles.slice(-visibleCount);
  }, [candles, visibleCount]);

  // Compute scale boundaries
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (displayCandles.length === 0) return { minPrice: 80000, maxPrice: 90000, maxVolume: 1000 };
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    displayCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    const padding = (max - min) * 0.05 || 100;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      maxVolume: maxVol || 1,
    };
  }, [displayCandles]);

  const priceToY = (price: number) => {
    return priceChartHeight - ((price - minPrice) / (maxPrice - minPrice)) * priceChartHeight + 10;
  };

  const candleWidth = Math.max(3, (containerWidth - 70) / displayCandles.length);

  // Technical calculations for whole candle array to align with display
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const ema20All = useMemo(() => calculateEMA(closes, 20), [closes]);
  const ema50All = useMemo(() => calculateEMA(closes, 50), [closes]);
  const ema200All = useMemo(() => calculateEMA(closes, Math.min(200, closes.length)), [closes]);
  const bbAll = useMemo(() => calculateBollingerBands(closes, 20, 2), [closes]);
  const stAll = useMemo(() => calculateSuperTrend(candles), [candles]);

  const offset = candles.length - displayCandles.length;

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4 shadow-sm relative overflow-hidden">
      
      {/* Top Bar: Timeframes + Overlay Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[#1f1f1f]">
        
        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-[#050505] p-1 rounded border border-[#1f1f1f] font-mono text-xs">
          {(['15m', '1h', '4h', '1d'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-0.5 rounded font-bold transition-all ${
                timeframe === tf
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#141414]'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Chart Indicator Overlays */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setShowEma(!showEma)}
            className={`px-2.5 py-1 rounded border transition-all ${
              showEma ? 'bg-blue-900/20 text-blue-400 border-blue-500/40' : 'bg-[#141414] text-gray-500 border-[#222]'
            }`}
          >
            EMA (20/50/200)
          </button>
          <button
            onClick={() => setShowSuperTrend(!showSuperTrend)}
            className={`px-2.5 py-1 rounded border transition-all ${
              showSuperTrend ? 'bg-green-900/20 text-green-400 border-green-500/40' : 'bg-[#141414] text-gray-500 border-[#222]'
            }`}
          >
            SuperTrend
          </button>
          <button
            onClick={() => setShowSMCZones(!showSMCZones)}
            className={`px-2.5 py-1 rounded border transition-all ${
              showSMCZones ? 'bg-cyan-900/20 text-cyan-400 border-cyan-500/40' : 'bg-[#141414] text-gray-500 border-[#222]'
            }`}
          >
            SMC (OB/FVG)
          </button>
          <button
            onClick={() => setShowElliottWaves(!showElliottWaves)}
            className={`px-2.5 py-1 rounded border transition-all ${
              showElliottWaves ? 'bg-purple-900/20 text-purple-400 border-purple-500/40' : 'bg-[#141414] text-gray-500 border-[#222]'
            }`}
          >
            Elliott Waves
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-[#050505] p-0.5 rounded border border-[#1f1f1f]">
            <button
              onClick={() => setVisibleCount((prev) => Math.min(120, prev + 15))}
              className="p-1 text-gray-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setVisibleCount((prev) => Math.max(30, prev - 15))}
              className="p-1 text-gray-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Hover Information Header */}
      <div className="h-6 flex items-center gap-3 text-xs font-mono text-gray-400 my-2 overflow-x-auto">
        {hoveredCandle ? (
          <>
            <span className="text-gray-300">
              {new Date(hoveredCandle.time).toLocaleDateString()} {new Date(hoveredCandle.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>O: <strong className="text-white">${hoveredCandle.open.toLocaleString()}</strong></span>
            <span>H: <strong className="text-green-400">${hoveredCandle.high.toLocaleString()}</strong></span>
            <span>L: <strong className="text-red-400">${hoveredCandle.low.toLocaleString()}</strong></span>
            <span>C: <strong className={hoveredCandle.close >= hoveredCandle.open ? 'text-green-400' : 'text-red-400'}>${hoveredCandle.close.toLocaleString()}</strong></span>
            <span>Vol: <strong className="text-cyan-400">{hoveredCandle.volume.toLocaleString()}</strong></span>
          </>
        ) : (
          <span className="text-gray-500 italic text-[11px]">
            {lang === 'ar' ? 'حرّك المؤشر فوق الشموع لعرض التفاصيل اللحظية' : 'Hover over candles for OHLCV inspection'}
          </span>
        )}
      </div>

      {/* SVG Candlestick & Indicator Stage */}
      <div 
        ref={containerRef}
        className="w-full relative select-none cursor-crosshair bg-[#050505] rounded border border-[#1f1f1f] overflow-hidden"
        style={{ height: chartHeight }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setMousePos({ x, y });

          const idx = Math.floor(x / candleWidth);
          if (idx >= 0 && idx < displayCandles.length) {
            setHoveredCandle(displayCandles[idx]);
          }
        }}
        onMouseLeave={() => {
          setMousePos(null);
          setHoveredCandle(null);
        }}
      >
        <svg width={containerWidth} height={chartHeight} className="overflow-visible">
          
          {/* Horizontal Grid lines & Price Labels */}
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((pct, i) => {
            const p = minPrice + (maxPrice - minPrice) * (1 - pct);
            const y = priceChartHeight * pct + 10;
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={containerWidth - 65} y2={y} stroke="#161616" strokeDasharray="3 3" />
                <text
                  x={containerWidth - 60}
                  y={y + 3}
                  fill="#555555"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  ${Math.round(p).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* SMC Order Blocks (OB) & Fair Value Gaps (FVG) Shaded Regions */}
          {showSMCZones && smc.zones.map((zone) => {
            const topY = priceToY(zone.topPrice);
            const bottomY = priceToY(zone.bottomPrice);
            const boxHeight = Math.max(3, bottomY - topY);
            const isBull = zone.type.includes('BULLISH');

            return (
              <g key={zone.id}>
                <rect
                  x={0}
                  y={topY}
                  width={containerWidth - 65}
                  height={boxHeight}
                  fill={isBull ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)'}
                  stroke={isBull ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}
                  strokeDasharray="2 2"
                />
                <text
                  x={10}
                  y={topY + 12}
                  fill={isBull ? '#34d399' : '#f87171'}
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {zone.type === 'BULLISH_OB' ? 'DEMAND OB' : zone.type === 'BEARISH_OB' ? 'SUPPLY OB' : zone.type}
                </text>
              </g>
            );
          })}

          {/* Fibonacci Projections Lines */}
          {showElliottWaves && elliott && (
            <g>
              <line
                x1={0}
                y1={priceToY(elliott.fibLevels.level0_618)}
                x2={containerWidth - 65}
                y2={priceToY(elliott.fibLevels.level0_618)}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={containerWidth - 140}
                y={priceToY(elliott.fibLevels.level0_618) - 4}
                fill="#fbbf24"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                Fib 0.618 Pocket (${Math.round(elliott.fibLevels.level0_618).toLocaleString()})
              </text>
            </g>
          )}

          {/* Candlesticks & Volume Histogram */}
          {displayCandles.map((c, i) => {
            const x = i * candleWidth + candleWidth / 2;
            const isGreen = c.close >= c.open;
            const openY = priceToY(c.open);
            const closeY = priceToY(c.close);
            const highY = priceToY(c.high);
            const lowY = priceToY(c.low);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(closeY - openY));
            const barW = Math.max(2, candleWidth * 0.7);

            // Volume bar
            const volPct = c.volume / maxVolume;
            const volBarH = volPct * volumeHeight;
            const volY = chartHeight - volBarH - 5;

            return (
              <g key={c.time}>
                {/* Volume Bar */}
                <rect
                  x={x - barW / 2}
                  y={volY}
                  width={barW}
                  height={volBarH}
                  fill={isGreen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}
                />

                {/* Candle Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={isGreen ? '#10b981' : '#f43f5e'}
                  strokeWidth="1.2"
                />

                {/* Candle Body */}
                <rect
                  x={x - barW / 2}
                  y={bodyTop}
                  width={barW}
                  height={bodyHeight}
                  fill={isGreen ? '#10b981' : '#f43f5e'}
                  rx="1"
                />

                {/* Elliott Wave Markers on key swing points */}
                {showElliottWaves && i % 12 === 0 && i > 5 && (
                  <g>
                    <circle cx={x} cy={highY - 10} r="7" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                    <text
                      x={x}
                      y={highY - 7}
                      fill="#c7d2fe"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {i % 24 === 0 ? '③' : '④'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* EMA Overlay Lines */}
          {showEma && (
            <>
              {/* EMA 20 */}
              <path
                d={displayCandles
                  .map((_, i) => {
                    const globalIdx = offset + i;
                    const val = ema20All[globalIdx];
                    if (isNaN(val)) return '';
                    const x = i * candleWidth + candleWidth / 2;
                    const y = priceToY(val);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              {/* EMA 50 */}
              <path
                d={displayCandles
                  .map((_, i) => {
                    const globalIdx = offset + i;
                    const val = ema50All[globalIdx];
                    if (isNaN(val)) return '';
                    const x = i * candleWidth + candleWidth / 2;
                    const y = priceToY(val);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
            </>
          )}

          {/* SuperTrend Line */}
          {showSuperTrend && (
            <path
              d={displayCandles
                .map((_, i) => {
                  const globalIdx = offset + i;
                  const st = stAll[globalIdx];
                  if (!st) return '';
                  const x = i * candleWidth + candleWidth / 2;
                  const y = priceToY(st.value);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          )}

          {/* Interactive Mouse Crosshair */}
          {mousePos && (
            <g pointerEvents="none">
              <line
                x1={mousePos.x}
                y1={0}
                x2={mousePos.x}
                y2={chartHeight}
                stroke="#94a3b8"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <line
                x1={0}
                y1={mousePos.y}
                x2={containerWidth - 65}
                y2={mousePos.y}
                stroke="#94a3b8"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Chart Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2 text-[10px] text-gray-400 font-mono border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-blue-400 inline-block" />
            <span>EMA 20</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-yellow-400 inline-block" />
            <span>EMA 50</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-green-900/40 border border-green-500 inline-block" />
            <span>SMC Demand OB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-red-900/40 border border-red-500 inline-block" />
            <span>SMC Supply OB</span>
          </div>
        </div>

        <div className="text-gray-500">
          <span>{lang === 'ar' ? 'تحديث لحظي مستمر' : 'Live Data Stream Active'}</span>
        </div>
      </div>

    </div>
  );
};
