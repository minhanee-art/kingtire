import React from 'react';
import { LogOut, Disc } from 'lucide-react';

const ShopLayout = ({ user, onLogout, onSetView, currentView, isStoreMode, onToggleStoreMode, children }) => {
    const isAdmin = user?.grade === 'ADMIN';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-500/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Premium Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky md:top-0 z-40 shadow-sm transition-all">
                <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-14 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div
                            className="flex items-center gap-2 group cursor-pointer select-none"
                            onClick={onToggleStoreMode}
                            title="Stealth Mode Toggle"
                        >
                            <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Disc className="text-white" size={18} />
                            </div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tighter flex items-baseline gap-1">
                                KING TIRE
                                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isStoreMode ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                            </h1>
                        </div>

                        <nav className="flex items-center gap-1">
                            <button
                                onClick={() => onSetView('shop')}
                                className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${currentView === 'shop' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}
                            >
                                Shop
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => onSetView('admin')}
                                    className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${currentView === 'admin' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-blue-600'}`}
                                >
                                    Admin
                                </button>
                            )}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">{user?.grade}</span>
                            <span className="text-xs font-bold text-slate-700">{user?.company}</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                            title="로그아웃"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
                {children}
            </main>

            <footer className="bg-slate-100 border-t border-slate-200 py-8 relative z-10">
                <div className="max-w-[1700px] mx-auto px-4 text-center">
                    <div className="text-[11px] text-slate-600 uppercase tracking-[0.3em] font-black mb-2">
                        대동타이어
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">
                        &copy; 2025 DDWT. ALL RIGHTS RESERVED. DATA SYNCED VIA BC-API & GOOGLE CLOUD.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ShopLayout;
