
import React, { useState, useEffect } from 'react';
import { getInitialAssets, fetchRealTimePrices } from './services/marketService';
import { Asset, Tab, AppSettings, BadgePosition, Language } from './types';
import { NavBar } from './components/NavBar';
import { AssetCard } from './components/AssetCard';
import { AssetPicker } from './components/AssetPicker';
import { AssetDetailView } from './components/AssetDetailView'; 
import { SettingsView } from './components/SettingsView';
import { AdvisorView } from './components/AdvisorView';
import { RefreshCw, ShieldCheck, Clock, AlertTriangle, Plus } from 'lucide-react';

const App: React.FC = () => {
  const [allAssets, setAllAssets] = useState<Asset[]>(getInitialAssets());
  const [currentTab, setCurrentTab] = useState<Tab>('market');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [configError, setConfigError] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  // App Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    let storedKey = '', storedBaseUrl = '', storedVisible: string[] = [], storedBadgePos = 'name-right';
    let hasStoredVisible = false;

    try {
        storedKey = localStorage.getItem('user_custom_api_key') || '';
        storedBaseUrl = localStorage.getItem('user_api_base_url') || '';
        const v = localStorage.getItem('user_visible_assets');
        if (v) {
            storedVisible = JSON.parse(v);
            hasStoredVisible = true;
        }
        const b = localStorage.getItem('user_badge_pos');
        if (b) storedBadgePos = b;
    } catch(e) {}

    // Default assets if none stored
    if (!hasStoredVisible) {
        storedVisible = ['sh_composite', 'sh_gold', 'sh_silver', 'usd_cny', 'btc', 'nasdaq'];
    }

    return {
        language: 'zh',
        theme: 'dark', 
        dataRefreshRate: 1800000, // Default 30 minutes
        customApiKey: storedKey,
        apiBaseUrl: storedBaseUrl || '', 
        visibleAssets: storedVisible,
        badgePosition: storedBadgePos as any,
        notifications: { wechat: true, sms: false, email: true, priceAlerts: true }
    };
  });

  // Effects for persistence and environment
  useEffect(() => {
    try {
        localStorage.setItem('user_custom_api_key', settings.customApiKey || '');
        localStorage.setItem('user_api_base_url', settings.apiBaseUrl || '');
        localStorage.setItem('user_visible_assets', JSON.stringify(settings.visibleAssets));
        localStorage.setItem('user_badge_pos', settings.badgePosition);
    } catch(e) {
        console.error("Failed to save settings", e);
    }

    if (settings.customApiKey && settings.customApiKey.length > 10) setConfigError(false);
    else if (!process.env.API_KEY || process.env.API_KEY.length < 10) setConfigError(true);
  }, [settings]);

  useEffect(() => {
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.theme]);

  useEffect(() => {
    const hasEnvKey = process.env.API_KEY && process.env.API_KEY.length > 10;
    const hasCustomKey = settings.customApiKey && settings.customApiKey.length > 10;
    if (!hasEnvKey && !hasCustomKey) setConfigError(true);
    else setConfigError(false);
  }, []);

  const syncRealData = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    const updatedAssets = await fetchRealTimePrices(allAssets);
    setAllAssets(updatedAssets);
    setLastUpdated(new Date());
    setIsUpdating(false);
  };

  useEffect(() => {
    syncRealData();
    const realInterval = setInterval(syncRealData, settings.dataRefreshRate);
    return () => clearInterval(realInterval);
  }, [settings.dataRefreshRate]); 

  // Handlers
  const handleReorder = (newOrder: string[]) => {
      setSettings(prev => ({ ...prev, visibleAssets: newOrder }));
  };

  const handleAssetToggle = (id: string) => {
      setSettings(prev => {
          const current = prev.visibleAssets;
          const next = current.includes(id) 
            ? current.filter(x => x !== id) 
            : [...current, id];
          return { ...prev, visibleAssets: next };
      });
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, dataRefreshRate: parseInt(e.target.value) }));
  };

  // UI Helpers
  const isZh = settings.language === 'zh';
  const displayedAssets = settings.visibleAssets
    .map(id => allAssets.find(a => a.id === id))
    .filter((a): a is Asset => !!a);

  const getFrequencyLabel = (rate: number) => {
      const min = rate / 60000;
      return isZh ? `${min}分钟` : `${min}m`;
  };

  const renderContent = () => {
    if (selectedAssetId) {
        const asset = allAssets.find(a => a.id === selectedAssetId);
        if (asset) return <AssetDetailView asset={asset} lang={settings.language} onBack={() => setSelectedAssetId(null)} formatPrice={(p)=>p.toLocaleString()} />;
    }

    if (currentTab === 'market') {
        return (
          <div className="px-4 pt-4 pb-24 max-w-7xl mx-auto w-full">
            {configError && (
              <div className="bg-red-500 text-white p-3 rounded-lg mb-4 text-xs flex items-center space-x-2 shadow-lg" onClick={() => setCurrentTab('settings')}>
                 <AlertTriangle size={16} />
                 <span>{isZh ? '缺少 API Key，请去设置页配置' : 'Missing API Key. Check Settings.'}</span>
              </div>
            )}

            <div className="flex flex-col mb-4 px-1 space-y-3">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{isZh ? '智能投资助手' : 'Smart Invest Pilot'}</h1>
                <div className="flex items-center space-x-3">
                   {/* Refresh Rate Selector */}
                   <div className="relative flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 active:scale-95 transition-transform border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                      <Clock size={12} />
                      <span>{getFrequencyLabel(settings.dataRefreshRate)}</span>
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
                   
                   <button onClick={() => syncRealData()} className={`p-2 rounded-full ${isUpdating ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                      <RefreshCw size={16} className={isUpdating ? "animate-spin" : ""} />
                   </button>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                  <ShieldCheck size={12} className="text-green-500" />
                  <span>{isZh ? '数据已核对' : 'Verified'} {lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>
            
            {/* Static Grid List */}
            <div className="flex flex-wrap gap-4">
              {displayedAssets.map(asset => (
                <div key={asset.id} className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)]">
                    <AssetCard 
                        asset={asset} 
                        onClick={() => setSelectedAssetId(asset.id)}
                        lang={settings.language}
                        badgePosition={settings.badgePosition}
                    />
                </div>
              ))}
              
               {/* Add Asset Button */}
                <div 
                    onClick={() => setShowAssetPicker(true)}
                    className="w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-all h-[120px]"
                >
                    <div className="flex flex-col items-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Plus size={20} />
                        </div>
                        <span className="text-sm font-bold">{isZh ? '添加资产' : 'Add Asset'}</span>
                    </div>
                </div>
            </div>

          </div>
        );
    }
    if (currentTab === 'advisor') return <AdvisorView assets={allAssets} lang={settings.language} />;
    if (currentTab === 'settings') return <div className="max-w-3xl mx-auto w-full"><SettingsView settings={settings} onUpdateSettings={setSettings} /></div>;
    return null;
  };

  return (
    <div className={`min-h-screen font-sans w-full ${settings.theme === 'dark' ? 'bg-[#111111]' : 'bg-[#ededed]'}`}>
      {!selectedAssetId && (
        <header className="bg-white dark:bg-[#1E1E1E] px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-center sticky top-0 z-30">
            <span className="font-semibold text-gray-900 dark:text-white">{isZh ? '智能投资助手' : 'Smart Invest Pilot'}</span>
        </header>
      )}

      <main className="w-full">{renderContent()}</main>

      {!selectedAssetId && <NavBar currentTab={currentTab} onTabChange={setCurrentTab} lang={settings.language} />}

      {/* Asset Picker Modal */}
      {showAssetPicker && (
          <AssetPicker 
            allAssets={allAssets} 
            visibleAssetIds={settings.visibleAssets} 
            onToggle={handleAssetToggle} 
            onReorder={handleReorder}
            onClose={() => setShowAssetPicker(false)} 
            lang={settings.language} 
          />
      )}
    </div>
  );
};

export default App;
