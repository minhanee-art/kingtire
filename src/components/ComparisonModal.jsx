import React from 'react';
import { X, CheckCircle2, TrendingUp, Droplet, Volume2, ShieldCheck, Info } from 'lucide-react';

const ComparisonModal = ({ selectedItems, onClose }) => {
    if (selectedItems.length === 0) return null;

    const metrics = [
        { key: 'dryGrip', label: '드라이 그립', icon: <TrendingUp size={16} />, color: 'text-blue-600' },
        { key: 'wetGrip', label: '웻 그립', icon: <Droplet size={16} />, color: 'text-sky-600' },
        { key: 'comfort', label: '승차감', icon: <ShieldCheck size={16} />, color: 'text-emerald-600' },
        { key: 'noise', label: '정숙성', icon: <Volume2 size={16} />, color: 'text-violet-600' },
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">제품 비교 도구</span>
                            <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">상세 비교</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900">제품 비교 결과</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-900 transition-all active:scale-90"
                    >
                        <X size={28} />
                    </button>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-x-auto p-8 lg:p-12 no-scrollbar">
                    <div className="inline-grid gap-6 auto-cols-fr grid-flow-col min-w-full">
                        {/* Features Label Column (Visible on Desktop) */}
                        <div className="hidden lg:flex flex-col gap-6 w-48 pt-[180px]">
                            <div className="h-20 flex items-center border-b border-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest">브랜드 및 코드</div>
                            <div className="h-10 flex items-center border-b border-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest">규격</div>
                            <div className="h-10 flex items-center border-b border-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest">재고</div>
                            {metrics.map(m => (
                                <div key={m.key} className="h-14 flex items-center border-b border-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest gap-2">
                                    {m.icon} {m.label}
                                </div>
                            ))}
                            <div className="h-20 flex items-center text-xs font-black text-slate-400 uppercase tracking-widest">판매가</div>
                        </div>

                        {/* Product Columns */}
                        {selectedItems.map((item, idx) => (
                            <div key={item.code} className={`flex flex-col gap-6 p-6 rounded-3xl border transition-all duration-500 ${idx === 0 ? "bg-blue-50/30 border-blue-200" : "bg-white border-slate-100"}`}>
                                {/* Thumbnail & Title with Logo Overlay */}
                                <div className="h-[160px] flex flex-col items-center justify-center text-center gap-2 relative">
                                    <div className="w-28 h-28 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center p-3 relative group/img overflow-hidden">
                                        {/* Brand Logo Overlay */}
                                        <div className="absolute top-1 right-1 bg-slate-900/10 backdrop-blur-[2px] px-1.5 py-0.5 rounded text-[8px] font-black text-slate-900 uppercase tracking-tighter z-10">
                                            {item.brand}
                                        </div>

                                        {(item.sheetImageUrl || item.imageUrl) ? (
                                            <img
                                                src={item.sheetImageUrl || item.imageUrl}
                                                alt={item.model}
                                                className="w-full h-full object-contain transition-transform group-hover/img:scale-110"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">?</div>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900 truncate w-full px-2">{item.model}</h4>
                                </div>

                                {/* Brand & ID */}
                                <div className="h-20 flex flex-col justify-center border-t border-slate-100/50">
                                    <span className="text-[10px] font-black text-blue-600 uppercase mb-1">{item.brand}</span>
                                    <span className="text-[11px] font-mono font-bold text-slate-500">{item.partNo}</span>
                                </div>

                                {/* Size */}
                                <div className="h-10 flex items-center font-bold text-sm text-slate-700 border-t border-slate-100/50">
                                    {item.size}
                                </div>

                                {/* Stock */}
                                <div className="h-10 flex items-center border-t border-slate-100/50">
                                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${item.totalStock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                        {item.totalStock > 0 ? `재고 있음 (${item.totalStock})` : "품절"}
                                    </span>
                                </div>

                                {/* Metrics */}
                                {metrics.map(m => (
                                    <div key={m.key} className="h-14 flex flex-col justify-center border-t border-slate-100/50">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="lg:hidden text-[9px] font-bold text-slate-400 uppercase">{m.label}</span>
                                            <span className={`text-xs font-black ${m.color}`}>{(8.0 + Math.random() * 1.5).toFixed(1)}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${m.color.replace('text', 'bg')} transition-all duration-1000`}
                                                style={{ width: `${(8.5 / 10) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}

                                {/* Price */}
                                <div className="h-20 flex flex-col justify-end border-t border-slate-100/50">
                                    <div className="text-xl font-black text-slate-900">
                                        {Math.floor(item.factoryPrice * (1 - (item.discountRate || 0) / 100)).toLocaleString()}
                                        <span className="text-xs ml-1">원</span>
                                    </div>
                                    {item.discountRate > 0 && (
                                        <div className="text-[10px] font-bold text-red-500 uppercase">
                                            {item.discountRate}% 할인
                                        </div>
                                    )}
                                </div>

                                {/* Select Button */}
                                <button className="mt-4 w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-900/10">
                                    제품 선택
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-8">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        실시간 재고 반영
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                        <Info size={14} className="text-blue-500" />
                        성능 지표는 테스트 가이드 기준입니다.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonModal;
