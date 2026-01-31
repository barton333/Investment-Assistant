
import React from 'react';
import { TrendingUp, Settings, MessageSquareText } from 'lucide-react';
import { Tab, Language } from '../types';

interface NavBarProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  lang: Language;
}

export const NavBar: React.FC<NavBarProps> = ({ currentTab, onTabChange, lang }) => {
  const getTabClass = (tab: Tab) => {
    return `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${
      currentTab === tab 
        ? 'text-[#07C160] dark:text-[#07C160]' 
        : 'text-gray-400 dark:text-gray-500'
    }`;
  };

  const labels = {
    market: lang === 'zh' ? '行情' : 'Market',
    advisor: lang === 'zh' ? '顾问' : 'Advisor',
    settings: lang === 'zh' ? '设置' : 'Settings',
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[60px] bg-white dark:bg-[#1E1E1E] border-t border-gray-200 dark:border-gray-800 flex justify-around items-center px-6 z-50 safe-area-bottom shadow-lg">
      <button className={getTabClass('market')} onClick={() => onTabChange('market')}>
        <TrendingUp size={24} />
        <span className="text-[10px] font-medium">{labels.market}</span>
      </button>
      <button className={getTabClass('advisor')} onClick={() => onTabChange('advisor')}>
        <MessageSquareText size={24} />
        <span className="text-[10px] font-medium">{labels.advisor}</span>
      </button>
      <button className={getTabClass('settings')} onClick={() => onTabChange('settings')}>
        <Settings size={24} />
        <span className="text-[10px] font-medium">{labels.settings}</span>
      </button>
    </div>
  );
};
