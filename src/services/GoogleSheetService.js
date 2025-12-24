import Papa from 'papaparse';

// Consolidated Sheet URL from User (Corrected to output CSV)
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTHpRh8_kaiBQQaXE0i8nz2tH8uAwm1I1oS6hHQF87C5-LrlDcNTbRKN5xCVeEtbgro8pA2LAjRgT8V/pub?gid=903841373&single=true&output=csv';

// Cache configuration
let cachedSheetData = null;
let lastFetchTime = 0;
const CACHE_TTL = 1 * 60 * 1000; // 1 minute in milliseconds

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
            console.log('Serving Google Sheet data from cache');
            return Promise.resolve(cachedSheetData);
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
                            const code = (normalizedRow['code'] || normalizedRow['코드']) ? String(normalizedRow['code'] || normalizedRow['코드']).trim() : '';
                            const size = (normalizedRow['size'] || normalizedRow['규격']) ? String(normalizedRow['size'] || normalizedRow['규격']).trim() : '';
                            const brand = (normalizedRow['brand'] || normalizedRow['브랜드']) ? String(normalizedRow['brand'] || normalizedRow['브랜드']).trim() : '';
                            const model = (normalizedRow['model'] || normalizedRow['상품명']) ? String(normalizedRow['model'] || normalizedRow['상품명']).trim() : '';
                            const pattern = (normalizedRow['pattern'] || normalizedRow['patten'] || normalizedRow['패턴']) ? String(normalizedRow['pattern'] || normalizedRow['patten'] || normalizedRow['패턴']).trim() : '';
                            const price = (normalizedRow['factory price'] || normalizedRow['공장도'] || normalizedRow['price']) ? String(normalizedRow['factory price'] || normalizedRow['공장도'] || normalizedRow['price']).replace(/[^0-9]/g, '') : '0';
                            const features = normalizedRow['features'] || normalizedRow['특징'] || '';

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

                            return {
                                code: code,
                                size: size,
                                brand: brand,
                                model: model,
                                pattern: pattern,
                                factoryPrice: Number(price),
                                dotList: dotList,
                                features: features ? features.split(',').map(f => f.trim()) : [],
                                imageUrl: imageUrl.trim()
                            };
                        });

                        // Update Cache
                        cachedSheetData = parsedData;
                        lastFetchTime = Date.now();

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
    }
};
