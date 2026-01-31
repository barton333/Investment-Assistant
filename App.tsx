
import React, { useState, useEffect } from 'react';
import { getInitialAssets, fetchRealTimePrices } from './services/marketService';
import { Asset, Tab, AppSettings } from './types';
import { NavBar } from './components/NavBar';
import { AssetCard } from './components/AssetCard';
import { AssetDetailView } from './components/AssetDetailView'; 
import { SettingsView } from './components/SettingsView';
import { AdvisorView } from './components/AdvisorView';
import { RefreshCw, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(getInitialAssets());
  const [currentTab, setCurrentTab] = useState<Tab>('market');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // App Settings State
  const [settings, setSettings] = useState<AppSettings>({
    language: 'zh',
    theme: 'dark', 
    dataRefreshRate: 300000, // Real Data Fetch (Default 5 min)
    notifications: {
      wechat: true,
      sms: false,
      email: true,
      priceAlerts: true,
    }
  });

  // Apply dark mode
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Real-Time Data Fetcher (Controlled by settings.dataRefreshRate)
  const syncRealData = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    const updatedAssets = await fetchRealTimePrices(assets);
    setAssets(updatedAssets);
    setLastUpdated(new Date());
    setIsUpdating(false);
  };

  useEffect(() => {
    // Initial fetch
    syncRealData();

    // Periodic fetch based on settings
    const realInterval = setInterval(syncRealData, settings.dataRefreshRate);
    return () => clearInterval(realInterval);
  }, [settings.dataRefreshRate]); 

  const handleManualRefresh = () => {
    syncRealData();
  };

  const handleAssetClick = (id: string) => {
    setSelectedAssetId(id);
  };

  const handleBack = () => {
    setSelectedAssetId(null);
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  // Localization Helpers
  const isZh = settings.language === 'zh';
  const labels = {
    title: isZh ? '智能投资助手' : 'Smart Invest Assistant',
    marketTitle: isZh ? '自选行情' : 'Watchlist',
    disclaimer: isZh ? '数据来源: 智能AI多源核对 (Sina/Yahoo/Bloomberg)' : 'Source: AI Verified (Sina/Yahoo/Bloomberg)',
    updating: isZh ? '核对中...' : 'Verifying...',
    verified: isZh ? '已核对' : 'Verified',
  };

  // Consistent formatting for Detail View
  const formatPrice = (price: number, asset: Asset) => {
    return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
        useGrouping: false
    });
  };

  const renderContent = () => {
    if (selectedAssetId && selectedAsset) {
        return (
            <AssetDetailView 
                asset={selectedAsset} 
                lang={settings.language} 
                onBack={handleBack} 
                formatPrice={formatPrice}
            />
        );
    }

    const containerClass = "px-4 pt-4 pb-24 max-w-7xl mx-auto w-full";

    switch (currentTab) {
      case 'market':
        return (
          <div className={containerClass}>
            {/* Header */}
            <div className="flex flex-col mb-4 px-1 space-y-3">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{labels.title}</h1>
                <div className="flex items-center space-x-2">
                   {/* Manual Refresh Button */}
                   <button 
                     onClick={handleManualRefresh}
                     className={`p-2 rounded-full transition-colors ${isUpdating ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:scale-95'}`}
                   >
                      <RefreshCw size={16} className={isUpdating ? "animate-spin" : ""} />
                   </button>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between text-xs">
                 <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-[10px] text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-100 dark:border-green-900/30">
                        {isUpdating ? (
                            <>
                              <RefreshCw size={10} className="animate-spin" />
                              <span>{labels.updating}</span>
                            </>
                        ) : (
                            <>
                              <ShieldCheck size={10} />
                              <span>{labels.verified} {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </>
                        )}
                    </div>
                 </div>
              </div>
            </div>
            
            {/* Asset Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map(asset => (
                <AssetCard 
                  key={asset.id} 
                  asset={asset} 
                  onClick={() => handleAssetClick(asset.id)}
                  lang={settings.language}
                />
              ))}
            </div>

            <div className="mt-6 text-center text-[10px] text-gray-400 dark:text-gray-600 flex items-center justify-center space-x-1">
              <ShieldCheck size={12} className="text-gray-400" />
              <span>{labels.disclaimer}</span>
            </div>
          </div>
        );
      case 'advisor':
        return (
          <AdvisorView assets={assets} lang={settings.language} />
        );
      case 'settings':
        return (
          <div className="max-w-3xl mx-auto w-full">
            <SettingsView settings={settings} onUpdateSettings={setSettings} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen font-sans w-full transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-[#111111]' : 'bg-[#ededed]'}`}>
      {!selectedAssetId && (
        <header className="bg-white dark:bg-[#1E1E1E] px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-center items-center sticky top-0 z-30 transition-colors duration-300">
            <span className="font-semibold text-gray-900 dark:text-white">{labels.title}</span>
            <div className="absolute right-4 flex space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-800 dark:bg-gray-400"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-800 dark:bg-gray-400"></div>
            </div>
        </header>
      )}

      <main className="w-full">
        {renderContent()}
      </main>

      {!selectedAssetId && (
        <NavBar currentTab={currentTab} onTabChange={setCurrentTab} lang={settings.language} />
      )}
    </div>
  );
};

export default App;
