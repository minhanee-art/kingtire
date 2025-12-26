import React, { useState } from 'react';
import { User, Building2, Phone, FileText, Mail, Lock, Upload, CheckCircle2, CheckSquare } from 'lucide-react';
import { authService } from '../../services/AuthService';

const Signup = ({ onSwitchToLogin, onSignupSuccess }) => {
    const [emailId, setEmailId] = useState('');
    const [emailDomain, setEmailDomain] = useState('');
    const [formData, setFormData] = useState({
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

        // Numeric validation for contact and business number
        if (name === 'contact' || name === 'businessNumber') {
            // Alert if non-numeric character is entered (excluding hyphens)
            if (/[^0-9-]/.test(value)) {
                alert('숫자만 입력 가능합니다.');
                return;
            }

            const numbersOnly = value.replace(/[^0-9]/g, '');
            let formattedValue = numbersOnly;

            if (name === 'contact') {
                formattedValue = formatPhoneNumber(numbersOnly);
            } else if (name === 'businessNumber') {
                formattedValue = formatBusinessNumber(numbersOnly);
            }

            setFormData(prev => ({ ...prev, [name]: formattedValue }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const formatPhoneNumber = (val) => {
        if (!val) return '';
        if (val.length <= 3) return val;
        if (val.length <= 7) return `${val.slice(0, 3)}-${val.slice(3)}`;
        return `${val.slice(0, 3)}-${val.slice(3, 7)}-${val.slice(7, 11)}`;
    };

    const formatBusinessNumber = (val) => {
        if (!val) return '';
        if (val.length <= 3) return val;
        if (val.length <= 5) return `${val.slice(0, 3)}-${val.slice(3)}`;
        return `${val.slice(0, 3)}-${val.slice(3, 5)}-${val.slice(5, 10)}`;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, licenseImage: file.name }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const fullEmail = `${emailId}@${emailDomain}`;
            await authService.signup({ ...formData, email: fullEmail });
            setIsSuccess(true);
            setTimeout(() => {
                if (onSignupSuccess) onSignupSuccess();
            }, 2000);
        } catch (error) {
            // Handle duplicate email error from Supabase (code 23505)
            if (error.code === '23505' || error.message?.includes('duplicate key value')) {
                alert('이미 사용중인 이메일 입니다.');
            } else {
                alert(error.message || '회원가입 중 오류가 발생했습니다.');
            }
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
                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase ml-1">이메일 주소(계산서용)</label>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 group">
                            <div className="relative flex-1">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                <input
                                    required
                                    className="w-full pl-10 pr-2 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                                    placeholder="아이디"
                                    value={emailId}
                                    onChange={(e) => setEmailId(e.target.value)}
                                />
                            </div>
                            <span className="hidden md:block text-slate-400 font-bold text-lg">@</span>
                            <div className="flex-[1.5] flex gap-2">
                                <div className="relative flex-1">
                                    <select
                                        className="w-full pl-4 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold appearance-none cursor-pointer"
                                        value={['naver.com', 'gmail.com', 'hanmail.net', 'daum.net', 'kakao.com', 'icloud.com'].includes(emailDomain) ? emailDomain : (emailDomain === '' ? '' : 'custom')}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'custom') {
                                                setEmailDomain(' '); // Use a space to trigger custom input display
                                            } else {
                                                setEmailDomain(val);
                                            }
                                        }}
                                    >
                                        <option value="">-선택-</option>
                                        <option value="naver.com">naver.com</option>
                                        <option value="gmail.com">gmail.com</option>
                                        <option value="hanmail.net">hanmail.net</option>
                                        <option value="daum.net">daum.net</option>
                                        <option value="kakao.com">kakao.com</option>
                                        <option value="icloud.com">icloud.com</option>
                                        <option value="custom">직접입력</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                                {(!['naver.com', 'gmail.com', 'hanmail.net', 'daum.net', 'kakao.com', 'icloud.com', ''].includes(emailDomain)) && (
                                    <div className="relative flex-1 animate-in slide-in-from-right-2 duration-300">
                                        <input
                                            required
                                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                                            placeholder="주소 입력"
                                            value={emailDomain === ' ' ? '' : emailDomain}
                                            onChange={(e) => setEmailDomain(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
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
                                style={{ imeMode: 'active' }}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
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
                                style={{ imeMode: 'active' }}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
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
                                maxLength={13}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
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
                                maxLength={12}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
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
                            style={{ imeMode: 'active' }}
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
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">사업자등록증 첨부 (선택사항)</label>
                    <div className={`relative border-2 border-dashed rounded-3xl p-8 transition-all text-center ${preview ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                        <input
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
