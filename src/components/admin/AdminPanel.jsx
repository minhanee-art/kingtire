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
    const [fullMasterData, setFullMasterData] = useState([]); // All rows from sheet
    const [allSizes, setAllSizes] = useState([]);
    const [isLoadingMaster, setIsLoadingMaster] = useState(false);
    const [bulkSettings, setBulkSettings] = useState({ brand: 'All', g3: 0, g4: 0, g5: 0, special: 0, master: 0 });
    const [selectedPattern, setSelectedPattern] = useState('');
    const [selectedInch, setSelectedInch] = useState('All');
    const [sizeSearch, setSizeSearch] = useState('');
    const [patternBulkRate, setPatternBulkRate] = useState('');

    const getDerivedPattern = (row) => googleSheetService.getDerivedPattern(row);

    useEffect(() => {
        setSelectedInch('All');
    }, [selectedPattern, selectedBrand]);

    useEffect(() => {
        let isMounted = true;
        setUsers(authService.getUsers());
        setDiscounts(discountService.getAllDiscounts());

        const loadMasterData = async () => {
            if (activeTab === 'discounts' && (masterProducts.length === 0 || masterProducts.length === products?.length)) {
                if (isMounted) setIsLoadingMaster(true);
                try {
                    const data = await googleSheetService.fetchSheetData();
                    if (!isMounted) return;

                    setFullMasterData(data); // Store everything for size filtering

                    // Filter by allowed brands AND factoryPrice > 0
                    const filtered = data
                        .filter(d => {
                            // Basic sanity check: must have brand, size, and model
                            if (!d.brand || !d.size || !d.model) return false;

                            if (d.factoryPrice <= 0 && activeTab !== 'discounts') return false;
                            const b = d.brand?.trim();
                            if (!b) return false;
                            return ALLOWED_BRANDS.some(allowed =>
                                b.toLowerCase().includes(allowed.toLowerCase()) ||
                                allowed.toLowerCase().includes(b.toLowerCase())
                            );
                        });

                    // Group by brand and derived pattern
                    const grouped = [];
                    const seen = new Set();

                    filtered.forEach(d => {
                        const brand = d.brand || 'Unknown';
                        const pattern = getDerivedPattern(d);
                        const key = `${brand}|${pattern}`;

                        if (!seen.has(key)) {
                            seen.add(key);
                            grouped.push({
                                brand: brand,
                                pattern: pattern,
                                model: d.model,
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
                    if (isMounted) setIsLoadingMaster(false);
                }
            }
        };
        loadMasterData();

        return () => {
            isMounted = false;
        };
    }, [activeTab]);

    const handleGradeUpdate = async (userId, newGrade) => {
        await authService.updateUserGrade(userId, newGrade);
        setUsers([...authService.getUsers()]);
    };

    const handleDeleteUser = async (userId, company) => {
        if (window.confirm(`[경고] ${company} 업체를 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 해당 업체의 모든 정보가 삭제됩니다.`)) {
            await authService.deleteUser(userId);
            setUsers([...authService.getUsers()]);
        }
    };

    const handleDiscountUpdate = async (brand, pattern, model, grade, rate) => {
        await discountService.setPatternDiscount(brand, pattern, model, grade, rate);
        setDiscounts({ ...discountService.getAllDiscounts() });
    };

    const handleBulkUpdate = async () => {
        if (bulkSettings.brand === 'All' && !window.confirm('전체 브랜드에 대해 일괄 설정을 진행하시겠습니까?')) return;

        const targets = masterProducts.filter(p => bulkSettings.brand === 'All' || p.brand === bulkSettings.brand);

        for (const p of targets) {
            await discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.G3, bulkSettings.g3);
            await discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.G4, bulkSettings.g4);
            await discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.G5, bulkSettings.g5);
            await discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.SPECIAL, bulkSettings.special);
            await discountService.setPatternDiscount(p.brand, p.pattern, p.model, GRADES.MASTER, bulkSettings.master);
        }

        setDiscounts({ ...discountService.getAllDiscounts() });
        alert(`${targets.length}개 패턴의 할인율이 일괄 변경되었습니다.`);
    };

    const handleCodeDiscountUpdate = async (code, grade, rate) => {
        await discountService.setCodeDiscount(code, grade, rate);
        setDiscounts({ ...discountService.getAllDiscounts() });
    };

    const applyPatternBulkRate = async (rate) => {
        const p = masterProducts.find(item => item.patternKey === selectedPattern);
        if (!p) return;

        setPatternBulkRate(rate);
        if (rate !== '' && !isNaN(rate)) {
            for (const g of [GRADES.G3, GRADES.G4, GRADES.G5, GRADES.SPECIAL, GRADES.MASTER]) {
                await discountService.setPatternDiscount(p.brand, p.pattern, p.model, g, rate);
            }
            setDiscounts({ ...discountService.getAllDiscounts() });
        }
    };

    const handleSizeUpdate = async (size, grade, rate) => {
        await discountService.setSizeDiscount(size, grade, rate);
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
                    <div className="p-6 bg-[#004F9F] rounded-3xl mb-6 shadow-xl border border-blue-500/20">
                        <h2 className="text-white font-black text-xl flex items-center gap-2">
                            <Settings className="text-blue-200" /> Admin
                        </h2>
                        <p className="text-blue-100 text-[10px] uppercase font-bold tracking-widest mt-1">System Management</p>
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
                                            <th className="px-6 py-4">승인상태</th>
                                            <th className="px-6 py-4">현재등급</th>
                                            <th className="px-6 py-4">등급변경</th>
                                            <th className="px-6 py-4 text-center">관리</th>
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
                                                                u.grade === GRADES.SPECIAL ? 'bg-green-100 text-green-700' :
                                                                    u.grade === GRADES.MASTER ? 'bg-purple-100 text-purple-700' :
                                                                        u.grade === GRADES.ADMIN ? 'bg-slate-800 text-white' :
                                                                            'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {u.grade === GRADES.SPECIAL ? 'SPECIAL' : u.grade}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.values(GRADES).filter(g => g !== GRADES.PENDING && g !== GRADES.ADMIN).map(g => (
                                                            <button
                                                                key={g}
                                                                onClick={() => handleGradeUpdate(u.id, g)}
                                                                className={`px-2 py-1 rounded border text-[9px] font-black transition-all ${u.grade === g
                                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600'
                                                                    }`}
                                                            >
                                                                {g}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id, u.company)}
                                                        className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                                                        title="업체 삭제"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
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
                            <div className="p-6 bg-slate-50 border-b border-slate-200 shrink-0">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="text-blue-600" size={20} />
                                    <h4 className="font-black text-slate-900">브랜드별 일괄 할인 설정</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase">대상 브랜드</label>
                                        <select
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                                        <label className="text-[10px] text-blue-600 font-bold uppercase">등급 3 (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={bulkSettings.g3}
                                            onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                            onBlur={(e) => e.target.value === '' && (e.target.value = '0')}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, g3: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase">등급 4 (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={bulkSettings.g4}
                                            onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                            onBlur={(e) => e.target.value === '' && (e.target.value = '0')}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, g4: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-yellow-600 font-bold uppercase">등급 5 (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={bulkSettings.g5}
                                            onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                            onBlur={(e) => e.target.value === '' && (e.target.value = '0')}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, g5: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-green-600 font-bold uppercase">SPECIAL (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={bulkSettings.special}
                                            onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                            onBlur={(e) => e.target.value === '' && (e.target.value = '0')}
                                            onChange={(e) => setBulkSettings({ ...bulkSettings, special: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-purple-600 font-bold uppercase">MASTER (%)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={bulkSettings.master}
                                            onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                            onBlur={(e) => e.target.value === '' && (e.target.value = '0')}
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

                                <div className="grid grid-cols-1 gap-4">
                                    {/* Targeted Pattern Update - Expanded */}
                                    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <Tag size={18} />
                                                <span className="text-sm font-black uppercase">패턴별 세부 설정</span>
                                            </div>
                                            <div className="flex gap-2 w-2/3">
                                                <select
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none"
                                                    value={selectedBrand === 'All' ? '' : selectedBrand}
                                                    onChange={(e) => {
                                                        setSelectedBrand(e.target.value || 'All');
                                                        setSelectedPattern('');
                                                    }}
                                                >
                                                    <option value="">브랜드 선택</option>
                                                    {Array.from(new Set(masterProducts.map(p => p.brand))).filter(Boolean).sort().map(b => (
                                                        <option key={b} value={b}>{b}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none"
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
                                                <select
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none"
                                                    value={selectedInch}
                                                    onChange={(e) => setSelectedInch(e.target.value)}
                                                >
                                                    <option value="All">인치 선택</option>
                                                    {(() => {
                                                        if (!selectedPattern) return null;
                                                        const [sBrand, sPat] = selectedPattern.split('|');
                                                        const patternItems = fullMasterData.filter(d =>
                                                            (d.brand === sBrand) && (googleSheetService.getDerivedPattern(d) === sPat)
                                                        );
                                                        const inches = Array.from(new Set(patternItems.map(d => {
                                                            // More robust inch extraction: look for 2 digits either after R or at the end of a group
                                                            const match = d.size?.match(/R(\d{2})/i) || d.size?.match(/\s(\d{2})$/) || d.size?.match(/(\d{2})$/);
                                                            return match ? match[1] : null;
                                                        }).filter(Boolean))).sort((a, b) => Number(a) - Number(b));

                                                        return inches.map(inch => (
                                                            <option key={inch} value={inch}>{inch}인치</option>
                                                        ));
                                                    })()}
                                                </select>
                                            </div>
                                        </div>

                                        {selectedPattern && masterProducts.find(p => p.patternKey === selectedPattern) && (
                                            <div className="bg-slate-50 rounded-2xl p-6 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-2 mb-4 text-xs font-black text-slate-500 uppercase">
                                                    <ChevronRight size={14} className="text-blue-500" /> 패턴 통합 할인율 설정 (전체 사이즈 적용)
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                                                    {[GRADES.G3, GRADES.G4, GRADES.G5, GRADES.SPECIAL, GRADES.MASTER].map(grade => {
                                                        const p = masterProducts.find(item => item.patternKey === selectedPattern);
                                                        return (
                                                            <div key={grade} className="space-y-1.5">
                                                                <label className={`text-[10px] font-black uppercase tracking-wider ${grade === GRADES.G3 ? 'text-blue-500' : grade === GRADES.G5 ? 'text-yellow-600' : grade === GRADES.SPECIAL ? 'text-green-600' : grade === GRADES.MASTER ? 'text-purple-600' : 'text-slate-400'}`}>
                                                                    Grade {grade} (%)
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-blue-500/20"
                                                                    value={discountService.getPatternDiscount(p.brand, p.pattern, p.model, grade)}
                                                                    onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                                                    onBlur={(e) => e.target.value === '' && (e.target.value = '0')}
                                                                    onChange={(e) => {
                                                                        discountService.setPatternDiscount(p.brand, p.pattern, p.model, grade, e.target.value);
                                                                        setDiscounts({ ...discountService.getAllDiscounts() });
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="space-y-1.5 min-w-[100px]">
                                                        <label className="text-[10px] font-black uppercase text-blue-600">전체 일괄(%)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="number"
                                                                className="w-full bg-white border border-blue-400 rounded-xl px-3 py-2 text-sm font-black focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                                                placeholder="0"
                                                                value={patternBulkRate}
                                                                onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                                                onBlur={(e) => e.target.value === '' && (e.target.value = '0')}
                                                                onChange={(e) => applyPatternBulkRate(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                                <th className="px-6 py-4">패턴 하위 규격별 상세 설정 (개별 우대 적용)</th>
                                                <th className="px-6 py-4 text-center text-blue-600">3 (%)</th>
                                                <th className="px-6 py-4 text-center text-slate-600">4 (%)</th>
                                                <th className="px-6 py-4 text-center text-yellow-600">5 (%)</th>
                                                <th className="px-6 py-4 text-center text-green-600">SPECIAL (%)</th>
                                                <th className="px-6 py-4 text-center text-purple-600">MASTER (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-600 font-bold">
                                            {(() => {
                                                // Determine items to show
                                                let displayItems = [];
                                                if (selectedPattern) {
                                                    const [sBrand, sPat] = selectedPattern.split('|');
                                                    const patternItems = fullMasterData.filter(d =>
                                                        (d.brand === sBrand) && (googleSheetService.getDerivedPattern(d) === sPat)
                                                    );

                                                    displayItems = patternItems;

                                                    if (selectedInch !== 'All') {
                                                        displayItems = displayItems.filter(d => {
                                                            const match = d.size?.match(/R(\d{2})/i) || d.size?.match(/\s(\d{2})$/) || d.size?.match(/(\d{2})$/);
                                                            return match && match[1] === selectedInch;
                                                        });
                                                    }

                                                    // Add alphanumeric sort for sizes
                                                    displayItems.sort((a, b) => (a.size || '').localeCompare(b.size || '', undefined, { numeric: true }));
                                                } else {
                                                    // Filter by ALLOWED_BRANDS + search/brand
                                                    displayItems = fullMasterData
                                                        .filter(d => {
                                                            const b = (d.brand || '').trim();
                                                            if (!b) return false;
                                                            return ALLOWED_BRANDS.some(allowed =>
                                                                b.toLowerCase().includes(allowed.toLowerCase()) ||
                                                                allowed.toLowerCase().includes(b.toLowerCase())
                                                            );
                                                        })
                                                        .filter(p => {
                                                            if (selectedBrand === 'All') return true;
                                                            const pBrand = (p.brand || '').trim();
                                                            return pBrand === selectedBrand.trim();
                                                        })
                                                        .filter(p => {
                                                            const search = discountSearch.toLowerCase();
                                                            if (!search) return true;
                                                            return (p.pattern || '').toLowerCase().includes(search) ||
                                                                (p.model || '').toLowerCase().includes(search) ||
                                                                (p.size || '').toLowerCase().includes(search) ||
                                                                (p.code || '').toLowerCase().includes(search);
                                                        })
                                                        .slice(0, 500); // Increased slice to show more matches
                                                }

                                                return displayItems.map(p => (
                                                    <tr key={p.code} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="bg-[#004F9F] text-white text-[9px] px-2 py-0.5 rounded font-black tracking-tighter uppercase">{p.brand}</span>
                                                                <div className="flex flex-col">
                                                                    <div className="font-black text-slate-900 text-sm tracking-tight">{p.model}</div>
                                                                    <div className="text-[10px] text-blue-600 font-black">{p.size}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {[GRADES.G3, GRADES.G4, GRADES.G5, GRADES.SPECIAL, GRADES.MASTER].map(grade => (
                                                            <td key={grade} className="px-6 py-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    className={`w-14 text-center bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 font-black ${grade === GRADES.G3 ? 'text-blue-600 border-blue-100' : grade === GRADES.G5 ? 'text-yellow-600 border-yellow-100' : grade === GRADES.SPECIAL ? 'text-green-600 border-green-100' : grade === GRADES.MASTER ? 'text-purple-600 border-purple-100' : ''}`}
                                                                    value={discountService.getDiscount(p.code, p.brand, googleSheetService.getDerivedPattern(p), p.model, grade)}
                                                                    onFocus={(e) => e.target.value === '0' && (e.target.value = '')}
                                                                    onBlur={(e) => e.target.value === '' && (e.target.value = '0')}
                                                                    onChange={(e) => handleCodeDiscountUpdate(p.code, grade, e.target.value)}
                                                                />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
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
