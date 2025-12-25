import React, { useState } from 'react';
import { authService } from '../../services/AuthService';
import { X, Lock, User, Building, Phone, Hash, CreditCard, CheckCircle2, AlertCircle, MapPin, Printer, Save, Edit2 } from 'lucide-react';

const MyPage = ({ user, onClose, onUpdateUser }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editableData, setEditableData] = useState({
        contact: user?.contact || '',
        contact2: user?.contact2 || '',
        fax: user?.fax || '',
        address: user?.address || '',
        bankAccount: user?.bankAccount || '',
        email: user?.email || '',
        company: user?.company || '',
        ceo: user?.ceo || '',
        businessNumber: user?.businessNumber || '',
        grade: user?.grade || ''
    });
    const [isEditing, setIsEditing] = useState(false);

    const isMaster = user?.grade === 'MASTER';

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
            return;
        }

        if (newPassword.length < 4) {
            setMessage({ type: 'error', text: '비밀번호는 4자 이상이어야 합니다.' });
            return;
        }

        setIsSubmitting(true);
        try {
            authService.changePassword(currentPassword, newPassword);
            setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProfileUpdate = async () => {
        setIsSubmitting(true);
        try {
            const updated = authService.updateProfile(editableData);
            if (onUpdateUser) onUpdateUser(updated);
            setMessage({ type: 'success', text: '회원 정보가 수정되었습니다.' });
            setIsEditing(false);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const infoFields = [
        { key: 'email', icon: User, label: '아이디(이메일)', masterOnly: true },
        { key: 'company', icon: Building, label: '상호명', masterOnly: true },
        { key: 'ceo', icon: User, label: '대표자', masterOnly: true },
        { key: 'businessNumber', icon: Hash, label: '사업자번호', masterOnly: true },
        { key: 'contact', icon: Phone, label: '연락처1', masterOnly: false },
        { key: 'contact2', icon: Phone, label: '연락처2', masterOnly: false },
        { key: 'fax', icon: Printer, label: 'FAX', masterOnly: false },
        { key: 'address', icon: MapPin, label: '주소', masterOnly: false },
        { key: 'bankAccount', icon: CreditCard, label: '입금계좌', masterOnly: false },
        { key: 'grade', icon: CheckCircle2, label: '거래처등급', masterOnly: true, highlight: true },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900">마이페이지</h3>
                        <p className="text-slate-400 text-sm font-bold mt-1">나의 정보 확인 및 비밀번호 변경</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all active:scale-90"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <div className="p-8 space-y-10">
                        {/* Membership Info */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                    <h4 className="text-lg font-black text-slate-900">가입 정보</h4>
                                </div>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors"
                                    >
                                        <Edit2 size={14} /> 정보 수정하기
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleProfileUpdate}
                                        disabled={isSubmitting}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                                    >
                                        <Save size={14} /> 저장하기
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {infoFields.map((field, idx) => {
                                    const canEdit = isEditing && (!field.masterOnly || isMaster);
                                    return (
                                        <div key={idx} className={`p-5 rounded-2xl border flex items-center gap-4 group transition-all ${canEdit ? 'bg-white border-blue-500 ring-4 ring-blue-500/5' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center ${canEdit ? 'text-blue-500' : 'text-slate-400'}`}>
                                                <field.icon size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{field.label}</p>
                                                {canEdit ? (
                                                    <input
                                                        type="text"
                                                        value={editableData[field.key] || ''}
                                                        onChange={(e) => setEditableData({ ...editableData, [field.key]: e.target.value })}
                                                        className="w-full bg-transparent text-sm font-black text-slate-900 outline-none p-0 border-b border-blue-200 focus:border-blue-500 transition-colors"
                                                    />
                                                ) : (
                                                    <p className={`text-sm font-black ${field.highlight ? 'text-blue-600' : 'text-slate-700'}`}>{user?.[field.key] || '-'}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <hr className="border-slate-100" />

                        {/* Password Change */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 px-1">
                                <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                                <h4 className="text-lg font-black text-slate-900">비밀번호 변경</h4>
                            </div>

                            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="현재 비밀번호"
                                            required
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="새 비밀번호"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="새 비밀번호 확인"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>

                                {message.text && (
                                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                        }`}>
                                        {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                        <p className="text-xs font-black">{message.text}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Lock size={18} />
                                            <span>비밀번호 변경하기</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyPage;
