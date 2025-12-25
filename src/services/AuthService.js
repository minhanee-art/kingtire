// Simple local ID generator since npm install failed
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
    }

    _saveUsers() {
        localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    }

    _saveSession() {
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
    }

    signup(userData) {
        const newUser = {
            id: generateId(),
            ...userData,
            grade: GRADES.PENDING,
            isApproved: false,
            createdAt: new Date().toISOString()
        };
        this.users.push(newUser);
        this._saveUsers();
        return newUser;
    }

    login(email, password) {
        const user = this.users.find(u => u.email === email && u.password === password);
        if (user) {
            this.currentUser = user;
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

    updateUserGrade(userId, newGrade) {
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

    deleteUser(userId) {
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

    changePassword(oldPassword, newPassword) {
        if (!this.currentUser) throw new Error('로그인이 필요합니다.');

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

    updateProfile(updatedData) {
        if (!this.currentUser) throw new Error('로그인이 필요합니다.');

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
    }

    _saveDiscounts() {
        localStorage.setItem(DISCOUNTS_KEY, JSON.stringify(this.discounts));
    }

    // Set discount for a specific pattern (brand|pattern)
    setPatternDiscount(brand, pattern, model, grade, rate) {
        const key = `${brand}|${pattern}`;
        if (!this.discounts[key]) {
            this.discounts[key] = {};
        }
        this.discounts[key][grade] = Number(rate);
        this._saveDiscounts();
    }

    // Set discount for a specific size (SIZE|normalizedSize)
    setSizeDiscount(size, grade, rate) {
        const key = `SIZE|${size}`;
        if (!this.discounts[key]) {
            this.discounts[key] = {};
        }
        this.discounts[key][grade] = Number(rate);
        this._saveDiscounts();
    }

    // Get discount for a size
    getSizeDiscount(size, grade) {
        const key = `SIZE|${size}`;
        return this.discounts[key]?.[grade] || 0;
    }

    // Get discount for a pattern
    getPatternDiscount(brand, pattern, model, grade) {
        // Only return 0 if it's literally not set, but allow ADMIN/MASTER to have discounts if set in DB
        const key = `${brand}|${pattern}`;
        return this.discounts[key]?.[grade] || 0;
    }

    // Set discount for a specific product code (highest priority)
    setCodeDiscount(code, grade, rate) {
        if (!this.discounts[code]) {
            this.discounts[code] = {};
        }
        this.discounts[code][grade] = Number(rate);
        this._saveDiscounts();
    }

    // Legacy/Core method updated for new pattern key
    getDiscount(productCode, brand, pattern, model, grade, sizeStr = '') {
        // Priority 1: Specific product code discount (if exists)
        if (this.discounts[productCode]?.[grade] !== undefined) {
            return this.discounts[productCode][grade];
        }

        // Priority 2: Pattern-based discount (brand|pattern)
        const key = `${brand}|${pattern}`;
        if (this.discounts[key]?.[grade] !== undefined) {
            return this.discounts[key][grade];
        }

        // Priority 3: Size-based discount (SIZE|normalizedSize)
        const sizeInput = sizeStr || productCode; // fallback if size not provided
        const sizeKey = `SIZE|${String(sizeInput || '').replace(/[^0-9]/g, '')}`;
        if (this.discounts[sizeKey]?.[grade] !== undefined) {
            return this.discounts[sizeKey][grade];
        }

        // Priority 4: Model-based fallback (brand|model)
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
