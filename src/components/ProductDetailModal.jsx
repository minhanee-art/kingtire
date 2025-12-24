import React, { useState, useEffect } from 'react';
import { X, Star, Fuel, Droplet, Volume2, ShieldCheck, Activity, Zap } from 'lucide-react';
import { inventoryService } from '../services/InventoryService';

const ProductDetailModal = ({ product, onClose, isStoreMode }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDetails = async () => {
            const data = await inventoryService.fetchProductDetails(product.itId, product.sheetImageUrl);
            if (data) setDetails(data);
            setLoading(false);
        };
        loadDetails();
    }, [product]);

    const metrics = [
        { id: 'handling', label: '핸들링', value: details?.performance?.dryGrip || 8.5, icon: <Activity size={14} /> },
        { id: 'braking', label: '제동력', value: details?.performance?.braking || 8.5, icon: <ShieldCheck size={14} /> },
        { id: 'comfort', label: '승차감', value: details?.performance?.comfort || 9.0, icon: <Star size={14} /> },
        { id: 'noise', label: '정숙성', value: details?.performance?.noise || 8.8, icon: <Volume2 size={14} /> },
    ];
    const maxValue = Math.max(...metrics.map(m => m.value));
    const topMetric = metrics.find(m => m.value === maxValue);

    const getStrategicActiveList = (label) => {
        switch (label) {
            case '핸들링': return ['주행안정성', '접지력', '핸들링'];
            case '제동력': return ['접지력', '주행안정성'];
            case '승차감': return ['럭셔리투어링', '정숙성'];
            case '정숙성': return ['럭셔리투어링', '고급형', '모든노면주행', '정숙성'];
            default: return [];
        }
    };
    const strategicActiveList = getStrategicActiveList(topMetric?.label);

    if (!product) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                                {product.brand}
                            </span>
                            {details?.season && (
                                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                                    {details.season}
                                </span>
                            )}
                            {details?.type && (
                                <span className="bg-slate-700 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                                    {details.type}
                                </span>
                            )}
                            <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase ml-auto">상세 정보</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">{product.model}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-900 transition-all active:scale-90"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Image Section */}
                        <div className="space-y-6">
                            <div className="aspect-square rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden group">
                                {loading ? (
                                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                ) : details?.imageUrl ? (
                                    <img
                                        src={details.imageUrl}
                                        alt={product.model}
                                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="text-slate-300 italic font-medium">이미지가 없습니다</div>
                                )}
                            </div>

                            {/* Info Tags */}
                            <div className="flex flex-wrap gap-3">
                                <div className="flex-1 min-w-[120px] p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                    <div className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-tighter">규격</div>
                                    <div className="text-sm font-bold text-slate-900">{product.size}</div>
                                </div>
                                <div className="flex-1 min-w-[120px] p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-tighter">상품코드</div>
                                    <div className="text-sm font-mono font-bold text-slate-700">{product.partNo}</div>
                                </div>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="space-y-8">
                            {/* Performance Grid */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">
                                    <Activity size={18} className="text-blue-600" />
                                    주요 성능 현황
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {metrics.map((metric, i) => {
                                        const isMax = metric.value === maxValue && maxValue > 0;
                                        return (
                                            <div key={i} className={`p-3 bg-white border rounded-lg transition-all duration-500 ${isMax ? "border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.1)] ring-1 ring-blue-500/20 scale-[1.02]" : "border-slate-100 shadow-sm"
                                                }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[11px] font-bold flex items-center gap-1 ${isMax ? "text-blue-600" : "text-slate-500"}`}>
                                                        {metric.icon}
                                                        {metric.label}
                                                        {isMax && <span className="ml-1 px-1 bg-blue-100 text-blue-600 text-[8px] rounded uppercase">Best</span>}
                                                    </span>
                                                    <span className={`text-xs font-black ${isMax ? "text-blue-600" : "text-slate-900"}`}>{metric.value.toFixed(1)}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${isMax ? "bg-blue-600" : "bg-slate-400"}`}
                                                        style={{ width: `${(metric.value / 10) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Product Features Section */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">
                                    <Star size={18} className="text-blue-600" />
                                    제품 특징
                                </h4>
                                {loading ? (
                                    <div className="grid grid-cols-4 gap-4">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="aspect-square bg-slate-50 rounded-xl animate-pulse"></div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { id: '사계절', label: '사계절', icon: <ShieldCheck size={20} /> },
                                            { id: '퍼포먼스', label: '퍼포먼스', icon: <Activity size={20} /> },
                                            { id: '올웨더', label: '올웨더', icon: <Droplet size={20} /> },
                                            { id: '전기차', label: '전기차', icon: <Zap size={20} /> },
                                        ].map((item) => {
                                            // 1. Check Google Sheet features first
                                            // 2. Fallback to seasonal description if applicable
                                            const isActive = (product.features && product.features.includes(item.id)) ||
                                                (item.id === '사계절' && details?.season?.includes('사계절')) ||
                                                (item.id === '퍼포먼스' && strategicActiveList.includes('접지력'));

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-500 ${isActive
                                                        ? "bg-blue-50 border-blue-200 text-blue-600 scale-105 shadow-sm"
                                                        : "bg-white border-slate-100 text-slate-300 opacity-60"
                                                        }`}
                                                >
                                                    <div className="mb-2">{item.icon}</div>
                                                    <span className={`text-[10px] font-black text-center leading-tight ${isActive ? "text-blue-700" : "text-slate-400"}`}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">예상 판매가</span>
                        <div className="text-2xl font-black text-slate-900">
                            {Math.floor(product.factoryPrice * (1 - (product.discountRate || 0) / 100)).toLocaleString()}
                            <span className="text-sm ml-1">원</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;
