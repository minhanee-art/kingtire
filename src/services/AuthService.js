import { supabase } from './supabaseClient';
import Papa from 'papaparse';

// Simple local ID generator
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// Simple mock storage keys
const USERS_KEY = 'kingtire_users';
const DISCOUNTS_KEY = 'kingtire_discounts';
const SESSION_KEY = 'kingtire_session';

// Membership Grades
export const GRADES = {
    PENDING: 'PENDING',
    G3: '3',
    G4: '4',
    G5: '5',
    SPECIAL: 'SPECIAL',
    MASTER: 'MASTER',
    ADMIN: 'ADMIN'
};

class AuthService {
    constructor() {
        this.users = JSON.parse(localStorage.getItem(USERS_KEY)) || [
            {
                id: 'admin-id',
                email: 'admin@kingtire.com',
                password: 'admin',
                company: '대동타이어',
                ceo: '관리자',
                contact: '010-0000-0000',
                businessNumber: '123-45-67890',
                bankAccount: '기업 15207812304017 (주)대동휠앤타이어',
                grade: GRADES.ADMIN,
                isApproved: true
            }
        ];
        this.currentUser = JSON.parse(localStorage.getItem(SESSION_KEY)) || null;

        // Initialize state from Supabase if available
        if (supabase) {
            this.syncFromSupabase();
        }
    }

    async syncFromSupabase() {
        try {
            const { data, error } = await supabase.from('users').select('*');
            if (error) throw error;
            if (data && data.length > 0) {
                this.users = data;
                this._saveUsers();
            }
        } catch (err) {
            console.warn('Failed to sync users from Supabase:', err.message);
        }
    }

    _saveUsers() {
        localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    }

    _saveSession() {
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
    }

    async signup(userData) {
        const newUser = {
            id: generateId(),
            ...userData,
            grade: GRADES.PENDING,
            isApproved: false,
            createdAt: new Date().toISOString()
        };

        if (supabase) {
            const { error } = await supabase.from('users').insert([newUser]);
            if (error) throw error;
        }

        this.users.push(newUser);
        this._saveUsers();
        return newUser;
    }

    async login(email, password) {
        let user;
        const lastLogin = new Date().toISOString();

        if (supabase) {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();

            if (error && error.code !== 'PGRST116') throw new Error('로그인 중 오류가 발생했습니다.');
            user = data;

            if (user) {
                // Background update for lastLogin
                supabase.from('users').update({ lastLogin }).eq('id', user.id).then(({ error }) => {
                    if (error) console.error('Failed to update last login:', error);
                });
            }
        } else {
            user = this.users.find(u => u.email === email && u.password === password);
        }

        if (user) {
            user.lastLogin = lastLogin;
            this.currentUser = user;

            // Also update the local cached user list
            const localUserIndex = this.users.findIndex(u => u.id === user.id);
            if (localUserIndex !== -1) {
                this.users[localUserIndex] = { ...this.users[localUserIndex], lastLogin };
            }

            this._saveUsers();
            this._saveSession();
            return user;
        }
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    logout() {
        this.currentUser = null;
        this._saveSession();
    }

    getUsers() {
        return this.users;
    }

    async updateUserGrade(userId, newGrade) {
        if (supabase) {
            const { error } = await supabase
                .from('users')
                .update({ grade: newGrade, isApproved: true })
                .eq('id', userId);
            if (error) throw error;
        }

        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.grade = newGrade;
            user.isApproved = true;
            this._saveUsers();
            if (this.currentUser?.id === userId) {
                this.currentUser = { ...user };
                this._saveSession();
            }
        }
    }

    async deleteUser(userId) {
        if (supabase) {
            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) throw error;
        }

        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
            this.users.splice(index, 1);
            this._saveUsers();
            if (this.currentUser?.id === userId) {
                this.logout();
            }
            return true;
        }
        return false;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async changePassword(oldPassword, newPassword) {
        if (!this.currentUser) throw new Error('로그인이 필요합니다.');

        if (supabase) {
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('password')
                .eq('id', this.currentUser.id)
                .single();

            if (fetchError || user.password !== oldPassword) {
                throw new Error('현재 비밀번호가 일치하지 않습니다.');
            }

            const { error: updateError } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('id', this.currentUser.id);
            if (updateError) throw updateError;
        }

        const user = this.users.find(u => u.id === this.currentUser.id);
        if (!user || user.password !== oldPassword) {
            throw new Error('현재 비밀번호가 일치하지 않습니다.');
        }

        user.password = newPassword;
        this.currentUser.password = newPassword;
        this._saveUsers();
        this._saveSession();
        return true;
    }

    async updateProfile(updatedData) {
        if (!this.currentUser) throw new Error('로그인이 필요합니다.');

        if (supabase) {
            const { error } = await supabase
                .from('users')
                .update(updatedData)
                .eq('id', this.currentUser.id);
            if (error) throw error;
        }

        const index = this.users.findIndex(u => u.id === this.currentUser.id);
        if (index === -1) throw new Error('사용자를 찾을 수 없습니다.');

        this.users[index] = { ...this.users[index], ...updatedData };
        this.currentUser = { ...this.currentUser, ...updatedData };
        this._saveUsers();
        this._saveSession();
        return this.currentUser;
    }
}

