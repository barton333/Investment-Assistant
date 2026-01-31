import React, { useEffect, useState } from 'react';
import { Asset, MarketAnalysis, Language } from '../types';
import { fetchMarketAnalysis } from '../services/geminiService';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface AnalysisViewProps {
  assets: Asset[];
  lang: Language;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ assets, lang }) => {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAnalysis = async () => {
    setLoading(true);
    const result = await fetchMarketAnalysis(assets, lang);
    setAnalysis(result);
    setLoading(false);
  };

  useEffect(() => {
    // Reload analysis if language changes or if it's the first load
    loadAnalysis();
  }, [lang]);

  const getSentimentColor = (s: string) => {
    if (s === 'Bullish') return 'text-[#F63D34] bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30';
    if (s === 'Bearish') return 'text-[#07C160] bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30';
    return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  };

  const labels = {
    title: lang === 'zh' ? 'AI 智能市场日报' : 'AI Market Daily',
    subtitle: lang === 'zh' ? '基于 Gemini 3 Flash 模型实时分析' : 'Real-time analysis via Gemini 3 Flash',
    loading: lang === 'zh' ? '正在生成最新投资报告...' : 'Generating latest report...',
    sentiment: lang === 'zh' ? '市场情绪' : 'Sentiment',
    keyLevels: lang === 'zh' ? '关键点位' : 'Key Levels',
    advice: lang === 'zh' ? '投资建议' : 'Strategy',
    refresh: lang === 'zh' ? '刷新分析' : 'Refresh Analysis',
    updated: lang === 'zh' ? '数据更新于' : 'Updated at',
    noData: lang === 'zh' ? '暂无数据，请刷新' : 'No data, please refresh',
    retry: lang === 'zh' ? '点击重试' : 'Retry',
  };

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white mb-6 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <h2 className="text-lg font-bold">{labels.title}</h2>
          </div>
          <p className="text-blue-100 text-sm opacity-90">{labels.subtitle}</p>
        </div>
        {/* Background decorative circle */}
        <div className="absolute -right-6 -bottom-12 w-32 h-32 bg-white opacity-10 rounded-full blur-xl"></div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{labels.loading}</p>
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 dark:text-gray-100">{labels.sentiment}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getSentimentColor(analysis.sentiment)}`}>
                {analysis.sentiment}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
              {analysis.summary}
            </p>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-blue-500" />
              {labels.keyLevels}
            </h3>
            <div className="bg-gray-50 dark:bg-[#2A2A2A] rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
              {analysis.keyLevels}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
             <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">{labels.advice}</h3>
             <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-l-4 border-[#07C160] pl-3">
               {analysis.advice}
             </p>
          </div>

          <button 
            onClick={loadAnalysis}
            className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
          >
            <RefreshCw size={16} />
            <span>{labels.refresh}</span>
          </button>
          
          <div className="text-center text-xs text-gray-400 mt-4">
            {labels.updated}: {new Date(analysis.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p>{labels.noData}</p>
          <button onClick={loadAnalysis} className="mt-4 text-blue-500">{labels.retry}</button>
        </div>
      )}
    </div>
  );
};
