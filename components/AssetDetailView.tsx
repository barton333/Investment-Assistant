import React, { useState, useEffect } from 'react';
import { Asset, Language, MarketAnalysis, PricePoint } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { ArrowLeft, Sparkles, TrendingUp, TrendingDown, Coins, Banknote, Component, Zap, Globe } from 'lucide-react';
import { fetchAssetAnalysis } from '../services/geminiService';
import { getHistoryForTimeframe } from '../services/marketService';

interface AssetDetailViewProps {
  asset: Asset;
  lang: Language;
  onBack: () => void;
  formatPrice: (price: number, asset: Asset) => string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1E222D] border border-gray-700 p-3 rounded-lg shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-[#F0B90B] text-sm font-mono font-bold">
          价格: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export const AssetDetailView: React.FC<AssetDetailViewProps> = ({ asset, lang, onBack, formatPrice }) => {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeframe, setTimeframe] = useState('1M'); // Default to 1 Month as requested
  const [chartData, setChartData] = useState<PricePoint[]>([]);

  const isPositive = asset.changePercent >= 0;
  
  // Strict Colors from Screenshot
  const colors = {
    bg: '#131722', // Dark background
    card: '#1E222D', // Card background
    // Screenshot shows Green for Down (-5.00%), typical in global/crypto markets. 
    down: '#07C160', 
    up: '#F63D34',
    textMain: '#FFFFFF',
    textSub: '#8D92A0',
    yellowText: '#F0B90B',
    grid: '#2A2E39',
    chartLine: '#F0B90B', // Yellow/Gold line
    btnStart: '#A855F7',
    btnEnd: '#EC4899',
    tagBg: '#332a00',
    tagText: '#F0B90B',
  };

  const trendColor = isPositive ? colors.up : colors.down;
  const trendText = isPositive ? (lang === 'zh' ? '上涨' : 'Up') : (lang === 'zh' ? '下跌' : 'Down');
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  // Initialize and update chart data when timeframe changes
  useEffect(() => {
    // We only regenerate the "shape" of the history when timeframe changes.
    // We use the current asset price as the anchor.
    const data = getHistoryForTimeframe(asset.price, timeframe);
    setChartData(data);
  }, [timeframe]); // Intentionally exclude asset.price to prevent full regen on tick

  // Update only the last point when asset price updates (real-time tick)
  useEffect(() => {
    setChartData(prev => {
        if (prev.length === 0) return prev;
        const newData = [...prev];
        const lastIndex = newData.length - 1;
        newData[lastIndex] = {
            ...newData[lastIndex],
            value: asset.price
        };
        return newData;
    });
  }, [asset.price]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const result = await fetchAssetAnalysis(asset, lang);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  // Select icon based on category
  const getIcon = () => {
    switch(asset.category) {
      case 'metal': return <Coins className="text-[#F0B90B]" size={28} />;
      case 'currency': return <Banknote className="text-green-400" size={28} />;
      case 'index': return <Globe className="text-blue-400" size={28} />;
      case 'crypto': return <Component className="text-orange-400" size={28} />;
      case 'energy': return <Zap className="text-yellow-400" size={28} />;
      default: return <Coins className="text-[#F0B90B]" size={28} />;
    }
  };

  const getTimeframeLabel = () => {
     switch(timeframe) {
         case '1H': return lang === 'zh' ? '1小时价格走势' : '1-Hour Trend';
         case '1D': return lang === 'zh' ? '24小时价格走势' : '24-Hour Trend';
         case '1W': return lang === 'zh' ? '7天价格走势' : '7-Day Trend';
         case '1M': return lang === 'zh' ? '30天价格走势' : '30-Day Trend';
         case '1Y': return lang === 'zh' ? '1年价格走势' : '1-Year Trend';
         default: return '';
     }
  };

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: colors.bg }}>
      {/* Navbar / Header */}
      <div className="flex items-center justify-between px-4 py-4 sticky top-0 z-20" style={{ backgroundColor: colors.bg }}>
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-1 rounded-full active:bg-gray-800 transition-colors">
            <ArrowLeft color={colors.textMain} size={24} />
          </button>
          <div className="flex items-center space-x-3">
             {getIcon()}
             <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-tight">{lang === 'zh' ? asset.nameCN : asset.name}</span>
                <span style={{ color: colors.textSub }} className="text-xs font-bold tracking-wider">{asset.symbol}</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 text-sm font-medium" style={{ color: trendColor }}>
           <TrendIcon size={16} />
           <span>{trendText}</span>
        </div>
      </div>

      <div className="px-4 mt-2 space-y-4">
        
        {/* Main Price Card */}
        <div className="rounded-2xl p-6 shadow-lg relative overflow-hidden border border-gray-800" style={{ backgroundColor: colors.card }}>
            {/* "Latest Price" Label */}
            <div className="text-sm font-medium mb-3" style={{ color: colors.textSub }}>
                {lang === 'zh' ? '最新价格' : 'Latest Price'}
            </div>
            
            {/* Big Price Display */}
            <div className="flex items-baseline space-x-2 mb-3">
                <span className="text-5xl font-bold text-white tracking-tight font-mono">
                    {formatPrice(asset.price, asset)}
                </span>
                <span className="text-sm font-medium" style={{ color: colors.textSub }}>
                    {asset.unit}
                </span>
            </div>

            {/* Time & Tags */}
            <div className="flex items-center flex-wrap gap-3 mb-6">
                <div className="text-xs" style={{ color: colors.textSub }}>
                   {lang === 'zh' ? '更新时间' : 'Updated'}: {new Date().toLocaleTimeString()}
                </div>
                {/* Simulation/Real Tag */}
                <div className="px-2 py-0.5 rounded text-[10px] font-bold border" 
                     style={{ backgroundColor: 'rgba(240, 185, 11, 0.1)', borderColor: 'rgba(240, 185, 11, 0.2)', color: colors.yellowText }}>
                    {lang === 'zh' ? '实时' : 'Real-time'}
                </div>
                <div className="text-[10px]" style={{ color: colors.textSub }}>
                    来源: Google Search
                </div>
            </div>

            {/* Bottom Row: Change & Market Status */}
            <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                <div className="text-xl font-bold flex items-center" style={{ color: trendColor }}>
                    <span>{asset.change > 0 ? '+' : ''}{asset.change.toFixed(2)}</span>
                    <span className="ml-2 text-lg">({asset.changePercent.toFixed(2)}%)</span>
                </div>
                <div className="text-xs font-bold tracking-wide" style={{ color: colors.textSub }}>
                    {lang === 'zh' ? '市场状态: OPEN' : 'MARKET: OPEN'}
                </div>
            </div>
        </div>

        {/* AI Analysis Button (Gradient) */}
        <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all relative overflow-hidden group"
            style={{ 
                background: `linear-gradient(90deg, ${colors.btnStart}, ${colors.btnEnd})`,
                color: 'white',
            }}
        >
             <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            {isAnalyzing ? (
                 <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
                <Sparkles size={20} fill="white" />
            )}
            <span className="font-bold tracking-wide text-sm">
                {isAnalyzing 
                    ? (lang === 'zh' ? '正在分析...' : 'Analyzing...') 
                    : (lang === 'zh' ? 'AI 趋势分析' : 'AI Trend Analysis')}
            </span>
        </button>

        {/* Analysis Result Card */}
        {analysis && (
            <div className="rounded-xl p-5 border animate-fade-in" style={{ backgroundColor: colors.card, borderColor: '#333' }}>
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-800">
                    <h3 className="font-bold text-white flex items-center text-sm">
                        <Sparkles className="w-4 h-4 mr-2 text-pink-500" />
                        AI 观点
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        analysis.sentiment === 'Bullish' ? 'text-red-500 bg-red-900/20' : 
                        analysis.sentiment === 'Bearish' ? 'text-green-500 bg-green-900/20' : 'text-gray-400'
                    }`}>
                        {analysis.sentiment}
                    </span>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">市场摘要</div>
                        <p className="text-sm text-gray-200 leading-relaxed font-light">{analysis.summary}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">关键点位</div>
                            <p className="text-sm font-mono" style={{ color: colors.yellowText }}>{analysis.keyLevels}</p>
                        </div>
                        <div>
                             <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">操作建议</div>
                             <p className="text-sm text-gray-200">{analysis.advice}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Chart Section */}
        <div className="rounded-2xl p-5 border border-gray-800" style={{ backgroundColor: colors.card }}>
            <div className="flex items-center space-x-2 mb-6">
                 {/* Colored Bar Indicator */}
                <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(to bottom, ${colors.btnStart}, ${colors.btnEnd})` }}></div>
                <h3 className="font-bold text-white text-sm">
                    {getTimeframeLabel()}
                </h3>
            </div>
            
            <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.chartLine} stopOpacity={0.1}/>
                                <stop offset="95%" stopColor={colors.chartLine} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke={colors.grid} />
                        <XAxis 
                            dataKey="time" 
                            tick={{fill: colors.textSub, fontSize: 10}} 
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                            interval="preserveStartEnd"
                        />
                        <YAxis 
                            domain={['auto', 'auto']} 
                            tick={{fill: colors.textSub, fontSize: 10}} 
                            axisLine={false} 
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={asset.price} stroke={colors.textSub} strokeDasharray="3 3" opacity={0.3} />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={colors.chartLine} 
                            strokeWidth={2}
                            fill="url(#chartGradient)"
                            activeDot={{ r: 6, fill: colors.chartLine, stroke: 'white', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            {/* Timeframe Selector */}
            <div className="flex justify-between mt-6 px-4">
                {['1H', '1D', '1W', '1M', '1Y'].map((t) => (
                    <button 
                        key={t}
                        onClick={() => setTimeframe(t)}
                        className={`text-xs px-3 py-1 rounded transition-all ${timeframe === t ? 'text-white font-bold bg-[#2A2E39]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};