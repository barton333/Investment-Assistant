import React from 'react';
import { Asset, Language } from '../types';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { ShieldCheck, WifiOff } from 'lucide-react';

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
      className="bg-white dark:bg-[#1E1E1E] p-4 mb-3 rounded-lg flex items-center justify-between active:bg-gray-50 dark:active:bg-[#2c2c2c] transition-colors shadow-sm dark:shadow-none border border-transparent dark:border-gray-800 relative overflow-hidden"
    >
      <div className="flex-1">
        <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
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

      <div className="w-24 h-12 mr-4">
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
        <div className={`text-lg font-bold ${isPositive ? 'text-[#F63D34]' : 'text-[#07C160]'}`}>
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