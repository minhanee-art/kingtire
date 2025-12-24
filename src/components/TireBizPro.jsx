import React, { useState } from 'react';
import ShopLayout from './ShopLayout';
import ProductList from './ProductList';
import AdminPanel from './admin/AdminPanel';
import { GRADES } from '../services/AuthService';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';

const TireBizPro = ({ user, onLogout }) => {
    const [view, setView] = useState('shop'); // 'shop' or 'admin'
    const [products, setProducts] = useState([]); // Shared products state
    const [isStoreMode, setIsStoreMode] = useState(true);

    return (
        <ShopLayout
            user={user}
            onLogout={onLogout}
            onSetView={setView}
            currentView={view}
            isStoreMode={isStoreMode}
            onToggleStoreMode={() => setIsStoreMode(!isStoreMode)}
        >
            {view === 'shop' ? (
                <ProductList
                    user={user}
                    onProductsLoaded={setProducts}
                    isStoreMode={isStoreMode}
                />
            ) : (
                <AdminPanel products={products} />
            )}
        </ShopLayout>
    );
};

export default TireBizPro;

