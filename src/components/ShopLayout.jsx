import React, { useState } from 'react';
import { LogOut, Disc, User, Moon, Sun, Crown } from 'lucide-react';
import MyPage from './auth/MyPage';

const ShopLayout = ({ user, onLogout, onSetView, currentView, isStoreMode, onToggleStoreMode, children }) => {
    const [showMyPage, setShowMyPage] = useState(false);
    const isAdmin = user?.grade === 'ADMIN' || user?.grade === 'MASTER';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-500/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Premium Header */}
            <header className="bg-[#004F9F] border-b border-blue-500/20 sticky md:top-0 z-40 shadow-xl transition-all">
                <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-14 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div
                            className="flex items-center gap-2 group cursor-pointer select-none"
                            onClick={onToggleStoreMode}
                            title="Stealth Mode Toggle"
                        >
                            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all relative border border-white/20">
                                <Disc className="text-white" size={20} />
                                <Crown className="text-yellow-400 absolute -top-2 -right-1 rotate-12 drop-shadow-md" size={14} fill="currentColor" />
                            </div>
                            <h1 className="text-xl font-black text-white tracking-tighter flex items-baseline gap-1">
                                왕타이어
                                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isStoreMode ? 'bg-blue-400' : 'bg-white/30'}`}></span>
                            </h1>
                        </div>

                        <nav className="flex items-center gap-1">
                            <button
                                onClick={() => onSetView('shop')}
                                className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${currentView === 'shop' ? 'bg-white text-[#004F9F] shadow-md' : 'text-blue-200 hover:text-white'}`}
                            >
                                Shop
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => onSetView('admin')}
                                    className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${currentView === 'admin' ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-blue-200 hover:text-white'}`}
                                >
                                    Admin
                                </button>
                            )}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end mr-2 text-right">
                            <span className="text-[10px] font-black text-blue-200 uppercase tracking-tighter leading-none">{user?.grade}</span>
                            <span className="text-xs font-bold text-white leading-tight">{user?.company}</span>
                        </div>


                        <button
                            onClick={() => setShowMyPage(true)}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all shadow-sm">
                                <User size={18} />
                            </div>
                            <span className="text-[9px] font-black text-blue-200 uppercase tracking-tighter group-hover:text-white transition-colors">마이페이지</span>
                        </button>

                        <button
                            onClick={onLogout}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="p-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-white rounded-xl transition-all shadow-sm">
                                <LogOut size={18} />
                            </div>
                            <span className="text-[9px] font-black text-blue-200 uppercase tracking-tighter group-hover:text-white transition-colors">로그아웃</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* My Page Modal */}
            {showMyPage && (
                <MyPage
                    user={user}
                    onClose={() => setShowMyPage(false)}
                />
            )}

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
