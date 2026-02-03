
import React from 'react';
import { Asset, Language, BadgePosition } from '../types';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { ShieldCheck, WifiOff, BrainCircuit, Database, Globe } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  onClick: () => void;
  lang: Language;
  badgePosition?: BadgePosition;
}

export const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, 
  onClick, 
  lang, 
  badgePosition = 'name-right',
}) => {
  const isPositive = asset.changePercent >= 0;
  const color = isPositive ? '#F63D34' : '#07C160'; 

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
        useGrouping: false 
    });
  };

  const sources = asset.sources || [];
  
  // Determine Badge Type
  let badge = null;
  const isCache = sources.includes('Cache');
  const isAI = sources.includes('AI Search');
  const isOffline = sources.includes('Offline');
  const isAPI = sources.length > 0 && !isCache && !isAI && !isOffline;
  
  // Check for international backup sources
  const isBackup = sources.some(s => 
      s.includes('Int\'l') || 
      s.includes('Global') || 
      s.includes('COMEX') || 
      s.includes('NYMEX')
  );

  const getBadgeElement = () => {
      if (isBackup) {
          return (
            <div className="flex items-center space-x-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-orange-100 dark:border-orange-800 animate-pulse">
                <Globe size={8} />
                <span className="truncate max-w-[80px]">{sources[0]}</span>
            </div>
          );
      }
      if (isAPI) {
          const sourceText = sources.join('&').replace('Sina', 'Sina').replace('Tencent', 'Tencent').replace('CoinGecko', 'CG');
          return (
            <div className="flex items-center space-x-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-blue-100 dark:border-blue-800">
                <ShieldCheck size={8} />
                <span className="truncate max-w-[80px]">{sourceText}</span>
            </div>
          );
      } else if (isAI) {
          return (
            <div className="flex items-center space-x-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-purple-100 dark:border-purple-800">
                <BrainCircuit size={8} />
                <span>AI Search</span>
            </div>
          );
      } else if (isCache) {
          return (
            <div className="flex items-center space-x-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-gray-200 dark:border-gray-700">
                <Database size={8} />
                <span>Cache</span>
            </div>
          );
      } else if (isOffline) {
          return (
            <div className="flex items-center space-x-0.5 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-red-100 dark:border-red-800">
                <WifiOff size={8} />
                <span>Offline</span>
            </div>
          );
      }
      return null;
  };

  const badgeEl = getBadgeElement();
  
  let badgeContainerClass = "";
  if (badgePosition === 'card-top-right') {
      badgeContainerClass = "absolute top-2 right-2 z-10";
  } else if (badgePosition === 'card-bottom-right') {
      badgeContainerClass = "absolute bottom-2 right-2 z-10 opacity-75";
  }

  return (
    <div 
      className="group bg-white dark:bg-[#1E1E1E] mb-3 rounded-lg flex items-stretch hover:bg-blue-50/30 dark:hover:bg-[#252525] active:bg-gray-100 dark:active:bg-[#2c2c2c] transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-none hover:border-blue-200 dark:hover:border-blue-900/50 border border-transparent dark:border-gray-800 relative overflow-hidden transform hover:-translate-y-0.5 w-full"
      onClick={onClick}
    >
      {/* Absolute Badges */}
      {(badgePosition === 'card-top-right' || badgePosition === 'card-bottom-right') && badgeEl && (
          <div className={badgeContainerClass}>
              {badgeEl}
          </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-between p-4 cursor-pointer">
        <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
                {lang === 'zh' ? asset.nameCN : asset.name}
                </h3>
                {badgePosition === 'name-right' && badgeEl}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{asset.symbol}</p>
        </div>

        <div className="w-20 h-10 mr-3 opacity-80 group-hover:opacity-100 transition-opacity hidden sm:block">
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
    </div>
  );
};
