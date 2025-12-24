import React, { useState, useEffect } from 'react';
import { Users, Tag, Settings, CheckCircle2, XCircle, ChevronRight, Search, BarChart3, Zap, Save } from 'lucide-react';
import { authService, GRADES, discountService } from '../../services/AuthService';
import { googleSheetService } from '../../services/GoogleSheetService';

const ALLOWED_BRANDS = [
    'Hankook', '한국타이어', 'Michelin', '미쉐린', 'Goodyear', '굿이어',
    'Dunlop', '던롭', 'Yokohama', '요코하마', 'Continental', '콘티넨탈', 'Pirelli', '피렐리'
];

const AdminPanel = ({ products }) => {
    const [activeTab, setActiveTab] = useState('members');
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [discountSearch, setDiscountSearch] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('All');
    const [discounts, setDiscounts] = useState({});

    const [masterProducts, setMasterProducts] = useState(products || []);
    const [isLoadingMaster, setIsLoadingMaster] = useState(false);
    const [bulkSettings, setBulkSettings] = useState({ brand: 'All', normal: 0, silver: 0, gold: 0 });

    useEffect(() => {
        setUsers(authService.getUsers());
        setDiscounts(discountService.getAllDiscounts());

        const loadMasterData = async () => {
            if (activeTab === 'discounts' && (masterProducts.length === 0 || masterProducts.length === products?.length)) {
                setIsLoadingMaster(true);
                try {
                    const data = await googleSheetService.fetchSheetData();
                    // Filter by allowed brands AND factoryPrice > 0
                    const filtered = data
                        .filter(d => {
                            if (d.factoryPrice <= 0) return false;
                            const b = d.brand?.trim();
                            if (!b) return false;
                            return ALLOWED_BRANDS.some(allowed =>
                                b.toLowerCase().includes(allowed.toLowerCase()) ||
                                allowed.toLowerCase().includes(b.toLowerCase())
                            );
                        });

                    // Group by brand, pattern (PATTEN), and model
                    const grouped = [];
                    const seen = new Set();

                    filtered.forEach(d => {
                        const key = `${d.brand}|${d.pattern}|${d.model}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            grouped.push({
                                brand: d.brand,
                                pattern: d.pattern,
                                model: d.model,
                                patternKey: key
                            });
                        }
                    });

                    setMasterProducts(grouped);
                } catch (err) {
                    console.error('Master data load failed', err);
                } finally {
                    setIsLoadingMaster(false);
                }
            }
        };
        loadMasterData();
    }, [activeTab]);

    const handleGradeUpdate = (userId, grade) => {
        authService.updateUserGrade(userId, grade);
        setUsers([...authService.getUsers()]);
        alert('등급이 변경되었습니다.');
    };

    const handleDiscountUpdate = (brand, pattern, model, grade, rate) => {
        discountService.setPatternDiscount(brand, pattern, model, grade, rate);
        setDiscounts({ ...discountService.getAllDiscounts() });
    };

    const handleBulkUpdate = () => {
        if (bulkSettings.brand === 'All' && !window.confirm('전체 브랜드에 대해 일괄 설정을 진행하시겠습니까?')) return;

        const targets = masterProducts.filter(p => bulkSettings.brand === 'All' || p.brand === bulkSettings.brand);

        targets.forEach(p => {
            discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.NORMAL, bulkSettings.normal);
            discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.SILVER, bulkSettings.silver);
            discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.GOLD, bulkSettings.gold);
        });

        setDiscounts({ ...discountService.getAllDiscounts() });
        alert(`${targets.length}개 패턴의 할인율이 일괄 변경되었습니다.`);
    };

    const filteredUsers = users.filter(u =>
        u.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <div className="w-full lg:w-64 space-y-2">
                    <div className="p-6 bg-slate-900 rounded-3xl mb-6 shadow-xl">
                        <h2 className="text-white font-black text-xl flex items-center gap-2">
                            <Settings className="text-blue-400" /> Admin
                        </h2>
                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">System Management</p>
                    </div>

                    <button
                        onClick={() => setActiveTab('members')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'members' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3"><Users size={18} /> 회원 관리</div>
                        <ChevronRight size={16} className={activeTab === 'members' ? 'opacity-100' : 'opacity-0'} />
                    </button>

                    <button
                        onClick={() => setActiveTab('discounts')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'discounts' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3"><Tag size={18} /> 할인율 설정</div>
                        <ChevronRight size={16} className={activeTab === 'discounts' ? 'opacity-100' : 'opacity-0'} />
                    </button>

                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3"><BarChart3 size={18} /> 통계</div>
                        <ChevronRight size={16} className={activeTab === 'stats' ? 'opacity-100' : 'opacity-0'} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 min-h-[600px] overflow-hidden flex flex-col">
                    {activeTab === 'members' && (
                        <div className="flex-1 flex flex-col">
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <h3 className="text-xl font-black text-slate-900">회원 관리</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="업체명 또는 이메일 검색"
                                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4">업체정보</th>
                                            <th className="px-6 py-4">가입일</th>
                                            <th className="px-6 py-4 text-center">승인상태</th>
                                            <th className="px-6 py-4">현재등급</th>
                                            <th className="px-6 py-4">등급변경</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-slate-600 font-bold">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-slate-900 text-sm">{u.company}</div>
                                                    <div className="text-[10px] text-slate-400">{u.email} | {u.ceo} | {u.contact}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">{u.createdAt?.split('T')[0] || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {u.isApproved ? (
                                                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-full border border-green-100">
                                                            <CheckCircle2 size={12} /> 승인
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-500 px-2 py-1 rounded-full border border-amber-100">
                                                            <XCircle size={12} /> 대기
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black ${u.grade === GRADES.GOLD ? 'bg-yellow-100 text-yellow-700' : u.grade === GRADES.SILVER ? 'bg-slate-200 text-slate-700' : 'bg-blue-50 text-blue-700'}`}>
                                                        {u.grade}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        value={u.grade}
                                                        onChange={(e) => handleGradeUpdate(u.id, e.target.value)}
                                                    >
                                                        {Object.values(GRADES).filter(g => g !== GRADES.PENDING).map(g => (
                                                            <option key={g} value={g}>{g}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'discounts' && (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Bulk Update Controls */}
                            <div className="p-6 bg-slate-900 text-white border-b border-slate-800 shrink-0">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="text-yellow-400" size={20} />
                                    <h4 className="font-black">브랜드별 일괄 할인 설정</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-bold uppercase">대상 브랜드</label>
                                        <select
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                                            value={bulkSettings.brand}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, brand: e.target.value })}
                                        >
                                            <option value="All">전체 브랜드</option>
                                            {Array.from(new Set(masterProducts.map(p => p.brand))).filter(Boolean).map(b => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-blue-400 font-bold uppercase">NORMAL (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                            value={bulkSettings.normal}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, normal: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-300 font-bold uppercase">SILVER (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                            value={bulkSettings.silver}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, silver: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-yellow-400 font-bold uppercase">GOLD (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                            value={bulkSettings.gold}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, gold: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={handleBulkUpdate}
                                            className="w-full h-[34px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Save size={14} /> 일괄 적용
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    개별 상세 설정
                                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{masterProducts.length}</span>
                                </h3>
                                <div className="flex gap-2">
                                    <select
                                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={selectedBrand}
                                        onChange={(e) => setSelectedBrand(e.target.value)}
                                    >
                                        <option value="All">모든 브랜드</option>
                                        {Array.from(new Set(masterProducts.map(p => p.brand))).filter(Boolean).map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="제품명 또는 규격 검색"
                                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={discountSearch}
                                            onChange={(e) => setDiscountSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
                                {isLoadingMaster ? (
                                    <div className="p-20 text-center space-y-4">
                                        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                                        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">브랜드 카탈로그 동기화 중...</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-4">패턴명 (상품명)</th>
                                                <th className="px-6 py-4 text-center text-blue-600">NORMAL (%)</th>
                                                <th className="px-6 py-4 text-center text-slate-600">SILVER (%)</th>
                                                <th className="px-6 py-4 text-center text-yellow-600">GOLD (%)</th>
                                                <th className="px-6 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-600 font-bold">
                                            {masterProducts
                                                .filter(p => selectedBrand === 'All' || p.brand === selectedBrand)
                                                .filter(p =>
                                                    p.pattern?.toLowerCase().includes(discountSearch.toLowerCase()) ||
                                                    p.model?.toLowerCase().includes(discountSearch.toLowerCase())
                                                )
                                                .slice(0, 500)
                                                .map(p => (
                                                    <tr key={p.patternKey} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-black">{p.brand}</span>
                                                                <div className="flex flex-col">
                                                                    <div className="font-black text-slate-900 text-sm">{p.pattern}</div>
                                                                    <div className="text-[10px] text-slate-400">{p.model}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {[GRADES.NORMAL, GRADES.SILVER, GRADES.GOLD].map(grade => (
                                                            <td key={grade} className="px-6 py-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    className={`w-16 text-center bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 font-black ${grade === GRADES.NORMAL ? 'text-blue-600 border-blue-100' : grade === GRADES.GOLD ? 'text-yellow-600 border-yellow-100' : ''}`}
                                                                    value={discountService.getPatternDiscount(p.brand, p.pattern, p.model, grade)}
                                                                    onChange={(e) => handleDiscountUpdate(p.brand, p.pattern, p.model, grade, e.target.value)}
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="px-4 py-4">
                                                            <button
                                                                onClick={() => {
                                                                    const rate = prompt(`[${p.pattern} ${p.model}] 모든 등급에 적용할 할인율(%)을 입력하세요:`, '0');
                                                                    if (rate !== null) {
                                                                        [GRADES.NORMAL, GRADES.SILVER, GRADES.GOLD].forEach(g => {
                                                                            discountService.setPatternDiscount(p.brand, p.pattern, p.model, g, rate);
                                                                        });
                                                                        setDiscounts({ ...discountService.getAllDiscounts() });
                                                                    }
                                                                }}
                                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
                                                                title="모든 등급에 동일 적용"
                                                            >
                                                                <Zap size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                                {(!isLoadingMaster && masterProducts.length === 0) && (
                                    <div className="p-20 text-center text-slate-400">
                                        <Tag size={48} className="mx-auto mb-4 opacity-10" />
                                        <p className="font-black text-slate-500">제품 카탈로그를 불러올 수 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
