import React, { useState } from 'react';
import { User, Building2, Phone, FileText, Mail, Lock, Upload, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/AuthService';

const Signup = ({ onSwitchToLogin, onSignupSuccess }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        company: '',
        ceo: '',
        contact: '',
        businessNumber: '',
        bankAccount: '',
        licenseImage: null
    });
    const [preview, setPreview] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, licenseImage: file.name }));
            // In a real app, we'd upload the file. For now, we'll just show a preview URL if it's an image.
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        try {
            authService.signup(formData);
            setIsSuccess(true);
            setTimeout(() => {
                if (onSignupSuccess) onSignupSuccess();
            }, 2000);
        } catch (error) {
            alert(error.message);
        }
    };

    if (isSuccess) {
        return (
            <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">회원가입 신청 완료</h2>
                <p className="text-slate-500 mb-8 font-medium">관리자의 승인 후 정식 이용이 가능합니다.<br />로그인 페이지로 이동합니다...</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto my-10 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-10 duration-700">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-slate-900 mb-2">회원가입</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">CREATE YOUR BUSINESS ACCOUNT</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Auth Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">이메일 주소</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                required
                                name="email"
                                type="email"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="name@company.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">비밀번호</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                required
                                name="password"
                                type="password"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Business Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">업체명</label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                required
                                name="company"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="(주)대동타이어"
                                value={formData.company}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">대표자명</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                required
                                name="ceo"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="홍길동"
                                value={formData.ceo}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">연락처</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                required
                                name="contact"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="010-0000-0000"
                                value={formData.contact}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">사업자번호</label>
                        <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                required
                                name="businessNumber"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="000-00-00000"
                                value={formData.businessNumber}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">입금 계좌 정보 (선택)</label>
                    <div className="relative">
                        <CheckSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            name="bankAccount"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                            placeholder="예: 기업은행 15207812304017 (주)대동휠앤타이어"
                            value={formData.bankAccount}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* License Upload */}
                <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">사업자등록증 첨부</label>
                    <div className={`relative border-2 border-dashed rounded-3xl p-8 transition-all text-center ${preview ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                        <input
                            required
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {preview ? (
                            <div className="space-y-3">
                                <img src={preview} alt="License" className="max-h-40 mx-auto rounded-lg shadow-md" />
                                <p className="text-blue-600 font-bold text-sm flex items-center justify-center gap-1">
                                    <CheckCircle2 size={16} /> 파일이 선택되었습니다
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 text-slate-400">
                                <Upload className="mx-auto" size={32} />
                                <p className="text-sm font-bold">이미지 파일을 드래그하거나 클릭하여 업로드</p>
                                <p className="text-[10px] uppercase tracking-tighter">JPG, PNG, GIF (MAX 5MB)</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                    >
                        회원가입 신청하기
                    </button>
                    <button
                        type="button"
                        onClick={onSwitchToLogin}
                        className="w-full mt-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
                    >
                        이미 계정이 있으신가요? 로그인하기
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Signup;
