import React from 'react';
import { Columns, X, ArrowRight } from 'lucide-react';

const ComparisonTray = ({ selectedItems, onRemove, onCompare, onClear }) => {
    if (selectedItems.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl shadow-blue-500/10 border border-slate-200 p-2 flex items-center gap-4 pl-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl">
                        <Columns size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">비교하기</span>
                        <span className="text-sm font-black italic">{selectedItems.length}개 제품</span>
                    </div>
                </div>

                <div className="h-10 w-[1px] bg-slate-100 mx-2"></div>

                <div className="flex items-center gap-2 overflow-x-auto max-w-[300px] no-scrollbar py-1">
                    {selectedItems.map((item) => (
                        <div key={item.code} className="relative group shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center p-1 border border-slate-200 hover:border-blue-500 transition-all overflow-hidden">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.model} className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-400">{item.brand[0]}</span>
                                )}
                            </div>
                            <button
                                onClick={() => onRemove(item.code)}
                                className="absolute -top-1 -right-1 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-400 p-0.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95 border border-slate-200"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    {selectedItems.length < 4 && (
                        <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 italic font-bold text-xs shrink-0">
                            +
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                    <button
                        onClick={onCompare}
                        disabled={selectedItems.length < 2}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all active:scale-95 ${selectedItems.length >= 2
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                    >
                        비교하기
                        <ArrowRight size={18} />
                    </button>
                    <button
                        onClick={onClear}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-2xl transition-all"
                        title="모두 비우기"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComparisonTray;
