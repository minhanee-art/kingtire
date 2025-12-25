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
    const [allSizes, setAllSizes] = useState([]);
    const [isLoadingMaster, setIsLoadingMaster] = useState(false);
    const [bulkSettings, setBulkSettings] = useState({ brand: 'All', g3: 0, g4: 0, g5: 0, dc: 0, master: 0 });
    const [selectedPattern, setSelectedPattern] = useState('');
    const [sizeSearch, setSizeSearch] = useState('');

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

                    // Group by brand and pattern
                    const grouped = [];
                    const seen = new Set();

                    filtered.forEach(d => {
                        const brand = d.brand || 'Unknown';
                        const pattern = d.pattern || d.model || 'Unknown'; // Fallback to model if pattern is empty
                        const key = `${brand}|${pattern}`;

                        if (!seen.has(key)) {
                            seen.add(key);
                            grouped.push({
                                brand: brand,
                                pattern: pattern,
                                model: d.model, // Just for reference
                                patternKey: key
                            });
                        }
                    });

                    setMasterProducts(grouped);

                    // Extract all unique sizes
                    const uniqueSizes = Array.from(new Set(data.map(d => d.size)))
                        .filter(Boolean)
                        .sort();
                    setAllSizes(uniqueSizes);
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
            discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.G3, bulkSettings.g3);
            discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.G4, bulkSettings.g4);
            discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.G5, bulkSettings.g5);
            discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.DC, bulkSettings.dc);
            discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.MASTER, bulkSettings.master);
        });

        setDiscounts({ ...discountService.getAllDiscounts() });
        alert(`${targets.length}개 패턴의 할인율이 일괄 변경되었습니다.`);
    };

    const handlePatternBulkUpdate = () => {
        if (!selectedPattern) return alert('패턴을 선택해주세요.');
        const item = masterProducts.find(p => p.patternKey === selectedPattern);
        if (!item) return;

        const rates = prompt(`[${item.brand} ${item.pattern}] 3,4,5,DC 할인율을 콤마(,)로 구분하여 입력하세요 (예: 10,12,15,5):`, '0,0,0,0');
        if (rates) {
            const [g3, g4, g5, dc] = rates.split(',').map(r => r.trim());
            discountService.setPatternDiscount(item.brand, item.pattern, item.model, GRADES.G3, g3 || 0);
            discountService.setPatternDiscount(item.brand, item.pattern, item.model, GRADES.G4, g4 || 0);
            discountService.setPatternDiscount(item.brand, item.pattern, item.model, GRADES.G5, g5 || 0);
            discountService.setPatternDiscount(item.brand, item.pattern, item.model, GRADES.DC, dc || 0);
            setDiscounts({ ...discountService.getAllDiscounts() });
            alert('설정되었습니다.');
        }
    };

    const handleSizeUpdate = (size, grade, rate) => {
        discountService.setSizeDiscount(size, grade, rate);
        setDiscounts({ ...discountService.getAllDiscounts() });
    };

    const filteredUsers = users.filter(u => {
        const company = (u.company || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return company.includes(search) || email.includes(search);
    });

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
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black ${u.grade === GRADES.G5 ? 'bg-yellow-100 text-yellow-700' :
                                                        u.grade === GRADES.G4 ? 'bg-slate-200 text-slate-700' :
                                                            u.grade === GRADES.G3 ? 'bg-blue-50 text-blue-700' :
                                                                u.grade === GRADES.MASTER ? 'bg-purple-100 text-purple-700' :
                                                                    u.grade === GRADES.ADMIN ? 'bg-slate-900 text-white' :
                                                                        'bg-slate-100 text-slate-500'
                                                        }`}>
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
                                        <label className="text-[10px] text-blue-400 font-bold uppercase">등급 3 (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                            value={bulkSettings.g3}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, g3: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-300 font-bold uppercase">등급 4 (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                            value={bulkSettings.g4}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, g4: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-yellow-400 font-bold uppercase">등급 5 (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                            value={bulkSettings.g5}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, g5: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-green-400 font-bold uppercase">DC (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                            value={bulkSettings.dc}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, dc: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-purple-400 font-bold uppercase">MASTER (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                                            value={bulkSettings.master}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, master: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-end col-span-2 md:col-span-1">
                                        <button
                                            onClick={handleBulkUpdate}
                                            className="w-full h-[34px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Save size={14} /> 일괄 적용
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col gap-6 shrink-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                        패턴별 할인율 설정
                                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{masterProducts.length}</span>
                                    </h3>
                                    <div className="flex gap-2">
                                        <select
                                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={selectedBrand}
                                            onChange={(e) => setSelectedBrand(e.target.value)}
                                        >
                                            <option value="All">모든 브랜드</option>
                                            {Array.from(new Set(masterProducts.map(p => p.brand))).filter(Boolean).sort().map(b => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="제품명 검색"
                                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-40"
                                                value={discountSearch}
                                                onChange={(e) => setDiscountSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Targeted Pattern Update */}
                                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Tag size={16} />
                                            <span className="text-xs font-black uppercase">패턴별 일괄 설정</span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <select
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold focus:outline-none"
                                                    value={selectedBrand === 'All' ? '' : selectedBrand}
                                                    onChange={(e) => setSelectedBrand(e.target.value || 'All')}
                                                >
                                                    <option value="">브랜드 선택</option>
                                                    {Array.from(new Set(masterProducts.map(p => p.brand))).filter(Boolean).sort().map(b => (
                                                        <option key={b} value={b}>{b}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold focus:outline-none"
                                                    value={selectedPattern}
                                                    onChange={(e) => setSelectedPattern(e.target.value)}
                                                >
                                                    <option value="">패턴 선택</option>
                                                    {masterProducts
                                                        .filter(p => selectedBrand === 'All' || p.brand === selectedBrand)
                                                        .sort((a, b) => a.pattern.localeCompare(b.pattern))
                                                        .map(p => (
                                                            <option key={p.patternKey} value={p.patternKey}>{p.pattern}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                            <button
                                                onClick={handlePatternBulkUpdate}
                                                className="w-full bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-600 transition-colors"
                                            >
                                                적정 패턴 할인율 설정
                                            </button>
                                        </div>
                                    </div>

                                    {/* Individual Size Search & Filter area placeholder (moved to table below) */}
                                    <div className="p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center">
                                        <div className="text-center">
                                            <Search size={24} className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">아래 사이즈 목록에서<br />개별 검색 및 설정 가능합니다</p>
                                        </div>
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
                                                <th className="px-6 py-4 text-center text-blue-600">3 (%)</th>
                                                <th className="px-6 py-4 text-center text-slate-600">4 (%)</th>
                                                <th className="px-6 py-4 text-center text-yellow-600">5 (%)</th>
                                                <th className="px-6 py-4 text-center text-green-600">DC (%)</th>
                                                <th className="px-6 py-4 text-center text-purple-600">MASTER (%)</th>
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
                                                .slice(0, 300)
                                                .map(p => (
                                                    <tr key={p.patternKey} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded font-black tracking-tighter uppercase">{p.brand}</span>
                                                                <div className="flex flex-col">
                                                                    <div className="font-black text-slate-900 text-sm tracking-tight">{p.pattern}</div>
                                                                    {p.pattern !== p.model && (
                                                                        <div className="text-[10px] text-slate-400 font-medium">대표 모델: {p.model}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {[GRADES.G3, GRADES.G4, GRADES.G5, GRADES.DC, GRADES.MASTER].map(grade => (
                                                            <td key={grade} className="px-6 py-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    className={`w-14 text-center bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 font-black ${grade === GRADES.G3 ? 'text-blue-600 border-blue-100' : grade === GRADES.G5 ? 'text-yellow-600 border-yellow-100' : grade === GRADES.DC ? 'text-green-600 border-green-100' : grade === GRADES.MASTER ? 'text-purple-600 border-purple-100' : ''}`}
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
                                                                        [GRADES.G3, GRADES.G4, GRADES.G5, GRADES.DC, GRADES.MASTER].forEach(g => {
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

                                {/* Individual Size Settings Section */}
                                <div className="mt-8 px-6 pt-8 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                            사이즈별 개별 설정
                                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{allSizes.length}</span>
                                        </h3>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="사이즈 검색 (예: 2454518)"
                                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-56"
                                                value={sizeSearch}
                                                onChange={(e) => setSizeSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4">타이어 규격</th>
                                                    <th className="px-6 py-4 text-center text-blue-600">3 (%)</th>
                                                    <th className="px-6 py-4 text-center text-slate-600">4 (%)</th>
                                                    <th className="px-6 py-4 text-center text-yellow-600">5 (%)</th>
                                                    <th className="px-6 py-4 text-center text-green-600">DC (%)</th>
                                                    <th className="px-6 py-4 text-center text-purple-600">MASTER (%)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 text-slate-600 font-bold">
                                                {allSizes
                                                    .filter(s => s.replace(/[^0-9]/g, '').includes(sizeSearch.replace(/[^0-9]/g, '')))
                                                    .slice(0, 100)
                                                    .map(size => (
                                                        <tr key={size} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="font-black text-slate-900 text-sm">{size}</div>
                                                            </td>
                                                            {[GRADES.G3, GRADES.G4, GRADES.G5, GRADES.DC, GRADES.MASTER].map(grade => (
                                                                <td key={grade} className="px-6 py-4 text-center">
                                                                    <input
                                                                        type="number"
                                                                        className={`w-14 text-center bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 font-black ${grade === GRADES.G3 ? 'text-blue-600' : grade === GRADES.G5 ? 'text-yellow-600' : grade === GRADES.DC ? 'text-green-600' : grade === GRADES.MASTER ? 'text-purple-600' : ''}`}
                                                                        value={discountService.getSizeDiscount(size.replace(/\D/g, ''), grade)}
                                                                        onChange={(e) => handleSizeUpdate(size.replace(/\D/g, ''), grade, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                {(!isLoadingMaster && masterProducts.length === 0) && (
                                    <div className="p-20 text-center text-slate-400">
                                        <Tag size={48} className="mx-auto mb-4 opacity-10" />
                                        <p className="font-black text-slate-500">제품 카탈로그를 불러올 수 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-20">
                            <BarChart3 size={48} className="opacity-10 mb-4" />
                            <p className="font-black">준비 중인 기능입니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
