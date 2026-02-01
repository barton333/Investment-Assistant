
import React, { useState, useEffect } from 'react';
import { getInitialAssets, fetchRealTimePrices } from './services/marketService';
import { Asset, Tab, AppSettings } from './types';
import { NavBar } from './components/NavBar';
import { AssetCard } from './components/AssetCard';
import { AssetDetailView } from './components/AssetDetailView'; 
import { SettingsView } from './components/SettingsView';
import { AdvisorView } from './components/AdvisorView';
import { RefreshCw, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(getInitialAssets());
  const [currentTab, setCurrentTab] = useState<Tab>('market');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [configError, setConfigError] = useState(false);
  
  // App Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    // Attempt to load settings from local storage if needed
    let storedKey = '';
    let storedBaseUrl = '';
    try {
        storedKey = localStorage.getItem('user_custom_api_key') || '';
        storedBaseUrl = localStorage.getItem('user_api_base_url') || '';
    } catch(e) {}

    return {
        language: 'zh',
        theme: 'dark', 
        dataRefreshRate: 60000, 
        customApiKey: storedKey,
        apiBaseUrl: storedBaseUrl,
        notifications: {
          wechat: true,
          sms: false,
          email: true,
          priceAlerts: true,
        }
    };
  });

  // Persist Custom API Key and Base URL logic
  useEffect(() => {
    try {
        if (settings.customApiKey) {
            localStorage.setItem('user_custom_api_key', settings.customApiKey);
        } else {
            localStorage.removeItem('user_custom_api_key');
        }
        
        if (settings.apiBaseUrl) {
            localStorage.setItem('user_api_base_url', settings.apiBaseUrl);
        } else {
             localStorage.removeItem('user_api_base_url');
        }
    } catch(e) {}

    // Clear config error if we have a key now
    if (settings.customApiKey && settings.customApiKey.length > 10) {
        setConfigError(false);
    } else if (!process.env.API_KEY || process.env.API_KEY.length < 10) {
        // Only error if both env AND custom key are missing
        setConfigError(true);
    }

  }, [settings.customApiKey, settings.apiBaseUrl]);

  // Apply dark mode
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Check for API Key on mount (env check)
  useEffect(() => {
    const hasEnvKey = process.env.API_KEY && process.env.API_KEY.length > 10;
    const hasCustomKey = settings.customApiKey && settings.customApiKey.length > 10;

    if (!hasEnvKey && !hasCustomKey) {
        setConfigError(true);
    } else {
        setConfigError(false);
    }
  }, []);

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

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRate = parseInt(e.target.value);
    setSettings(prev => ({
      ...prev,
      dataRefreshRate: newRate
    }));
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
    disclaimer: isZh ? '数据来源: 智能AI多源核对 (API + Web Search)' : 'Source: AI Verified (API + Web Search)',
    updating: isZh ? '全网搜寻中...' : 'Searching...',
    verified: isZh ? '已更新' : 'Updated',
    configErr: isZh ? '配置错误: 缺少 API Key' : 'Config Error: Missing API Key',
    configMsg: isZh ? '请在[设置]页面填写 Gemini API Key。' : 'Please enter Gemini API Key in Settings tab.',
  };

  // Consistent formatting for Detail View
  const formatPrice = (price: number, asset: Asset) => {
    return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
        useGrouping: false
    });
  };

  const getFrequencyLabel = (rate: number) => {
      const min = rate / 60000;
      return isZh ? `${min}分钟` : `${min}m`;
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
            {/* Config Error Banner */}
            {configError && (
              <div className="bg-red-500 text-white p-3 rounded-lg mb-4 text-xs flex items-start space-x-2 shadow-lg animate-pulse cursor-pointer" onClick={() => setCurrentTab('settings')}>
                 <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                 <div>
                    <div className="font-bold">{labels.configErr}</div>
                    <div className="opacity-90">{labels.configMsg}</div>
                 </div>
              </div>
            )}

            {/* Header */}
            <div className="flex flex-col mb-4 px-1 space-y-3">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{labels.title}</h1>
                <div className="flex items-center space-x-3">
                   
                   {/* Frequency Selector */}
                   <div className="relative flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5 active:scale-95 transition-transform border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                      <Clock size={12} className="text-gray-500 dark:text-gray-400" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {getFrequencyLabel(settings.dataRefreshRate)}
                      </span>
                      <select
                          value={settings.dataRefreshRate}
                          onChange={handleFrequencyChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
                      >
                          <option value={60000}>1 {isZh ? '分钟' : 'min'}</option>
                          <option value={300000}>5 {isZh ? '分钟' : 'min'}</option>
                          <option value={900000}>15 {isZh ? '分钟' : 'min'}</option>
                          <option value={1800000}>30 {isZh ? '分钟' : 'min'}</option>
                      </select>
                   </div>

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
                    <div className={`flex items-center space-x-1 text-[10px] px-2 py-1 rounded-full border ${
                        configError 
                            ? 'text-red-500 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900' 
                            : 'text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30'
                    }`}>
                        {isUpdating ? (
                            <>
                              <RefreshCw size={10} className="animate-spin" />
                              <span>{labels.updating}</span>
                            </>
                        ) : (
                            <>
                              <ShieldCheck size={10} />
                              <span>
                                {configError ? 'Missing API Key' : `${labels.verified} ${lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                              </span>
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
