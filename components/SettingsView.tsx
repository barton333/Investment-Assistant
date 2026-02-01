
import React, { useState } from 'react';
import { Bell, Clock, ChevronRight, CheckCircle, Moon, Sun, Globe, Zap, Mail, MessageSquare, Activity, Key, Eye, EyeOff } from 'lucide-react';
import { AppSettings, Language, Theme } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const [showToast, setShowToast] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const isZh = settings.language === 'zh';
  const text = {
    profile: isZh ? '微信用户' : 'WeChat User',
    vip: isZh ? 'VIP 投资订阅会员' : 'VIP Investor',
    general: isZh ? '通用设置' : 'General',
    theme: isZh ? '主题模式' : 'Theme',
    language: isZh ? '语言' : 'Language',
    dataRefresh: isZh ? '数据刷新' : 'Data Refresh',
    apiKeyTitle: isZh ? 'API 配置' : 'API Configuration',
    apiKeyLabel: isZh ? 'Google Gemini API Key' : 'Google Gemini API Key',
    apiKeyPlaceholder: isZh ? '在此输入以覆盖默认 Key' : 'Enter key to override default',
    notifications: isZh ? '消息通知' : 'Notifications',
    wechatNotify: isZh ? '微信推送' : 'WeChat Notify',
    smsNotify: isZh ? '短信提醒' : 'SMS Alert',
    emailNotify: isZh ? '邮件周报' : 'Email Report',
    priceAlert: isZh ? '价格预警' : 'Price Alert',
    save: isZh ? '设置已自动保存' : 'Settings Saved',
    seconds: isZh ? '秒' : 's',
    minute: isZh ? '分钟' : 'min',
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

      {/* API Key Settings (High Priority) */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{text.apiKeyTitle}</h3>
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl overflow-hidden shadow-sm mb-6 border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Key size={16} className="text-purple-500" />
                <span>{text.apiKeyLabel}</span>
            </div>
            <div className="relative">
                <input 
                    type={showApiKey ? "text" : "password"}
                    value={settings.customApiKey || ''}
                    onChange={handleApiKeyChange}
                    onBlur={triggerToast} // Auto-save feedback on blur
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
            <p className="text-[10px] text-gray-400 pl-1">
                {isZh 
                    ? '您的 Key 仅存储在本地浏览器中，用于访问 Gemini AI 服务。' 
                    : 'Your key is stored locally in your browser to access Gemini AI.'}
            </p>
        </div>
      </div>

      {/* General Settings */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{text.general}</h3>
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

        {/* Language */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
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

        {/* Data Refresh Rate */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <Clock size={18} />
            </div>
            <span className="text-sm font-medium">{text.dataRefresh}</span>
          </div>
          <select 
            value={settings.dataRefreshRate}
            onChange={handleDataRefreshChange}
            className="bg-gray-100 dark:bg-gray-800 text-sm rounded-lg px-3 py-1.5 focus:outline-none border-none dark:text-white"
          >
            <option value={60000}>1 {text.minute}</option>
            <option value={300000}>5 {text.minute}</option>
            <option value={900000}>15 {text.minute}</option>
            <option value={1800000}>30 {text.minute}</option>
          </select>
        </div>
      </div>

      {/* Notifications */}
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">{text.notifications}</h3>
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl overflow-hidden shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
        
        {/* WeChat */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-[#07C160]">
              <MessageSquare size={18} />
            </div>
            <span className="text-sm font-medium">{text.wechatNotify}</span>
          </div>
          <div 
            onClick={() => handleToggle('wechat')}
            className={`w-12 h-7 rounded-full relative transition-colors duration-200 cursor-pointer ${settings.notifications.wechat ? 'bg-[#07C160]' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.notifications.wechat ? 'translate-x-5' : 'translate-x-0'}`}></div>
          </div>
        </div>

        {/* SMS */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
              <Globe size={18} />
            </div>
            <span className="text-sm font-medium">{text.smsNotify}</span>
          </div>
          <div 
            onClick={() => handleToggle('sms')}
            className={`w-12 h-7 rounded-full relative transition-colors duration-200 cursor-pointer ${settings.notifications.sms ? 'bg-[#07C160]' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.notifications.sms ? 'translate-x-5' : 'translate-x-0'}`}></div>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
              <Mail size={18} />
            </div>
            <span className="text-sm font-medium">{text.emailNotify}</span>
          </div>
          <div 
            onClick={() => handleToggle('email')}
            className={`w-12 h-7 rounded-full relative transition-colors duration-200 cursor-pointer ${settings.notifications.email ? 'bg-[#07C160]' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.notifications.email ? 'translate-x-5' : 'translate-x-0'}`}></div>
          </div>
        </div>

        {/* Price Alerts */}
         <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500">
              <Bell size={18} />
            </div>
            <span className="text-sm font-medium">{text.priceAlert}</span>
          </div>
          <div 
            onClick={() => handleToggle('priceAlerts')}
            className={`w-12 h-7 rounded-full relative transition-colors duration-200 cursor-pointer ${settings.notifications.priceAlerts ? 'bg-[#07C160]' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.notifications.priceAlerts ? 'translate-x-5' : 'translate-x-0'}`}></div>
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
