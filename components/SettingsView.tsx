
import React, { useState } from 'react';
import { Bell, Clock, CheckCircle, Moon, Sun, Globe, Key, Eye, EyeOff, Server, Layout, CheckSquare, Square } from 'lucide-react';
import { AppSettings, Language, Theme, BadgePosition } from '../types';
import { getAllPossibleAssets } from '../services/marketService';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const [showToast, setShowToast] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // All available assets for the manager
  const allAssets = getAllPossibleAssets();

  const handleToggle = (key: keyof AppSettings['notifications']) => {
    onUpdateSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key]
      }
    });
    triggerToast();
  };

  const handleThemeChange = (theme: Theme) => {
    onUpdateSettings({ ...settings, theme });
  };

  const handleLanguageChange = (language: Language) => {
    onUpdateSettings({ ...settings, language });
  };

  const handleDataRefreshChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateSettings({ ...settings, dataRefreshRate: parseInt(e.target.value) });
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, customApiKey: e.target.value });
  };

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, apiBaseUrl: e.target.value });
  };

  const handleBadgePositionChange = (pos: BadgePosition) => {
    onUpdateSettings({ ...settings, badgePosition: pos });
  };

  const toggleAssetVisibility = (assetId: string) => {
      const current = settings.visibleAssets || [];
      const exists = current.includes(assetId);
      let next = [];
      if (exists) {
          next = current.filter(id => id !== assetId);
      } else {
          next = [...current, assetId];
      }
      onUpdateSettings({ ...settings, visibleAssets: next });
  };

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const isZh = settings.language === 'zh';
  const text = {
    profile: isZh ? '微信用户' : 'WeChat User',
    vip: isZh ? 'VIP 投资订阅会员' : 'VIP Investor',
    general: isZh ? '通用设置' : 'General',
    display: isZh ? '显示设置' : 'Display Settings',
    assetsTitle: isZh ? '资产管理 (自选)' : 'Asset Management',
    theme: isZh ? '主题模式' : 'Theme',
    language: isZh ? '语言' : 'Language',
    badgePos: isZh ? '标签位置' : 'Source Label Position',
    dataRefresh: isZh ? '数据刷新' : 'Data Refresh',
    apiKeyTitle: isZh ? 'API 配置' : 'API Configuration',
    apiKeyLabel: isZh ? 'Google Gemini API Key' : 'Google Gemini API Key',
    apiKeyPlaceholder: isZh ? '在此输入以覆盖默认 Key' : 'Enter key to override default',
    proxyLabel: isZh ? 'API 代理地址 (Base URL)' : 'API Proxy URL (Base URL)',
    proxyPlaceholder: isZh ? '例如: https://gemini-proxy.com' : 'e.g., https://gemini-proxy.com',
    save: isZh ? '设置已自动保存' : 'Settings Saved',
    seconds: isZh ? '秒' : 's',
    minute: isZh ? '分钟' : 'min',
    posRight: isZh ? '名称右侧' : 'Next to Name',
    posTop: isZh ? '卡片右上' : 'Top Right',
    posBot: isZh ? '卡片右下' : 'Bottom Right',
  };

  return (
    <div className="pt-4 px-4 pb-24 text-gray-900 dark:text-gray-100">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl overflow-hidden shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
        <div className="p-6 flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
             <img src="https://picsum.photos/200" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{text.profile}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{text.vip}</p>
          </div>
        </div>
      </div>

      {/* Asset Management (New) */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{text.assetsTitle}</h3>
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl overflow-hidden shadow-sm mb-6 border border-gray-100 dark:border-gray-800 p-4">
        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {allAssets.map(asset => {
                const isVisible = (settings.visibleAssets || []).includes(asset.id);
                return (
                    <div 
                        key={asset.id} 
                        onClick={() => toggleAssetVisibility(asset.id)}
                        className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer border transition-all ${
                            isVisible 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                            : 'bg-gray-50 dark:bg-black/20 border-transparent opacity-60 hover:opacity-100'
                        }`}
                    >
                        {isVisible 
                            ? <CheckSquare size={16} className="text-blue-500" /> 
                            : <Square size={16} className="text-gray-400" />}
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{isZh ? asset.nameCN : asset.name}</span>
                            <span className="text-[10px] text-gray-500">{asset.symbol}</span>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Display Settings (New) */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{text.display}</h3>
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl overflow-hidden shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
         {/* Theme */}
         <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
              {settings.theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
            </div>
            <span className="text-sm font-medium">{text.theme}</span>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button 
              onClick={() => handleThemeChange('light')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${settings.theme === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
            >
              Light
            </button>
            <button 
              onClick={() => handleThemeChange('dark')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${settings.theme === 'dark' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
            >
              Dark
            </button>
          </div>
        </div>

        {/* Badge Position */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-500">
              <Layout size={18} />
            </div>
            <span className="text-sm font-medium">{text.badgePos}</span>
          </div>
          <select 
            value={settings.badgePosition || 'name-right'}
            onChange={(e) => handleBadgePositionChange(e.target.value as BadgePosition)}
            className="bg-gray-100 dark:bg-gray-800 text-xs rounded-lg px-2 py-1.5 focus:outline-none border-none dark:text-white max-w-[120px]"
          >
            <option value="name-right">{text.posRight}</option>
            <option value="card-top-right">{text.posTop}</option>
            <option value="card-bottom-right">{text.posBot}</option>
          </select>
        </div>
        
         {/* Language */}
         <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center text-pink-500">
              <Globe size={18} />
            </div>
            <span className="text-sm font-medium">{text.language}</span>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
             <button 
              onClick={() => handleLanguageChange('zh')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${settings.language === 'zh' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
            >
              中文
            </button>
            <button 
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${settings.language === 'en' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* API Key Settings (Collapsed by default logic handled by user click usually, but keeping open here) */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{text.apiKeyTitle}</h3>
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl overflow-hidden shadow-sm mb-6 border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex flex-col space-y-4">
            {/* API Key Input */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Key size={16} className="text-purple-500" />
                    <span>{text.apiKeyLabel}</span>
                </div>
                <div className="relative">
                    <input 
                        type={showApiKey ? "text" : "password"}
                        value={settings.customApiKey || ''}
                        onChange={handleApiKeyChange}
                        onBlur={triggerToast} 
                        placeholder={text.apiKeyPlaceholder}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                    />
                    <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            {/* Base URL Input */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Server size={16} className="text-blue-500" />
                    <span>{text.proxyLabel}</span>
                </div>
                <input 
                    type="text"
                    value={settings.apiBaseUrl || ''}
                    onChange={handleBaseUrlChange}
                    onBlur={triggerToast}
                    placeholder={text.proxyPlaceholder}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                />
            </div>
        </div>
      </div>

      {showToast && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/75 dark:bg-white/90 text-white dark:text-black px-6 py-4 rounded-lg flex flex-col items-center z-50 animate-fade-in backdrop-blur-sm">
          <CheckCircle size={32} className="mb-2" />
          <span className="text-sm font-bold">{text.save}</span>
        </div>
      )}
    </div>
  );
};
