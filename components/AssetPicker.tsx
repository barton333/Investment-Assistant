
import React, { useState, useRef } from 'react';
import { Asset, Language } from '../types';
import { X, CheckSquare, Square, Search, GripVertical, Trash2, List, LayoutGrid } from 'lucide-react';

interface AssetPickerProps {
    allAssets: Asset[];
    visibleAssetIds: string[];
    onToggle: (id: string) => void;
    onReorder: (newOrder: string[]) => void;
    onClose: () => void;
    lang: Language;
}

export const AssetPicker: React.FC<AssetPickerProps> = ({ allAssets, visibleAssetIds, onToggle, onReorder, onClose, lang }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'library' | 'sort'>('library');
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const filteredAssets = allAssets.filter(a => {
        const term = searchTerm.toLowerCase();
        return a.name.toLowerCase().includes(term) || 
               a.nameCN.includes(term) || 
               a.symbol.toLowerCase().includes(term);
    });

    const categories = Array.from(new Set(filteredAssets.map(a => a.category)));

    // Native Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
        // Optional: styling for the drag image
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        const start = dragItem.current;
        const end = dragOverItem.current;
        
        if (start !== null && end !== null && start !== end) {
            const newOrder = [...visibleAssetIds];
            const draggedItemContent = newOrder[start];
            newOrder.splice(start, 1);
            newOrder.splice(end, 0, draggedItemContent);
            onReorder(newOrder);
        }
        
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#1E1E1E] z-10 relative">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {lang === 'zh' ? '管理资产' : 'Manage Assets'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-gray-50 dark:bg-[#121212] border-b border-gray-200 dark:border-gray-800">
                     <button 
                        onClick={() => setActiveTab('library')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 transition-all ${
                            activeTab === 'library' 
                            ? 'bg-white dark:bg-[#2A2A2A] text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                     >
                        <LayoutGrid size={14} />
                        <span>{lang === 'zh' ? '资产库' : 'Library'}</span>
                     </button>
                     <button 
                        onClick={() => setActiveTab('sort')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 transition-all ${
                            activeTab === 'sort' 
                            ? 'bg-white dark:bg-[#2A2A2A] text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                     >
                        <List size={14} />
                        <span>{lang === 'zh' ? '排序 & 已选' : 'Sort & Selected'}</span>
                     </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {activeTab === 'library' ? (
                        <>
                            <div className="sticky top-0 bg-gray-50 dark:bg-[#121212] p-4 z-10 border-b border-gray-100 dark:border-gray-800">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder={lang === 'zh' ? '搜索名称或代码...' : 'Search name or symbol...'}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="p-4">
                                {categories.map(cat => (
                                    <div key={cat} className="mb-6">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">{cat}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {filteredAssets.filter(a => a.category === cat).map(asset => {
                                                const isSelected = visibleAssetIds.includes(asset.id);
                                                return (
                                                    <div 
                                                        key={asset.id} 
                                                        onClick={() => onToggle(asset.id)}
                                                        className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                                            isSelected 
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                                                            : 'bg-white dark:bg-[#252525] border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                                        }`}
                                                    >
                                                        {isSelected 
                                                            ? <CheckSquare size={20} className="text-blue-500 flex-shrink-0" /> 
                                                            : <Square size={20} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{lang === 'zh' ? asset.nameCN : asset.name}</span>
                                                            <span className="text-xs text-gray-500 truncate">{asset.symbol}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {filteredAssets.length === 0 && (
                                    <div className="text-center py-10 text-gray-400">
                                        {lang === 'zh' ? '未找到相关资产' : 'No assets found'}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-4">
                            {visibleAssetIds.length === 0 ? (
                                <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                                    <LayoutGrid size={48} className="mb-4 opacity-20" />
                                    <span>{lang === 'zh' ? '暂无已选资产' : 'No assets selected'}</span>
                                    <button 
                                        onClick={() => setActiveTab('library')}
                                        className="mt-4 text-blue-500 text-sm font-bold hover:underline"
                                    >
                                        {lang === 'zh' ? '去添加' : 'Go add some'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {visibleAssetIds.map((id, index) => {
                                        const asset = allAssets.find(a => a.id === id);
                                        if (!asset) return null;
                                        return (
                                            <div 
                                                key={id} 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragEnter={(e) => handleDragEnter(e, index)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={(e) => e.preventDefault()}
                                                className="bg-white dark:bg-[#252525] border border-gray-100 dark:border-gray-800 rounded-xl p-3 flex items-center justify-between shadow-sm active:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 cursor-grab active:cursor-grabbing transition-colors"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-gray-400 dark:text-gray-600">
                                                        <GripVertical size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                            {lang === 'zh' ? asset.nameCN : asset.name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">{asset.symbol}</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onToggle(id); }}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                             <p className="text-center text-xs text-gray-400 mt-6 mb-2">
                                {lang === 'zh' ? '拖动列表项进行排序' : 'Drag items to reorder'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#121212]">
                     <button 
                        onClick={onClose}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg active:scale-[0.98]"
                     >
                         {lang === 'zh' ? '完成' : 'Done'}
                     </button>
                </div>
            </div>
        </div>
    );
};
