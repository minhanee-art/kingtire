import { generateProducts, generateInventory } from '../data/mockData';

class InventoryService {
    constructor() {
        this.products = [];
        this.inventory = [];
        this.initialized = false;
    }

    /**
     * Initialize the mock database
     */
    init() {
        if (this.initialized) return;

        console.log('Initializing Inventory Service...');
        // Simulate loading 120k products (scaled down to 2000 for browser performance)
        this.products = generateProducts(2000);
        this.inventory = generateInventory(this.products);
        this.initialized = true;
        console.log(`Loaded ${this.products.length} products and ${this.inventory.length} inventory records.`);
    }

    /**
     * Search products with filtering
     * @param {Object} criteria
     * @returns {Object[]} Enriched products with inventory info
     */


    /**
     * Fetch items for the Shop View.
     * Tries to fetch from the real proxy if configured, otherwise falls back to mock data.
     */
    async fetchShopItems(sizeSearch = '') {
        // Feature Flag: Set to true if you have the proxy working and want to try real fetch
        const ENABLE_REAL_FETCH = true;

        if (ENABLE_REAL_FETCH) {
            try {
                // Use the consolidated proxy endpoint (works for both local and Vercel)
                let url = '/api/inventory';
                const params = new URLSearchParams();
                if (sizeSearch) {
                    params.append('sfl', 'all'); // search all fields (standard G5)
                    params.append('stx', sizeSearch);
                }

                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                console.log(`[Shop Fetch] URL: ${url}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error('Network response was not ok');
                const text = await response.text();

                console.log(`[Shop Fetch] Received HTML (first 200 chars): ${text.substring(0, 200)}...`);

                // Check if response is actually a login page (common issue with proxies)
                // However, stock_list_option.php returns HTML table on success
                if (text.includes('login') || text.includes('로그인') || (text.includes('<!DOCTYPE html>') && !text.includes('<table'))) {
                    console.warn("API returned login page. Falling back to mock data.");
                    return this.generateMockShopData();
                }

                const parsedData = this.parseShopData(text);
                // Return whatever the API gave us (empty if no valid items)
                return parsedData;

            } catch (err) {
                console.warn("Real fetch failed or timed out:", err);
                return []; // Return empty instead of mock if it actually fails
            }
        }

        // Only use mock data if real fetch is explicitly disabled
        return this.generateMockShopData();
    }

    generateMockShopData() {
        return new Promise(resolve => {
            setTimeout(() => {
                const shopData = this.products.map(p => {
                    const productInv = this.inventory.filter(i => i.productId === p.id);
                    const totalStock = productInv.reduce((sum, item) => sum + item.stockQty, 0);
                    return {
                        brand: p.brand,
                        model: p.model,
                        size: p.size,
                        partNo: `THH${Math.floor(Math.random() * 9000000) + 1000000}`, // Mock Unique Code format
                        type: p.type,
                        totalStock: totalStock,
                        apiPrice: 0, // Initialize mock with 0
                        factoryPrice: 0, // Initialize mock with 0
                        discountRate: 0
                    };
                });
                resolve(shopData);
            }, 600);
        });
    }

    parseShopData(responseBody) {
        console.log("Parsing API Response (stock_list_option) with Dynamic Header Detection...");

        const parser = new DOMParser();
        const doc = parser.parseFromString(responseBody, 'text/html');
        const rows = Array.from(doc.querySelectorAll('table.stock-list_table tr'));

        if (rows.length === 0) {
            console.warn("No rows found in HTML response");
            return [];
        }

        // Helper to get text or input value
        const getValue = (col) => {
            if (!col) return '';
            const input = col.querySelector('input[type="text"]');
            if (input) return input.value.trim();
            return col.textContent.trim();
        };

        const getText = (col) => col ? col.textContent.trim() : '';

        // Detect Offset: If first column is a checkbox or empty, shift everything by 1
        const firstHeader = rows[0].querySelector('th, td');
        const hasCheckbox = firstHeader && (firstHeader.querySelector('input[type="checkbox"]') || getText(firstHeader) === '');
        const offset = hasCheckbox ? 1 : 0;

        console.log(`[Parser] Offset detected: ${offset} (Checkbox: ${hasCheckbox})`);

        // Exact indices based on User's 15-column map (1-based + offset)
        const getIdx = (n) => (n - 1) + offset;

        // Step 2: Parse Rows
        const parsedItems = rows.slice(1).map((row) => {
            const cols = Array.from(row.querySelectorAll('td'));
            if (cols.length < 5) return null;

            // 1. DISCONTINUED CHECK (15th Column)
            const statusText = getText(cols[getIdx(15)]);
            if (statusText.includes('단종') || row.textContent.includes('단종')) return null;

            // 2. DATA EXTRACTION
            const rawBrand = getText(cols[getIdx(1)]);
            const rawModel = getText(cols[getIdx(2)]);
            const rawSize = getText(cols[getIdx(4)]); // Detailed Size: 4th Col

            // 3. CODE CAPTURE (Multi-Source for Robust Matching)
            // 5th Col (Index 4+off) is '고유코드'
            const uniqueCodeCol = cols[getIdx(5)];
            const uniqueCodeInput = uniqueCodeCol ? uniqueCodeCol.querySelector('input') : null;
            const uniqueCode = (uniqueCodeInput ? uniqueCodeInput.value : getText(uniqueCodeCol)).trim();

            // Also search all inputs in the row for hidden IDs (it_id, st_id)
            let itId = '';
            let stId = '';
            row.querySelectorAll('input').forEach(input => {
                const name = input.name || '';
                if (name.includes('it_id')) itId = input.value.trim();
                if (name.includes('st_id')) stId = input.value.trim();
            });

            const stockQty = Number(getText(cols[getIdx(9)]).replace(/[^0-9]/g, '')) || 0;
            const supplyPrice = Number(getValue(cols[getIdx(10)]).replace(/[^0-9]/g, '')) || 0;

            if (!uniqueCode && !itId) return null;

            return {
                brand: rawBrand,
                model: rawModel,
                size: rawSize, // This contains Speed/Load/Origin as requested
                partNo: uniqueCode, // Match Key for Sheet
                itId: itId,
                stId: stId,
                internalCode: getText(cols[getIdx(3)]), // 3rd Column (Part No)
                supplyPrice: supplyPrice,
                factoryPrice: 0,
                totalStock: stockQty,
                discountRate: 0,
                type: ''
            };
        }).filter(item => item !== null);

        console.log(`[Parser] Successfully parsed ${parsedItems.length} items from shop.`);
        const uniqueItems = [];
        const seen = new Set();

        parsedItems.forEach(item => {
            const key = `${item.brand}-${item.model}-${item.size}-${item.partNo}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueItems.push(item);
            }
        });

        return uniqueItems;
    }