class DiscountService {
    constructor() {
        this.discounts = JSON.parse(localStorage.getItem(DISCOUNTS_KEY)) || {};
        this.csvRates = new Map(); // Store CSV based rates
        this.isCsvLoaded = false;

        if (supabase) {
            this.syncFromSupabase();
        }
        // Immediately try to load CSV
        this.loadCsvData();
    }

    async loadCsvData() {
        if (this.isCsvLoaded) return;

        try {
            console.log('Fetching Discount CSV data...');
            const response = await fetch('/251225_all_code.csv');
            if (!response.ok) throw new Error('Failed to fetch CSV');
            const csvText = await response.text();

            // Simple parser if Papa isn't available or just use Papa
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data) {
                        results.data.forEach(row => {
                            // Normalize keys
                            const code = (row['code'] || '').trim();
                            if (code) {
                                this.csvRates.set(code, {
                                    price3: row['price3'],
                                    price4: row['price4'],
                                    price5: row['price5'],
                                    Special: row['Special']
                                });
                            }
                        });
                        this.isCsvLoaded = true;
                        console.log(`[DiscountService] Loaded ${this.csvRates.size} discount rules from CSV.`);
                    }
                }
            });
        } catch (e) {
            console.error('Failed to load discount CSV:', e);
        }
    }

    async syncFromSupabase() {
        try {
            const { data, error } = await supabase.from('discounts').select('*');
            if (error) throw error;
            if (data) {
                const discountMap = {};
                data.forEach(item => {
                    discountMap[item.key] = item.rates;
                });
                this.discounts = discountMap;
                this._saveDiscounts();
            }
        } catch (err) {
            console.warn('Failed to sync discounts from Supabase:', err.message);
        }
    }

    async _saveToSupabase(key, rates) {
        if (!supabase) return;
        try {
            const { error } = await supabase
                .from('discounts')
                .upsert({ key, rates }, { onConflict: 'key' });
            if (error) throw error;
        } catch (err) {
            console.error('Supabase discount save failed:', err.message);
        }
    }

    _saveDiscounts() {
        localStorage.setItem(DISCOUNTS_KEY, JSON.stringify(this.discounts));
    }

    async setPatternDiscount(brand, pattern, model, grade, rate) {
        const key = `${brand}|${pattern}`;
        if (!this.discounts[key]) {
            this.discounts[key] = {};
        }
        this.discounts[key][grade] = Number(rate);
        this._saveDiscounts();
        await this._saveToSupabase(key, this.discounts[key]);
    }

    async setSizeDiscount(size, grade, rate) {
        const key = `SIZE|${size}`;
        if (!this.discounts[key]) {
            this.discounts[key] = {};
        }
        this.discounts[key][grade] = Number(rate);
        this._saveDiscounts();
        await this._saveToSupabase(key, this.discounts[key]);
    }

    getSizeDiscount(size, grade) {
        const key = `SIZE|${size}`;
        return this.discounts[key]?.[grade] || 0;
    }

    getPatternDiscount(brand, pattern, model, grade) {
        const key = `${brand}|${pattern}`;
        return this.discounts[key]?.[grade] || 0;
    }

    async setCodeDiscount(code, grade, rate) {
        if (!this.discounts[code]) {
            this.discounts[code] = {};
        }
        this.discounts[code][grade] = Number(rate);
        this._saveDiscounts();
        await this._saveToSupabase(code, this.discounts[code]);
    }

    getDiscount(productCode, brand, pattern, model, grade, sizeStr = '') {
        // 1. Check CSV Rates first (User Request Priority)
        if (this.isCsvLoaded && this.csvRates.has(productCode)) {
            const rates = this.csvRates.get(productCode);
            let rate = 0;

            // Mapping: price3=3, price4=4, price5=5/MASTER, special=SPECIAL/ADMIN
            switch (grade) {
                case GRADES.G3:
                    rate = rates.price3;
                    break;
                case GRADES.G4:
                    rate = rates.price4;
                    break;
                case GRADES.G5:
                case GRADES.MASTER:
                    rate = rates.price5;
                    break;
                case GRADES.SPECIAL:
                case GRADES.ADMIN: // Assuming Admin gets Special rate
                    rate = rates.Special;
                    break;
                default:
                    // For others or pending, maybe 0 or check standard discounts
                    break;
            }

            if (rate) {
                // Ensure we return a number
                return parseFloat(rate);
            }
        }

        // 2. Fallback to existing manual overrides logic
        if (this.discounts[productCode]?.[grade] !== undefined) {
            return this.discounts[productCode][grade];
        }

        const key = `${brand}|${pattern}`;
        if (this.discounts[key]?.[grade] !== undefined) {
            return this.discounts[key][grade];
        }

        const sizeInput = sizeStr || productCode;
        const sizeKey = `SIZE|${String(sizeInput || '').replace(/[^0-9]/g, '')}`;
        if (this.discounts[sizeKey]?.[grade] !== undefined) {
            return this.discounts[sizeKey][grade];
        }

        const modelKey = `${brand}|${model}`;
        if (this.discounts[modelKey]?.[grade] !== undefined) {
            return this.discounts[modelKey][grade];
        }

        return 0;
    }

    getAllDiscounts() {
        return this.discounts;
    }
}

export const authService = new AuthService();
export const discountService = new DiscountService();
