
import React from 'react';
import { Asset, Language } from '../types';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { ShieldCheck, WifiOff, MousePointerClick } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  onClick: () => void;
  lang: Language;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick, lang }) => {
  const isPositive = asset.changePercent >= 0;
  const color = isPositive ? '#F63D34' : '#07C160'; // China market colors: Red is up, Green is down

  // Format display price based on user request to show all decimal places.
  // We use toLocaleString with up to 4 decimal places for consistency.
  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
        useGrouping: false // Avoid commas to keep it looking like raw data if preferred, or remove this line for commas
    });
  };

  const sources = asset.sources || [];
  const isVerified = sources.length > 0 && !sources.includes('Base') && !sources.includes('Simulated');
  const sourceText = sources.join(' & ').replace('Sina', 'S').replace('Tencent', 'T').replace('CoinGecko', 'CG');

  return (
    <div 
      onClick={onClick}
      title={lang === 'zh' ? "点击查看详情" : "Click to view details"}
      className="group cursor-pointer bg-white dark:bg-[#1E1E1E] p-4 mb-3 rounded-lg flex items-center justify-between hover:bg-blue-50/30 dark:hover:bg-[#252525] active:bg-gray-100 dark:active:bg-[#2c2c2c] transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-none hover:border-blue-200 dark:hover:border-blue-900/50 border border-transparent dark:border-gray-800 relative overflow-hidden transform hover:-translate-y-0.5"
    >
      {/* Hover Hint Badge */}
      <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
          <div className="flex items-center space-x-1 bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 text-[9px] px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800/50 shadow-sm">
             <MousePointerClick size={10} />
             <span className="font-medium">{lang === 'zh' ? '点击查看' : 'View'}</span>
          </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {lang === 'zh' ? asset.nameCN : asset.name}
            </h3>
            {isVerified && (
                <div className="flex items-center space-x-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-blue-100 dark:border-blue-800">
                    <ShieldCheck size={8} />
                    <span>{sourceText || 'Live'}</span>
                </div>
            )}
            {sources.includes('Cache') && (
                <div className="flex items-center space-x-0.5 bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-[8px]">
                    <WifiOff size={8} />
                    <span>Cache</span>
                </div>
            )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{asset.symbol}</p>
      </div>

      <div className="w-24 h-12 mr-4 opacity-80 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={asset.history}>
            <YAxis domain={['dataMin', 'dataMax']} hide />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              fill={color} 
              fillOpacity={0.1} 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-right min-w-[80px]">
        <div className={`text-lg font-bold transition-transform group-hover:scale-105 origin-right ${isPositive ? 'text-[#F63D34]' : 'text-[#07C160]'}`}>
          {formatPrice(asset.price)} <span className="text-[10px] font-normal text-gray-400">{asset.unit}</span>
        </div>
        <div className={`text-xs font-medium px-1.5 py-0.5 rounded inline-block ${
          isPositive 
            ? 'bg-red-50 dark:bg-red-900/20 text-[#F63D34]' 
            : 'bg-green-50 dark:bg-green-900/20 text-[#07C160]'
        }`}>
          {isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};
