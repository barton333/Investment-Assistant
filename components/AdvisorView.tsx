
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, PlusCircle, Trash2, MessageSquarePlus } from 'lucide-react';
import { Asset, Language, ChatMessage } from '../types';
import { sendChatQuery } from '../services/geminiService';

interface AdvisorViewProps {
  assets: Asset[];
  lang: Language;
}

const STORAGE_KEY = 'invest_pilot_chat_history_v1';

export const AdvisorView: React.FC<AdvisorViewProps> = ({ assets, lang }) => {
  // Initial load from localStorage or default welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
    return [{
      id: 'welcome',
      role: 'model',
      text: lang === 'zh' 
        ? '你好！我是你的 AI 智能助手。除了为你分析金融市场，我也能回答任何其他问题（生活、科技、闲聊等）。请问有什么可以帮到你？' 
        : 'Hello! I am your AI Assistant. I specialize in market analysis, but I can also chat about anything else (Life, Tech, etc). How can I help?',
      timestamp: Date.now()
    }];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Save to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now(),
      relatedAssetId: selectedAssetId || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const selectedAsset = assets.find(a => a.id === selectedAssetId) || null;
    
    // Filter history: Only send messages after the last separator (New Chat marker)
    // This allows "New Chat" to reset AI context without deleting visual history
    let activeHistory: ChatMessage[] = [];
    const lastSeparatorIndex = messages.map(m => m.isSeparator).lastIndexOf(true);
    
    if (lastSeparatorIndex !== -1) {
        activeHistory = messages.slice(lastSeparatorIndex + 1);
    } else {
        activeHistory = messages;
    }

    // Add current user message to history being sent
    activeHistory = [...activeHistory, userMsg];

    const responseText = await sendChatQuery(userMsg.text, selectedAsset, assets, activeHistory, lang);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleClearHistory = () => {
    if (window.confirm(lang === 'zh' ? '确定要清空所有历史记录吗？' : 'Clear all chat history?')) {
      const defaultMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: lang === 'zh' ? '记录已清空。我们可以重新开始了。' : 'History cleared. We can start fresh.',
        timestamp: Date.now()
      };
      setMessages([defaultMsg]);
      setSelectedAssetId(null);
    }
  };

  const handleNewChat = () => {
     const separatorMsg: ChatMessage = {
         id: `sep-${Date.now()}`,
         role: 'model',
         text: lang === 'zh' ? '--- 新的对话 ---' : '--- New Conversation ---',
         timestamp: Date.now(),
         isSeparator: true
     };
     setMessages(prev => [...prev, separatorMsg]);
     setSelectedAssetId(null);
     // Auto-focus input not strictly necessary on mobile but good for DX
  };

  const labels = {
    placeholder: lang === 'zh' ? '输入你的问题...' : 'Ask a question...',
    selectContext: lang === 'zh' ? '选择数据上下文:' : 'Context:',
    general: lang === 'zh' ? '全市场' : 'General',
    advisorTitle: lang === 'zh' ? 'AI 智能顾问' : 'AI Assistant',
    newChat: lang === 'zh' ? '新对话' : 'New Chat',
    clear: lang === 'zh' ? '清空' : 'Clear',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-7xl mx-auto">
      
      {/* Top Bar for Actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1E1E1E] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-2">
            <Bot size={20} className="text-[#07C160]" />
            <h2 className="font-bold text-gray-800 dark:text-white text-sm">{labels.advisorTitle}</h2>
        </div>
        <div className="flex items-center space-x-2">
            <button 
                onClick={handleNewChat}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium active:scale-95 transition-transform"
            >
                <MessageSquarePlus size={14} />
                <span>{labels.newChat}</span>
            </button>
            <button 
                onClick={handleClearHistory}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium active:scale-95 transition-transform"
            >
                <Trash2 size={14} />
                <span>{labels.clear}</span>
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => {
            // Render Separator
            if (msg.isSeparator) {
                return (
                    <div key={msg.id} className="flex items-center justify-center my-6">
                        <div className="h-px bg-gray-200 dark:bg-gray-700 w-1/4"></div>
                        <span className="mx-3 text-[10px] text-gray-400 font-medium">{msg.text}</span>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 w-1/4"></div>
                    </div>
                );
            }

            return (
              <div 
                key={msg.id} 
                className={`flex items-start max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-500 ml-2' : 'bg-[#07C160] mr-2'
                }`}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>
                
                <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-[#2A2A2A] text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-800'
                }`}>
                  {msg.relatedAssetId && (
                    <div className="mb-1 text-[10px] uppercase tracking-wide opacity-70 font-bold flex items-center">
                      <Sparkles size={10} className="mr-1" />
                      {assets.find(a => a.id === msg.relatedAssetId)?.nameCN || 'Asset'} Context
                    </div>
                  )}
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
        })}
        {isLoading && (
          <div className="flex items-start mr-auto max-w-[85%]">
             <div className="w-8 h-8 rounded-full bg-[#07C160] mr-2 flex items-center justify-center flex-shrink-0">
                 <Bot size={16} className="text-white" />
             </div>
             <div className="bg-white dark:bg-[#2A2A2A] rounded-2xl rounded-tl-none px-4 py-4 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-2 text-gray-400">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area Wrapper */}
      <div className="px-4 pb-4 pt-2 bg-transparent">
        {/* Asset Selector Chips */}
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 pl-1 font-medium flex items-center">
             <Bot size={12} className="mr-1" />
             {labels.selectContext}
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            <button
               onClick={() => setSelectedAssetId(null)}
               className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                 selectedAssetId === null
                   ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-black' 
                   : 'bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
               }`}
            >
              {labels.general}
            </button>
            {assets.map(asset => {
              const isSelected = selectedAssetId === asset.id;
              const isUp = asset.changePercent >= 0;
              return (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                      : 'bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <span>{lang === 'zh' ? asset.nameCN : asset.name}</span>
                  <span className={isUp ? 'text-red-500' : 'text-green-500'}>
                    {isUp ? '↑' : '↓'}{Math.abs(asset.changePercent).toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Input */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={selectedAssetId 
                ? (lang === 'zh' ? `关于 ${assets.find(a => a.id === selectedAssetId)?.nameCN} 的问题...` : `Ask about ${assets.find(a => a.id === selectedAssetId)?.name}...`)
                : labels.placeholder}
            className="w-full bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className={`absolute right-1.5 p-2 rounded-full transition-colors ${
              !inputText.trim() || isLoading 
                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600' 
                : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
