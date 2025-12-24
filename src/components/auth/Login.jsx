import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/AuthService';

const Login = ({ onLoginSuccess, onSwitchToSignup }) => {
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        try {
            const user = authService.login(formData.email, formData.password);
            onLoginSuccess(user);
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">로그인</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">DAEDONG TIRE</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">이메일</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            required
                            type="email"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            placeholder="admin@kingtire.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">비밀번호</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            required
                            type="password"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                    >
                        시작하기
                    </button>
                    <button
                        type="button"
                        onClick={onSwitchToSignup}
                        className="w-full mt-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
                    >
                        아직 계정이 없으신가요? 회원가입
                    </button>
                </div>
            </form>

            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Demo Admin account</p>
                <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span>ID: admin@kingtire.com</span>
                    <span>PW: admin</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