    /**
     * Search products with filtering
         * @param {Object} criteria
         * @returns {Object[]} Enriched products with inventory info
         */
    search(criteria = {}) {
        const { query, brand, type, season } = criteria;
        const lowerQuery = query?.toLowerCase() || '';

        return this.products.filter(p => {
            const matchesQuery = !lowerQuery ||
                p.size.includes(lowerQuery) ||
                p.model.toLowerCase().includes(lowerQuery) ||
                p.brand.toLowerCase().includes(lowerQuery);

            const matchesBrand = !brand || brand === 'All' || p.brand === brand;
            const matchesType = !type || type === 'All' || p.type === type;
            const matchesSeason = !season || season === 'All' || p.season === season;

            return matchesQuery && matchesBrand && matchesType && matchesSeason;
        }).map(product => {
            // Attach inventory summary
            const productInv = this.inventory.filter(i => i.productId === product.id);
            const storeStock = productInv.find(i => i.type === 'store')?.stockQty || 0;
            const warehouseStock = productInv.find(i => i.type === 'warehouse')?.stockQty || 0;
            const price = productInv[0]?.cost ? Math.round(productInv[0].cost * 1.2) : 0; // Retail price = Cost * 1.2

            return {
                ...product,
                storeStock,
                warehouseStock,
                price,
                totalStock: storeStock + warehouseStock
            };
        }).sort((a, b) => {
            // Smart Recommendation: Sort by Store Stock desc, then Price asc
            if (a.storeStock !== b.storeStock) return b.storeStock - a.storeStock;
            return a.price - b.price;
        });
    }

