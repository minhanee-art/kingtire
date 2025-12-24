import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Share2, X, Copy, ExternalLink, Check, CheckSquare, Square, ShoppingCart, ShoppingBag, LogOut, Activity, Minus, Plus } from 'lucide-react';
import { inventoryService } from '../services/InventoryService';
import { googleSheetService } from '../services/GoogleSheetService';
import { authService, discountService } from '../services/AuthService';
import { BRAND_KO_MAP, normalizeSize, getBrandDisplayName } from '../utils/formatters';
import ProductDetailModal from './ProductDetailModal';
import ComparisonTray from './ComparisonTray';
import ComparisonModal from './ComparisonModal';

const ProductList = ({ user, onProductsLoaded, isStoreMode }) => {
    const [products, setProducts] = useState([]);
    const [dotData, setDotData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ brand: 'All', size: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'totalStock', direction: 'desc' });
    const [selectedItems, setSelectedItems] = useState([]); // Kept for API compatibility if needed elsewhere, but redirected logic
    const [cartItems, setCartItems] = useState([]); // Array of objects: { product, qty }
    const [showShareModal, setShowShareModal] = useState(false);
    const [expandedDotItems, setExpandedDotItems] = useState([]); // Track expanded DOT lists on mobile
    const [manualDiscounts, setManualDiscounts] = useState({}); // { productCode: rate }

    // Feature States
    const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);
    const [compareList, setCompareList] = useState([]);
    const [showComparisonModal, setShowComparisonModal] = useState(false);

    /**
     * Get Tailwind color classes based on DOT year
     * @param {string} dot - The DOT string (e.g., "3524")
     */
    const getDotColor = (dot) => {
        if (!dot) return 'bg-slate-100 text-slate-400 border-slate-200';

        // Extract year from strings like "3524", "DOT#1-1: 3524", "3524.42"
        const yearMatch = dot.match(/(\d{2})(\d{2})(?:\.\d+)?$/) || dot.match(/(\d{2})(\d{2})/);
        const year = yearMatch ? yearMatch[2] : '';

        switch (year) {
            case '25': return 'bg-slate-100 text-slate-600 border-slate-200'; // Stock color (Slate)
            case '24': return 'bg-red-50 text-red-600 border-red-200'; // Red
            default: return 'bg-slate-50 text-slate-400 border-slate-200';
        }
    };

    const toggleDotExpansion = (productIndex, e) => {
        e.stopPropagation(); // Prevent card selection logic
        setExpandedDotItems(prev => {
            if (prev.includes(productIndex)) {
                return prev.filter(i => i !== productIndex);
            }
            return [...prev, productIndex];
        });
    };

    const handleProductDetail = (product, e) => {
        e.stopPropagation();
        setSelectedDetailProduct(product);
    };

    const toggleCompare = (product, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setCompareList(prev => {
            const isSelected = prev.some(item => item.internalCode === product.internalCode);
            if (isSelected) {
                return prev.filter(item => item.internalCode !== product.internalCode);
            }
            if (prev.length >= 4) {
                alert("최대 4개까지만 비교 가능합니다.");
                return prev;
            }
            return [...prev, product];
        });
    };

    useEffect(() => {
        // Only clear if empty, no auto-load
        if (filter.size.trim().length === 0) {
            setProducts([]);
            setLoading(false);
        }
    }, [filter.size]);

    // Sync discountRate when store mode toggles
    useEffect(() => {
        if (products.length > 0) {
            const updated = products.map(p => ({
                ...p,
                discountRate: isStoreMode ? (p.officialDiscount || 0) : (manualDiscounts[p.internalCode] || 0)
            }));
            setProducts(updated);
        }
    }, [isStoreMode]);

    const loadData = async () => {
        setLoading(true);
        try {
            const searchSizeNorm = normalizeSize(filter.size);
            console.log(`[LoadData] Starting Sheet-First Search for: ${searchSizeNorm}`);

            // 1. Fetch Google Sheet Data (Primary Source)
            // 2. Fetch Blackcircles Inventory (Stock Source)
            const [sheetData, productData] = await Promise.all([
                googleSheetService.fetchSheetData(),
                inventoryService.fetchShopItems(filter.size)
            ]);

            // 3. Filter Sheet Data by Size and Price
            // Rule: Must match normalized size AND have factoryPrice > 0
            const filteredSheetEntries = sheetData.filter(d => {
                const sheetSizeNorm = normalizeSize(d.size);
                // match if sheet size (e.g. 2454519) matches search query
                return sheetSizeNorm.includes(searchSizeNorm) && d.factoryPrice > 0;
            });

            console.log(`[Sheet Data] Found ${filteredSheetEntries.length} matching entries in sheet.`);

            // 4. Create Stock Map from Blackcircles data
            // We've captured uniqueCode, itId, and internalCode. We match against ANY of them.
            const findInventoryMatch = (sheetCode) => {
                const sCode = String(sheetCode || '').trim();
                return productData.find(p => {
                    return String(p.partNo || '').trim() === sCode ||
                        String(p.itId || '').trim() === sCode ||
                        String(p.stId || '').trim() === sCode;
                });
            };

            // 5. Merge Sheet Data with Live Stock
            const mergedProducts = filteredSheetEntries.map(s => {
                const shopMatch = findInventoryMatch(s.code);

                // Calculate pattern-based discount (Brand + Pattern + Model)
                const gradeDiscount = discountService.getDiscount(s.code, s.brand, s.pattern, s.model, user?.grade || 'NORMAL');

                return {
                    brand: s.brand || (shopMatch?.brand),
                    model: s.model || (shopMatch?.model),
                    size: shopMatch ? shopMatch.size : s.size,
                    partNo: s.code,
                    factoryPrice: s.factoryPrice,
                    dotList: s.dotList || [],
                    totalStock: shopMatch ? shopMatch.totalStock : 0,
                    supplyPrice: shopMatch ? shopMatch.supplyPrice : 0,
                    officialDiscount: gradeDiscount,
                    discountRate: isStoreMode ? gradeDiscount : (manualDiscounts[s.code] || 0),
                    internalCode: s.code,
                    itId: shopMatch?.itId, // Ensure itId is passed for the detail modal
                    features: s.features, // Custom features (tags) from Google Sheet
                    sheetImageUrl: s.imageUrl // Custom Image URL from Google Sheet
                };
            }).filter(p => p.factoryPrice > 0);

            if (onProductsLoaded) onProductsLoaded(mergedProducts);

            console.log(`[LoadData] Final display list: ${mergedProducts.length} items.`);

            // Default Sort by Stock Descending
            const sortedProducts = [...mergedProducts].sort((a, b) => (b.totalStock || 0) - (a.totalStock || 0));

            setProducts(sortedProducts);
            setSortConfig({ key: 'totalStock', direction: 'desc' });
            setSelectedItems([]); // Clear selection when new search performed
        } catch (error) {
            console.error('Data Loading Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    /**
     * Update product pricing info (local state only)
     */
    const handlePriceUpdate = (productToUpdate, field, value) => {
        const newProducts = products.map(p => {
            if (p.internalCode === productToUpdate.internalCode) {
                let cleanValue = value;
                if (field === 'discountRate' || field === 'factoryPrice') {
                    if (value === '') {
                        cleanValue = '';
                    } else {
                        cleanValue = Number(value.toString().replace(/[^0-9.-]+/g, ""));
                    }
                }
                const updatedProduct = { ...p, [field]: cleanValue };
                // If we update discountRate manually (Store Mode OFF), save it
                if (field === 'discountRate' && !isStoreMode) {
                    setManualDiscounts(prev => ({ ...prev, [p.internalCode]: cleanValue }));
                }
                return updatedProduct;
            }
            return p;
        });
        setProducts(newProducts);
    };

    const handleManualDiscountChange = (productCode, value) => {
        const newProducts = products.map(p => {
            if (p.internalCode === productCode) {
                const discount = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
                setManualDiscounts(prev => ({ ...prev, [productCode]: discount }));
                return { ...p, discountRate: discount };
            }
            return p;
        });
        setProducts(newProducts);
    };

    const calculateFinalPrice = (product) => {
        const factoryPrice = product.factoryPrice ?? 0;
        const discountRate = product.discountRate || 0;
        return Math.floor(factoryPrice * (1 - discountRate / 100));
    };

    /**
     * Find DOT info for a product.
     * Tries to find a match in the sheet data based on Brand, Model, and Size.
     */
    const getDotForProduct = (product) => {
        if (!dotData || dotData.length === 0) return null;

        // Simple matching logic - can be refined based on actual data quality
        const match = dotData.find(d =>
            d.brand === product.brand &&
            d.model === product.model &&
            normalizeSize(d.size) === normalizeSize(product.size)
        );
        return match ? match.dot : '-';
    };

    // Filter Logic
    const filteredProducts = products.filter(p => {
        // 1. DISCONTINUED Filter (Now handled primarily at service level, but safely checked here)
        const isDiscontinued =
            (p.brand && p.brand.includes('단종')) ||
            (p.model && p.model.includes('단종'));
        if (isDiscontinued) return false;

        // 2. Brand Filter
        // USER REQUEST: Integrated Hankook + Laufenn
        // Making this matching more robust by checking both English and Korean names
        let matchBrand = filter.brand === 'All';
        if (!matchBrand) {
            const pBrandNum = p.brand.toLowerCase();
            const pBrandKo = getBrandDisplayName(p.brand);

            if (filter.brand === 'Hankook') {
                // Check for Hankook or Laufenn in various forms
                matchBrand = pBrandNum.includes('hankook') ||
                    pBrandNum.includes('laufenn') ||
                    pBrandKo.includes('한국') ||
                    pBrandKo.includes('라우펜');
            } else {
                // Check if p.brand (Eng) or its Ko name contains the filter brand (Eng) or its Ko name
                const targetBrandEng = filter.brand.toLowerCase();
                const targetBrandKo = getBrandDisplayName(filter.brand);

                matchBrand = pBrandNum.includes(targetBrandEng) ||
                    pBrandKo.includes(targetBrandKo);
            }
        }

        return matchBrand;
    });

    // Sort Logic
    if (sortConfig.key) {
        filteredProducts.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle special cases
            if (sortConfig.key === 'brand') {
                // Sort by the display name (Hangul) if sorting by brand
                aValue = getBrandDisplayName(a.brand);
                bValue = getBrandDisplayName(b.brand);
            }
            // Sort by price or stock numbers
            if (sortConfig.key === 'factoryPrice' || sortConfig.key === 'discountedPrice' || sortConfig.key === 'totalStock') {
                aValue = Number(aValue || 0);
                bValue = Number(bValue || 0);
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    const addToCart = () => {
        setCartItems(prev => {
            const newCart = [...prev];
            selectedItems.forEach(item => {
                const existingIndex = newCart.findIndex(c =>
                    c.product.partNo === item.partNo &&
                    c.product.brand === item.brand &&
                    c.product.model === item.model &&
                    c.product.size === item.size
                );
                if (existingIndex > -1) {
                    newCart[existingIndex].qty += 1; // Add 1 more if already exists
                } else {
                    newCart.push({ product: item, qty: 1 });
                }
            });
            return newCart;
        });
        setSelectedItems([]);
        alert(`${selectedItems.length}개의 품목이 장바구니에 담겼습니다.`);
    };

    const handleAddItemToCart = (product) => {
        setCartItems(prev => {
            const existingIndex = prev.findIndex(c =>
                c.product.internalCode === product.internalCode
            );
            if (existingIndex > -1) {
                const newCart = [...prev];
                newCart[existingIndex].qty += 1;
                return newCart;
            } else {
                return [...prev, {
                    product: product,
                    qty: 4, // Default to 4 as requested/common
                    discountRate: product.discountRate || 0
                }];
            }
        });
        alert(`${getBrandDisplayName(product.brand)} ${product.model}이(가) 장바구니에 담겼습니다.`);
    };

    const updateCartItemQty = (index, delta) => {
        setCartItems(prev => {
            const newCart = [...prev];
            newCart[index].qty = Math.max(1, newCart[index].qty + delta);
            return newCart;
        });
    };

    const updateCartItemDiscount = (index, value) => {
        setCartItems(prev => {
            const newCart = [...prev];
            newCart[index].discountRate = Number(value);
            return newCart;
        });
    };

    const removeFromCart = (cartItem) => {
        setCartItems(prev => prev.filter(item => item !== cartItem));
    };

    const updateCartQty = (cartItem, delta) => {
        setCartItems(prev => prev.map(item => {
            if (item === cartItem) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const clearCart = () => {
        if (window.confirm('장바구니를 모두 비우시겠습니까?')) {
            setCartItems([]);
        }
    };

    // Unified Selection (now using compareList)
    const toggleSelectItem = (product) => {
        toggleCompare(product);
    };

    const toggleSelectAll = () => {
        if (compareList.length === filteredProducts.length) {
            setCompareList([]);
        } else {
            setCompareList(filteredProducts.slice(0, 4)); // Limit to 4 for safety
        }
    };

    const isSelected = (product) => compareList.some(item => item.internalCode === product.internalCode);

    const generateShareText = () => {
        if (compareList.length === 0) return '';

        let text = `[대동타이어] 타이어 재고/단가 안내\n\n`;
        compareList.forEach((p, idx) => {
            const finalPrice = calculateFinalPrice(p);
            text += `${idx + 1}. ${getBrandDisplayName(p.brand)} ${p.model}\n`;
            text += `   규격: ${p.size}\n`;
            text += `   공장도: ${p.factoryPrice.toLocaleString()}원\n`;
            text += `   할인율: ${p.discountRate}%\n`;
            text += `   판매가: ${finalPrice.toLocaleString()}원\n`;
            text += `   재고: ${p.totalStock}개\n`;
            text += `   DOT: ${p.dotList.join(', ') || '-'}\n\n`;
        });
        text += "-----------------------------\n";
        text += "Tel. 053-254-5705\n";
        text += "기업 15207812304017 (주)대동휠앤타이어";
        return text;
    };

    const generateShareQuoteText = () => {
        if (cartItems.length === 0) return '';

        const companyName = user?.company || '대동타이어';
        let text = `[${companyName}] 타이어 견적 안내\n\n`;
        let totalSum = 0;

        cartItems.forEach((item, idx) => {
            const p = item.product;
            const disc = item.discountRate ?? p.discountRate ?? 0;
            const finalPrice = Math.floor((p.factoryPrice || 0) * (1 - disc / 100));
            const subtotal = finalPrice * item.qty;
            totalSum += subtotal;

            text += `${idx + 1}. ${getBrandDisplayName(p.brand)} ${p.model}\n`;
            text += `   규격: ${p.size}\n`;
            text += `   단가: ${finalPrice.toLocaleString()}원 (할인율: ${disc}%)\n`;
            text += `   수량: ${item.qty}개\n`;
            text += `   소계: ${subtotal.toLocaleString()}원\n\n`;
        });

        text += `총 합계금액: ${totalSum.toLocaleString()}원\n`;
        text += "-----------------------------\n";
        if (user?.bankAccount) {
            text += `${user.bankAccount}`;
        } else if (user?.grade === 'ADMIN') {
            text += "기업 15207812304017 (주)대동휠앤타이어";
        }
        return text;
    };

    const copyToClipboard = () => {
        const text = generateShareText();
        navigator.clipboard.writeText(text).then(() => {
            alert('견적 내용이 클립보드에 복사되었습니다.');
        });
    };

    const handleCopyFullText = () => {
        const text = generateShareQuoteText();
        navigator.clipboard.writeText(text).then(() => {
            alert('견적 내용이 클립보드에 복사되었습니다.');
        });
    };

    const copyAccount = () => {
        navigator.clipboard.writeText("15207812304017").then(() => {
            alert('계좌번호(기업 15207812304017)가 복사되었습니다.');
        });
    };

    const brandOptions = [
        'All',
        'Hankook',
        'Michelin',
        'Dunlop',
        'Yokohama',
        'Goodyear',
        'Kumho',
        'Pirelli',
        'Continental'
    ];

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-blue-600" />
            : <ArrowDown size={14} className="text-blue-600" />;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Premium Toolbar */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Search & Brand Group */}
                    <div className="flex flex-col sm:flex-row flex-1 gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="규격 입력 (예: 2454518)"
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-slate-400"
                                value={filter.size}
                                onChange={(e) => setFilter({ ...filter, size: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && filter.size.trim()) {
                                        loadData();
                                    }
                                }}
                            />
                        </div>

                        <select
                            className="w-full sm:w-48 pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                            value={filter.brand}
                            onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
                        >
                            {brandOptions.map(b => (
                                <option key={b} value={b} className="bg-white">
                                    {b === 'Hankook' ? '한국+라우펜' : getBrandDisplayName(b)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action Group */}
                    <div className="flex flex-row gap-2">
                        <button
                            onClick={loadData}
                            disabled={!filter.size.trim() || loading}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-[0.98]"
                        >
                            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                            <span className="whitespace-nowrap">검색하기</span>
                        </button>

                        <div className="flex gap-2">
                            {selectedItems.length > 0 && (
                                <button
                                    onClick={addToCart}
                                    className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg active:scale-95 animate-in slide-in-from-right-4"
                                    title="장바구니 담기"
                                >
                                    <ShoppingBag size={20} />
                                </button>
                            )}

                            {cartItems.length > 0 && (
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="p-3 bg-green-500 hover:bg-green-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg active:scale-95 animate-in zoom-in"
                                    title="장바구니 보기"
                                >
                                    <ShoppingCart size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] font-bold tracking-wider">
                    <div className="flex items-center gap-3 text-slate-500 uppercase">
                        <span>품목</span>
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{filteredProducts.length}</span>
                    </div>
                    <div className="text-slate-600 italic lg:block hidden">
                        * 공장도 가격이 등록된 상품만 리스팅됩니다.
                    </div>
                </div>
            </div>

            {/* Data Display */}
            <div className="relative">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-4 w-16 text-center">이미지</th>
                                <th className="px-5 py-4 cursor-pointer group" onClick={() => handleSort('brand')}>
                                    <div className="flex items-center gap-2">브랜드 <SortIcon columnKey="brand" /></div>
                                </th>
                                <th className="px-5 py-4 cursor-pointer group" onClick={() => handleSort('model')}>
                                    <div className="flex items-center gap-2">상품명 <SortIcon columnKey="model" /></div>
                                </th>
                                <th className="px-5 py-4">규격</th>
                                <th className="px-5 py-4 text-right cursor-pointer group" onClick={() => handleSort('factoryPrice')}>
                                    <div className="flex items-center justify-end gap-2 text-slate-600">공장도 <SortIcon columnKey="factoryPrice" /></div>
                                </th>
                                <th className="px-5 py-4 text-center">할인(%)</th>
                                <th className="px-5 py-4 text-right font-black text-slate-400">판매가</th>
                                <th className="px-5 py-4 text-right cursor-pointer group" onClick={() => handleSort('totalStock')}>
                                    <div className="flex items-center justify-end gap-2 text-slate-600">재고 <SortIcon columnKey="totalStock" /></div>
                                </th>
                                <th className="px-5 py-4 text-center min-w-[200px]">DOT</th>
                                <th className="px-5 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                                            <span className="text-slate-500 font-bold">데이터 동기화 중...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="py-24 text-center text-slate-500">
                                        <Search size={48} className="mx-auto mb-4 opacity-10" />
                                        <div className="font-black text-xl mb-1">데이터 없음</div>
                                        <p className="text-sm opacity-50 font-medium">검색어를 다시 확인해주세요.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((p, idx) => {
                                    const factoryPrice = p.factoryPrice ?? 0;
                                    const discountRate = p.discountRate || 0;
                                    const discountedPrice = Math.floor(factoryPrice * (1 - discountRate / 100));
                                    const selected = isSelected(p);

                                    return (
                                        <tr
                                            key={p.internalCode}
                                            onClick={() => handleProductDetail(p, { stopPropagation: () => { } })}
                                            className={`group text-center border-b border-slate-50 transition-all cursor-pointer ${selected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80 hover:scale-[1.002]'
                                                }`}
                                        >
                                            <td className="p-2">
                                                <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                                    {p.sheetImageUrl ? (
                                                        <img src={p.sheetImageUrl} alt="" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Activity size={16} className="text-slate-300" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 uppercase font-bold text-slate-700">{getBrandDisplayName(p.brand)}</td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                                                        {p.model}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                                        {p.partNo}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-black text-slate-900 group-hover:scale-105 transition-transform">{p.size}</td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className={`${isStoreMode ? 'text-[10px] text-slate-400' : 'text-xs text-blue-600'} font-bold mb-0.5 whitespace-nowrap uppercase tracking-tighter`}>
                                                        {isStoreMode ? '공장도가' : '소비자가'}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        className={`w-28 text-right bg-transparent border-none rounded px-2 py-1 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all font-black ${isStoreMode ? 'text-slate-600 text-xs' : 'text-blue-600 text-lg'}`}
                                                        value={factoryPrice ? factoryPrice.toLocaleString() : ''}
                                                        onChange={(e) => handlePriceUpdate(p, 'factoryPrice', e.target.value)}
                                                        readOnly={isStoreMode}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                                                    {isStoreMode ? (
                                                        <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                                            <span className="text-xs font-black text-blue-600">{p.officialDiscount}%</span>
                                                            <Activity size={12} className="text-blue-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 group/input">
                                                            <input
                                                                type="text"
                                                                value={p.discountRate === 0 ? '' : p.discountRate}
                                                                onFocus={(e) => e.target.select()}
                                                                onChange={(e) => handleManualDiscountChange(p.internalCode, e.target.value)}
                                                                className="w-14 text-center p-1.5 text-xs font-black border-2 border-slate-100 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-white"
                                                            />
                                                            <span className="text-xs font-black text-slate-400">%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-lg font-black text-slate-900">
                                                        {calculateFinalPrice(p).toLocaleString()}
                                                        <span className="text-xs ml-0.5">원</span>
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">판매가</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-full shadow-sm">
                                                        <span className="text-xs font-black italic">{p.totalStock}</span>
                                                        <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap justify-center gap-1.5 max-w-[150px] mx-auto">
                                                    {(p.dotList || []).map((dot, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-black border tracking-tighter ${getDotColor(dot)} transition-transform hover:scale-110 cursor-help`}
                                                            title={dot}
                                                        >
                                                            {dot.replace(/DOT#\d-\d: /, '')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={(e) => toggleCompare(p, e)}
                                                        className={`p-2 rounded-xl transition-all active:scale-90 border-2 ${compareList.some(item => item.internalCode === p.internalCode)
                                                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                            : "bg-white border-slate-100 text-slate-300 hover:border-blue-400 hover:text-blue-500"
                                                            }`}
                                                        title="비교하기에 추가"
                                                    >
                                                        <Activity size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddItemToCart(p)}
                                                        className="p-2 bg-white border-2 border-slate-100 text-slate-300 hover:border-blue-600 hover:text-blue-600 rounded-xl transition-all active:scale-90"
                                                    >
                                                        <ShoppingCart size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden p-4 space-y-4">
                    {loading ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                            <span className="text-lg font-black text-slate-500 italic">로딩 중...</span>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="py-20 text-center opacity-30">
                            <Search size={64} className="mx-auto mb-4" />
                            <div className="text-2xl font-black italic">결과 없음</div>
                        </div>
                    ) : (
                        filteredProducts.map((p, idx) => {
                            const factoryPrice = p.factoryPrice ?? 0;
                            const discountRate = p.discountRate || 0;
                            const discountedPrice = Math.floor(factoryPrice * (1 - discountRate / 100));
                            const selected = isSelected(p);

                            return (
                                <div key={p.internalCode || idx} className={`relative p-5 rounded-2xl border transition-premium overflow-hidden ${selected ? 'bg-blue-50 border-blue-200 shadow-md shadow-blue-500/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    {/* Selection Glow */}
                                    {selected && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] pointer-events-none"></div>}

                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="flex-1 flex gap-4">
                                            {/* Thumbnail */}
                                            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {p.sheetImageUrl ? (
                                                    <img src={p.sheetImageUrl} alt="" className="w-full h-full object-contain" />
                                                ) : (
                                                    <Activity size={24} className="text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="px-2.5 py-1 bg-blue-600 text-[12px] font-black text-white rounded uppercase tracking-tighter shadow-sm">{getBrandDisplayName(p.brand)}</span>
                                                </div>
                                                <div
                                                    onClick={() => handleProductDetail(p, { stopPropagation: () => { } })}
                                                    className="cursor-pointer group"
                                                >
                                                    <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{p.model}</h3>
                                                    <p className="text-sm font-mono text-slate-500 mt-1">{p.size}</p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-blue-500 underline underline-offset-2">상세 정보 보기 &raquo;</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-3">
                                            <div className="text-right">
                                                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1">재고</div>
                                                <div className={`text-2xl font-black italic ${p.totalStock > 0 ? 'text-slate-800' : 'text-red-500/70'}`}>
                                                    {p.totalStock > 0 ? p.totalStock.toLocaleString() : '품절'}
                                                </div>
                                            </div>
                                            {/* Mobile Comparison Button */}
                                            <button
                                                onClick={(e) => toggleCompare(p, e)}
                                                className={`p-2.5 rounded-xl border-2 transition-all active:scale-90 flex items-center gap-1.5 ${compareList.some(item => item.internalCode === p.internalCode)
                                                    ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                                                    : "bg-white border-slate-100 text-slate-400"
                                                    }`}
                                            >
                                                <Activity size={18} />
                                                <span className="text-[10px] font-black">비교</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100 relative z-10 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[11px] font-bold text-slate-400">
                                                {isStoreMode ? (
                                                    <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-black">소매점 할인가</span>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] text-blue-600 font-black mb-1">소비자가</span>
                                                        <span className="text-2xl font-black text-slate-900 tracking-tighter">{factoryPrice.toLocaleString()}<span className="text-sm ml-0.5">원</span></span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-baseline justify-between">
                                            <div className="flex flex-col min-w-0">
                                                {!isStoreMode && (
                                                    <span className="text-[11px] text-blue-600 font-black mb-1">할인가</span>
                                                )}
                                                <div className="flex items-baseline gap-2">
                                                    {isStoreMode && (
                                                        <span className="text-2xl font-black text-red-600 italic">{discountRate}%</span>
                                                    )}
                                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                                        {discountedPrice.toLocaleString()}
                                                        <span className="text-sm ml-1 font-bold text-slate-500">원</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={`w-20 flex items-center border rounded-lg h-9 px-2 transition-all ${isStoreMode ? 'bg-slate-50 border-slate-200' : 'bg-white border-blue-500/30 ring-2 ring-blue-500/5'}`}>
                                                <input
                                                    type="text"
                                                    value={p.discountRate === 0 ? '' : p.discountRate}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => handlePriceUpdate(p, 'discountRate', e.target.value.replace(/[^0-9]/g, ''))}
                                                    className={`w-full text-center text-xs font-black outline-none bg-transparent ${isStoreMode ? 'text-slate-400' : 'text-blue-600'}`}
                                                    readOnly={isStoreMode}
                                                />
                                                <span className="text-[10px] font-black text-slate-400 pr-1">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Bar - Moved DOT tags here, removed quantity */}
                                    <div className="mt-4 flex items-center gap-2 relative z-10">
                                        <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg h-9 px-3">
                                            <div className="flex flex-wrap gap-1 w-full overflow-hidden">
                                                {(() => {
                                                    const isExpanded = expandedDotItems.includes(idx);
                                                    const visibleDots = isExpanded ? p.dotList : p.dotList?.slice(0, 2);
                                                    const remainingCount = (p.dotList?.length || 0) - 2;

                                                    return (
                                                        <>
                                                            {visibleDots?.map((dot, i) => (
                                                                <span key={i} className={`text-[8px] px-1.5 py-0.5 rounded border ${getDotColor(dot)} font-bold whitespace-nowrap`}>
                                                                    {dot}
                                                                </span>
                                                            ))}
                                                            {!isExpanded && remainingCount > 0 && (
                                                                <button onClick={(e) => toggleDotExpansion(idx, e)} className="text-[8px] text-slate-500 font-black bg-white px-1 py-0.5 rounded border border-slate-200 shadow-sm">+{remainingCount}</button>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Sticky Mobile Add to Cart Button */}
            {selectedItems.length > 0 && (
                <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] z-40 animate-in slide-in-from-bottom-8">
                    <button
                        onClick={addToCart}
                        className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform overflow-hidden group"
                    >
                        <ShoppingBag size={24} className="group-hover:animate-bounce" />
                        <span className="text-lg">장바구니에 {selectedItems.length}개 추가</span>
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rotate-12"></div>
                    </button>
                </div>
            )}

            {!loading && filteredProducts.length > 0 && (
                <div className="p-4 border-t border-slate-800 bg-slate-900 text-center">
                    <button className="text-sm text-blue-500 font-medium hover:text-blue-400 transition-colors">
                        결과 더 보기
                    </button>
                </div>
            )}

            {/* Premium Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">견적서</h3>
                            </div>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                            {/* Interactive Adjustments */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">제품별 수량 및 할인율 조정</h4>
                                {cartItems.map((item, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[10px] font-black text-blue-600 mb-0.5">{getBrandDisplayName(item.product.brand)}</div>
                                                <div className="text-sm font-black text-slate-900 truncate">{item.product.model}</div>
                                                <div className="text-[10px] font-mono text-slate-400">{item.product.size}</div>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Qty Control */}
                                            <div className="flex-1 flex flex-col gap-1.5">
                                                <span className="text-[9px] font-black text-slate-400 uppercase ml-1">수량</span>
                                                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
                                                    <button
                                                        onClick={() => updateCartItemQty(idx, -1)}
                                                        className="p-2 hover:bg-slate-50 text-slate-500"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <input
                                                        type="text"
                                                        value={item.qty}
                                                        readOnly
                                                        className="w-full text-center text-sm font-black text-slate-900 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => updateCartItemQty(idx, 1)}
                                                        className="p-2 hover:bg-slate-50 text-slate-500"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Discount Control */}
                                            <div className="flex-1 flex flex-col gap-1.5">
                                                <span className="text-[9px] font-black text-slate-400 uppercase ml-1">할인율(%)</span>
                                                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 h-[38px]">
                                                    <input
                                                        type="text"
                                                        value={item.discountRate === 0 ? '' : item.discountRate}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => updateCartItemDiscount(idx, e.target.value)}
                                                        className="w-full text-center text-sm font-black text-blue-600 outline-none bg-transparent"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-300">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <hr className="border-slate-100" />

                            <div className="p-6 bg-slate-900 rounded-3xl border-2 border-slate-800 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Share2 size={80} className="text-white" />
                                </div>
                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">견적서 미리보기</div>
                                <pre className="text-xs font-bold text-slate-300 whitespace-pre-wrap leading-relaxed relative z-10 font-mono">
                                    {generateShareQuoteText()}
                                </pre>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleCopyFullText}
                                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
                                >
                                    <Copy size={20} />
                                    전체 내역 복사하기
                                </button>
                                <button
                                    onClick={() => setShowShareModal(false)}
                                    className="w-full py-4 text-slate-400 font-black hover:text-slate-600 transition-colors"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Feature Components */}
            {selectedDetailProduct && (
                <ProductDetailModal
                    product={selectedDetailProduct}
                    onClose={() => setSelectedDetailProduct(null)}
                    isStoreMode={isStoreMode}
                />
            )}

            <ComparisonTray
                selectedItems={compareList}
                onRemove={(code) => setCompareList(prev => prev.filter(item => item.code !== code))}
                onClear={() => setCompareList([])}
                onCompare={() => setShowComparisonModal(true)}
            />

            {showComparisonModal && (
                <ComparisonModal
                    selectedItems={compareList}
                    onClose={() => setShowComparisonModal(false)}
                />
            )}
        </div>
    );
};

export default ProductList;
