import Papa from 'papaparse';

// Consolidated Sheet URL from User (Corrected to output CSV)
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTHpRh8_kaiBQQaXE0i8nz2tH8uAwm1I1oS6hHQF87C5-LrlDcNTbRKN5xCVeEtbgro8pA2LAjRgT8V/pub?gid=903841373&single=true&output=csv';

// Cache configuration
let cachedSheetData = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000;
let sizeIndex = new Map(); // Store products grouped by normalized size for O(1) lookups

/**
 * Service to fetch Data (Price, DOT, Info) from Google Sheets
 */
export const googleSheetService = {
    /**
     * Fetches all product data from the configured Google Sheet CSV.
     * Uses in-memory caching to improve performance.
     */
    fetchSheetData: async (forceRefresh = false) => {
        const now = Date.now();
        if (!forceRefresh && cachedSheetData && (now - lastFetchTime < CACHE_TTL)) {
            return cachedSheetData;
        }

        try {
            console.log('Fetching Google Sheet data from network...');
            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            const csvText = await response.text();

            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.data && results.data.length > 0) {
                            console.log('[Sheet] Available Headers:', Object.keys(results.data[0]));
                        }
                        const parsedData = results.data.map(row => {
                            // Normalize keys to lowercase for easier matching
                            const normalizedRow = {};
                            Object.entries(row).forEach(([k, v]) => {
                                normalizedRow[k.toLowerCase().trim()] = v;
                            });

                            // Extract Key Fields
                            const code = (normalizedRow['code'] || normalizedRow['코드'] || normalizedRow['고유코드']) ? String(normalizedRow['code'] || normalizedRow['코드'] || normalizedRow['고유코드']).trim() : '';
                            const size = (normalizedRow['size'] || normalizedRow['규격'] || normalizedRow['규격/사이즈']) ? String(normalizedRow['size'] || normalizedRow['규격'] || normalizedRow['규격/사이즈']).trim() : '';
                            const brand = (normalizedRow['brand'] || normalizedRow['브랜드'] || normalizedRow['제조사']) ? String(normalizedRow['brand'] || normalizedRow['브랜드'] || normalizedRow['제조사']).trim() : '';
                            const model = (normalizedRow['model'] || normalizedRow['상품명'] || normalizedRow['모델명']) ? String(normalizedRow['model'] || normalizedRow['상품명'] || normalizedRow['모델명']).trim() : '';
                            const pattern = (normalizedRow['pattern'] || normalizedRow['patten'] || normalizedRow['패턴']) ? String(normalizedRow['pattern'] || normalizedRow['patten'] || normalizedRow['패턴']).trim() : '';
                            const priceCol = normalizedRow['factory price'] || normalizedRow['공장도'] || normalizedRow['공장도가'] || normalizedRow['공장'] || normalizedRow['price'];
                            const price = priceCol ? String(priceCol).replace(/[^0-9]/g, '') : '0';
                            const features = normalizedRow['features'] || normalizedRow['특징'] || normalizedRow['구분'] || '';

                            let imageUrl = '';
                            Object.keys(normalizedRow).forEach(key => {
                                if (key.includes('image') || key.includes('이미지') || key === 'img' || key === 'photo') {
                                    imageUrl = String(normalizedRow[key] || '').trim();
                                }
                            });

                            // Ensure it's a valid link format
                            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/') && !imageUrl.startsWith('data:')) {
                                imageUrl = '';
                            }

                            // Extract DOT columns (e.g., "DOT #1-1", "DOT #1-2" ... "DOT #1-9")
                            const dotList = [];
                            Object.keys(row).forEach(key => {
                                if (key.includes('#')) {
                                    const val = row[key] ? row[key].trim() : '';
                                    // Clean up label: "DOT #1-1" -> "#1-1"
                                    const label = key.replace('DOT ', '').trim();
                                    if (val && val !== '0' && val !== '-') {
                                        dotList.push(`${label}: ${val}`);
                                    }
                                }
                            });

                            // Pre-normalize size for performance
                            const normSize = size.replace(/[^0-9]/g, '');

                            return {
                                code: code,
                                size: size,
                                normSize: normSize, // Added for optimization
                                brand: brand,
                                model: model,
                                pattern: pattern,
                                factoryPrice: Number(price),
                                dotList: dotList,
                                features: features ? features.split(',').map(f => f.trim()) : [],
                                imageUrl: imageUrl.trim()
                            };
                        });

                        console.log(`[DEBUG] Google Sheet: Parsed ${parsedData.length} rows.`);
                        if (parsedData.length > 0) {
                            console.log('[DEBUG] First row sample:', parsedData[0]);
                        }

                        // Update Cache
                        cachedSheetData = parsedData;
                        lastFetchTime = now;

                        // Build Size Index (References to existing objects to save memory)
                        const newSizeIndex = new Map();
                        parsedData.forEach(p => {
                            if (!newSizeIndex.has(p.normSize)) {
                                newSizeIndex.set(p.normSize, []);
                            }
                            newSizeIndex.get(p.normSize).push(p);
                        });
                        sizeIndex = newSizeIndex;

                        resolve(parsedData);
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            });
        } catch (error) {
            console.error('Error fetching Google Sheet data:', error);
            // Return cached data if available even if expired on error
            if (cachedSheetData) return Promise.resolve(cachedSheetData);
            return [];
        }
    },

    getDerivedPattern: (row) => {
        if (!row) return 'Unknown';

        const isSizeLike = (word) => {
            return word.includes('/') || /^\d{7}$/.test(word) || /^[0-9]+R[0-9]+$/.test(word) || /\d+인치/.test(word);
        };

        const words = (row.model || '').trim().split(/\s+/);
        // Filter out size-like components to get a cleaner pattern name
        const modelWords = words.filter(w => !isSizeLike(w));

        // Strict 2-word grouping as requested: prioritize model-based derivation
        if (modelWords.length >= 2) return `${modelWords[0]} ${modelWords[1]}`;
        return modelWords[0] || 'Unknown';
    },

    /**
     * Fast lookup from index by normalized size string.
     */
    getBySize: (sizeStr) => {
        const norm = (sizeStr || '').replace(/[^0-9]/g, '');
        return sizeIndex.get(norm) || [];
    },

    /**
     * Purge all cached data to free memory.
     */
    purgeCache: () => {
        cachedSheetData = null;
        sizeIndex.clear();
        lastFetchTime = 0;
        console.log('[Sheet] Cache purged');
    }
};