    /**
     * Simulate placing an order
     * @param {string} productId 
     * @param {number} qty 
     * @param {'store' | 'warehouse'} source 
     */
    placeOrder(productId, qty, source) {
        const record = this.inventory.find(i => i.productId === productId && i.type === source);
        if (!record) throw new Error('Inventory record not found');
        if (record.stockQty < qty) throw new Error('Insufficient stock');

        record.stockQty -= qty;

        // Check Reorder Point
        if (record.stockQty <= record.reorderPoint) {
            console.warn(`[ALERT] Low stock for ${productId} at ${source}. Current: ${record.stockQty}, Reorder Point: ${record.reorderPoint}`);
            // In a real app, this would trigger an automatic PO
        }

        return true;
    }

    /**
     * USER REQUEST: Fetch factory prices from shop/list.php (via AJAX)
     * This helps fill in missing factory prices that are not in the Google Sheet.
     */
    async fetchFactoryPrices(sizeSearch) {
        try {
            const params = new URLSearchParams();
            params.append('stx', sizeSearch);
            params.append('ca_id', '10'); // Default tire category
            params.append('srch_type', 'tire');

            const response = await fetch('/api/shop_ajax', {
                method: 'POST',
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (!response.ok) return {};

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const items = doc.querySelectorAll('.product_list_wrap');

            const priceMap = {}; // Key: "model|size", Value: Price

            items.forEach(item => {
                // The list_more.php returns HTML chunks with items
                // Using .title for model and .english_title_box span for size
                // .sub_price contains the factory price
                const model = item.querySelector('.title')?.textContent?.trim();
                const size = item.querySelector('.english_title_box span')?.textContent?.trim();
                const priceText = item.querySelector('.sub_price')?.textContent?.trim();

                if (model && size && priceText) {
                    const cleanPrice = Number(priceText.replace(/[^0-9]/g, ''));
                    // Normalize the key: remove non-alphanumeric, lowercase
                    const normModel = model.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const normSize = size.replace(/[^0-9]/g, '');
                    const key = `${normModel}|${normSize}`;
                    priceMap[key] = cleanPrice;
                    console.log(`[Scraper] Found Shop Price: ${model} ${size} -> ${cleanPrice} (Key: ${key})`);
                }
            });

            return priceMap;
        } catch (error) {
            console.error("Failed to fetch shop prices:", error);
            return {};
        }
    }

    /**
     * Fetch product details (image, description, etc) from Blackcircles item page.
     * @param {string|number} itId - Blackcircles item ID
     * @param {string} [sheetImageUrl] - Optional custom image URL from Google Sheet
     */
    async fetchProductDetails(itId, sheetImageUrl = '') {
        if (!itId) {
            if (sheetImageUrl) {
                return {
                    title: '제품 상세',
                    imageUrl: sheetImageUrl,
                    description: '상품 상세 정보가 준비 중입니다.',
                    performance: { dryGrip: 8.5, wetGrip: 8.5, noise: 8.5, comfort: 8.5, braking: 8.5, mileage: 8.5 },
                    rating: 5.0,
                    reviewCount: 0,
                    season: '',
                    type: ''
                };
            }
            return null;
        }

        try {
            // itId could be a number or string like '1629075164'
            const response = await fetch(`/api/shop_item?it_id=${itId}`);
            if (!response.ok) throw new Error('Failed to fetch item details');

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Extraction based on research
            const title = doc.querySelector('h1, .title')?.textContent?.trim() || '';
            const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

            // Look for JSON-LD for rich snippets (common in G5/Shop)
            let jsonLd = {};
            try {
                const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    const data = JSON.parse(script.textContent);
                    if (data['@type'] === 'Product') {
                        jsonLd = data;
                        break;
                    }
                }
            } catch (e) {
                console.warn("Failed to parse JSON-LD", e);
            }

            const imageUrl = jsonLd.image || doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
            const longDescription = jsonLd.description || doc.querySelector('.it_explan, #it_explan')?.textContent?.trim() || description;

            // Extract badges (Season, Type, etc)
            const badges = [];
            doc.querySelectorAll('.brand_wrap .box, .it_opt_box .box').forEach(el => {
                const text = el.textContent.trim();
                if (text) badges.push(text);
            });

            // Specific extractions for UI mapping
            const season = badges.find(b => b.includes('계절')) || (longDescription.includes('사계절') ? '사계절용' : '');
            const type = badges.find(b => b.includes('승용차') || b.includes('SUV') || b.includes('컴포트') || b.includes('스포츠')) || '';

            // Performance data mapping (Extracted from customer reviews)
            const performance = {
                dryGrip: 8.5, // Fallbacks
                wetGrip: 8.0,
                noise: 8.5,
                comfort: 8.5,
                braking: 8.5,
                mileage: 8.5
            };

            const reviewItems = doc.querySelectorAll('.review-items-point .review_wrap');
            if (reviewItems.length > 0) {
                reviewItems.forEach(item => {
                    const label = item.querySelector('li:first-child')?.textContent?.trim();
                    const score = parseFloat(item.querySelector('.tot_sub_score')?.getAttribute('data-score')) || 0;

                    // Multiply by 2 to convert 5-point scale to 10-point scale for UI consistency
                    const scaledScore = score * 2;

                    if (label === '정숙성') performance.noise = scaledScore;
                    if (label === '승차감') performance.comfort = scaledScore;
                    if (label === '핸들링') performance.dryGrip = scaledScore; // Mapping Handling to dryGrip for existing UI
                    if (label === '제동력') performance.braking = scaledScore;
                    if (label === '빗길제동') performance.wetGrip = scaledScore;
                    if (label === '마일리지') performance.mileage = scaledScore;
                });
            }

            // Characteristics (Icons) mapping based on description keywords
            const characteristics = [];
            const keywords = {
                '정숙성': ['정숙', '소음', '조용한'],
                '핸들링': ['핸들링', '조종', '응답'],
                '제동력': ['제동', '브레이크', '멈춤'],
                '마모방지': ['마모', '수명', '마일리지'],
                '주행안정성': ['안정', '고속', '밸런스'],
                '사계절': ['사계절', '올시즌'],
                '고급형': ['고급', '프리미엄', '럭셔리'],
                '데일리': ['데일리', '일상', '도심'],
                '접지력': ['접지', '그립'],
                '럭셔리투어링': ['투어링', '장거리']
            };

            Object.entries(keywords).forEach(([key, matches]) => {
                if (matches.some(m => longDescription.includes(m))) {
                    characteristics.push(key);
                }
            });

            // Local Image Priority
            const localImagePath = `/src/assets/images/${title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;

            return {
                title: title || jsonLd.name,
                imageUrl: sheetImageUrl || localImagePath || imageUrl,
                remoteImageUrl: imageUrl,
                description: longDescription,
                rating: jsonLd.aggregateRating?.ratingValue || 4.5,
                reviewCount: jsonLd.aggregateRating?.reviewCount || 100,
                performance,
                characteristics: characteristics.length > 0 ? characteristics : ['데일리', '주행안정성'], // Fallback
                season,
                type
            };

        } catch (error) {
            console.error("Failed to fetch product details:", error);
            return null;
        }
    }
}

export const inventoryService = new InventoryService();
