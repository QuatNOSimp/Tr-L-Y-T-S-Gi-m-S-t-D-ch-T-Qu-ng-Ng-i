import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  Building2, 
  Stethoscope, 
  Eye, 
  EyeOff,
  Sparkles,
  Inbox
} from 'lucide-react';
import { api } from '../../services/api';
import { User as UserType } from '../../types';
import { EmailInboxSimulatorModal } from './EmailInboxSimulatorModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserType) => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'patient' | 'doctor' | 'admin' | 'hospital_admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  initialRole = 'patient'
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
  
  // Registration & Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | 'hospital_admin'>(initialRole);
  const [bhytNumber, setBhytNumber] = useState('');
  const [hospitalName, setHospitalName] = useState('Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi');
  const [specialty, setSpecialty] = useState('');
  const [district, setDistrict] = useState('TP. Quảng Ngãi');
  const [adminUnit, setAdminUnit] = useState('Trường THPT Chuyên Lê Khiết');
  const [adminPosition, setAdminPosition] = useState('Lập trình viên & Admin trang web');

  // Forgot / Reset Password Form State
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Password strength calculator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Chưa nhập', color: 'bg-slate-200 dark:bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Yếu (Nên thêm số hoặc ký tự)', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Trung bình', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Khá an toàn', color: 'bg-blue-500' };
    return { score: 4, label: 'Rất an toàn', color: 'bg-emerald-500' };
  };

  // OTP Verification State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [latestSentOtp, setLatestSentOtp] = useState<string | null>(null);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email Inbox Simulator Modal
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialRole) setRole(initialRole);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialMode, initialRole]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Handle OTP digit inputs
  const handleOtpChange = (index: number, val: string) => {
    // Only accept numeric
    const cleanVal = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleanVal.length > 1) {
      // Pasting full 6 digits
      const pastedChars = cleanVal.slice(0, 6).split('');
      pastedChars.forEach((ch, idx) => {
        newDigits[idx] = ch;
      });
      setOtpDigits(newDigits);
      otpInputRefs.current[Math.min(pastedChars.length, 5)]?.focus();
      return;
    }

    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto-advance
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Submit Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password || !fullName) {
      setErrorMessage('Vui lòng điền đầy đủ email, mật khẩu và họ tên.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần ít nhất 6 ký tự để đảm bảo an toàn.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp. Vui lòng nhập lại chính xác.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        email,
        password,
        fullName,
        phone,
        role,
        bhytNumber: role === 'patient' ? bhytNumber : undefined,
        hospitalName: (role === 'doctor' || role === 'hospital_admin') ? hospitalName : (role === 'admin' ? adminUnit : undefined),
        specialty: role === 'doctor' ? specialty : (role === 'hospital_admin' ? 'Quản lý cơ sở y tế' : (role === 'admin' ? adminPosition : undefined)),
        district
      });

      if (res.user) {
        const roleLabel = res.user.role === 'doctor' 
          ? 'Bác Sĩ' 
          : res.user.role === 'hospital_admin' 
            ? 'Quản Trị Bệnh Viện' 
            : res.user.role === 'admin' 
              ? 'Quản Trị Viên' 
              : 'Bệnh Nhân';
        setSuccessMessage(`Đăng ký thành công vai trò ${roleLabel}! Đang chuyển vào hệ thống...`);
        setTimeout(() => {
          onAuthSuccess(res.user);
          onClose();
        }, 600);
        return;
      }

      setSuccessMessage(res.message || 'Đăng ký thành công! Vui lòng xác thực mã OTP.');
      if (res.otp) {
        setLatestSentOtp(res.otp);
      }
      setResendCooldown(60);
      setMode('verify');
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng ký không thành công. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Verification OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const code = codeToVerify || otpDigits.join('');

    if (code.length !== 6) {
      setErrorMessage('Vui lòng nhập đầy đủ 6 chữ số mã xác nhận OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyEmail(email, code);
      setSuccessMessage('Xác thực email thành công! Đang chuyển hướng...');
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Mã xác nhận không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await api.resendVerificationCode(email);
      setSuccessMessage('Đã gửi lại mã xác nhận mới tới email của bạn!');
      if (res.otp) {
        setLatestSentOtp(res.otp);
      }
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi lại mã xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email, password);
      setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      if (err.needsVerification) {
        setErrorMessage(err.message);
        if (err.otp) setLatestSentOtp(err.otp);
        setResendCooldown(60);
        setMode('verify');
      } else {
        const msg = err.message || '';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          setErrorMessage('Đang tái lập kết nối bảo mật đến máy chủ y tế. Vui lòng bấm Đăng nhập lại hoặc thử mật khẩu 123456.');
        } else {
          setErrorMessage(msg || 'Email hoặc mật khẩu không chính xác.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Request Password Reset OTP
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email) {
      setErrorMessage('Vui lòng nhập địa chỉ email đã đăng ký.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSuccessMessage(res.message || 'Mã xác nhận 6 số đã được gửi tới email của bạn!');
      if (res.otp) {
        setLatestSentOtp(res.otp);
        setResetOtp(res.otp);
      }
      setMode('reset');
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetOtp || !newPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ mã OTP và mật khẩu mới.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới cần tối thiểu 6 ký tự để đảm bảo an toàn.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(email, resetOtp, newPassword);
      setSuccessMessage('Đặt lại mật khẩu thành công! Bạn đã được tự động đăng nhập.');
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo credentials
  const fillDemoAccount = (demoType: 'khanhthao' | 'patient' | 'doctor' | 'hospital_admin' | 'admin') => {
    if (demoType === 'khanhthao') {
      setEmail('khanhthao0407@gmail.com');
      setPassword('123456');
    } else if (demoType === 'patient') {
      setEmail('benhnhan@gmail.com');
      setPassword('123456');
    } else if (demoType === 'doctor') {
      setEmail('bacsi@quangngai.gov.vn');
      setPassword('123456');
    } else if (demoType === 'hospital_admin') {
      setEmail('quanly.bvdk@quangngai.gov.vn');
      setPassword('123456');
    } else {
      setEmail('admin.hien@chuyenlekhiet.edu.vn');
      setPassword('123456');
    }
    setErrorMessage(null);
  };

  // Auto fill OTP from email simulator
  const handleApplyOtpFromSimulator = (otp: string) => {
    const chars = otp.slice(0, 6).split('');
    setOtpDigits(chars);
    handleVerifyOtp(otp);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] transition-colors duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl">
                  {mode === 'verify' 
                    ? 'Xác Thực Email Tài Khoản' 
                    : mode === 'register' 
                      ? 'Đăng Ký Tài Khoản Y Tế' 
                      : mode === 'forgot'
                        ? 'Khôi Phục Mật Khẩu'
                        : mode === 'reset'
                          ? 'Thiết Lập Mật Khẩu Mới'
                          : 'Đăng Nhập Hệ Thống'}
                </h3>
                <p className="text-xs text-emerald-100">
                  MedAssist Quảng Ngãi - Nền tảng Y tế Số & Dịch tễ tỉnh
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs (Only when in login or register mode) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-5 pt-3">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${
                  mode === 'login'
                    ? 'border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${
                  mode === 'register'
                    ? 'border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Đăng Ký Mới
              </button>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4">

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{successMessage}</div>
              </div>
            )}

            {/* MODE 1: EMAIL VERIFICATION STEP */}
            {mode === 'verify' && (
              <div className="space-y-5 py-2">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-xs">
                    <Mail className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Kiểm tra hộp thư email của bạn</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                    Hệ thống đã gửi một email xác thực chứa mã <strong>6 chữ số (OTP)</strong> đến:
                  </p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 py-1 px-3 rounded-lg inline-block text-sm border border-emerald-200 dark:border-emerald-800">
                    {email}
                  </p>
                </div>

                {/* 6-Digit OTP Input Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 text-center mb-2.5 uppercase tracking-wide">
                    Nhập mã xác nhận 6 số:
                  </label>
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-hidden"
                      />
                    ))}
                  </div>
                </div>

                {/* Quick Auto-Fill Prompt if sent recently */}
                {latestSentOtp && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Mã vừa gửi về email của bạn là: <strong className="font-mono font-bold text-sm text-amber-800 dark:text-amber-300">{latestSentOtp}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyOtpFromSimulator(latestSentOtp)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shrink-0"
                    >
                      Điền ngay
                    </button>
                  </div>
                )}

                {/* Submit Verification Button */}
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang kiểm tra mã...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Xác Nhận & Kích Hoạt Tài Khoản</span>
                    </>
                  )}
                </button>

                {/* Interactive Simulated Email Viewer Button */}
                <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsInboxModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 hover:underline cursor-pointer"
                  >
                    <Inbox className="w-4 h-4" />
                    <span>Xem hộp thư email xác thực vừa gửi đến (Trực tiếp)</span>
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || loading}
                      className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Gửi lại mã {resendCooldown > 0 ? `(${resendCooldown}s)` : ''}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Quay lại Đăng nhập
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: REGISTER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                
                {/* Role Switcher */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Chọn vai trò đăng ký:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('patient')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                        role === 'patient'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 shadow-xs ring-2 ring-emerald-500/40'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">Người Bệnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('doctor')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                        role === 'doctor'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 shadow-xs ring-2 ring-blue-500/40'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">Bác Sĩ Điều Trị</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('hospital_admin')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                        role === 'hospital_admin'
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 shadow-xs ring-2 ring-cyan-500/40'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span className="truncate">QL Bệnh Viện</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRole('admin');
                        if (!fullName) setFullName('Lê Vũ Nguyên Hiền');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                        role === 'admin'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300 shadow-xs ring-2 ring-purple-500/40'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="truncate">Quản Trị Viên</span>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="VD: Trần Văn Hoàng"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Địa chỉ Email <span className="text-rose-500">*</span> (Để nhận mã xác thực)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="email-cua-ban@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    />
                  </div>
                </div>

                {/* Password & Strength Meter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mật khẩu <span className="text-rose-500">*</span> (Tối thiểu 6 ký tự)
                    </label>
                    {password && (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Độ mạnh: <span className="font-bold">{getPasswordStrength(password).label}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Nhập mật khẩu an toàn..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {password && (
                    <div className="mt-1.5 flex gap-1 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${getPasswordStrength(password).score >= 1 ? getPasswordStrength(password).color : 'bg-transparent'} w-1/4`}></div>
                      <div className={`h-full transition-all duration-300 ${getPasswordStrength(password).score >= 2 ? getPasswordStrength(password).color : 'bg-transparent'} w-1/4`}></div>
                      <div className={`h-full transition-all duration-300 ${getPasswordStrength(password).score >= 3 ? getPasswordStrength(password).color : 'bg-transparent'} w-1/4`}></div>
                      <div className={`h-full transition-all duration-300 ${getPasswordStrength(password).score >= 4 ? getPasswordStrength(password).color : 'bg-transparent'} w-1/4`}></div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Xác nhận lại mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Nhập lại mật khẩu giống ở trên..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    />
                  </div>
                </div>

                {/* Phone & District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Số điện thoại liên hệ
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="0913.xxx.xxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Khu vực tại Quảng Ngãi
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full py-2 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    >
                      <option value="TP. Quảng Ngãi">TP. Quảng Ngãi</option>
                      <option value="Bình Sơn">Huyện Bình Sơn</option>
                      <option value="Sơn Tịnh">Huyện Sơn Tịnh</option>
                      <option value="Tư Nghĩa">Huyện Tư Nghĩa</option>
                      <option value="Mộ Đức">Huyện Mộ Đức</option>
                      <option value="Đức Phổ">Thị xã Đức Phổ</option>
                      <option value="Nghĩa Hành">Huyện Nghĩa Hành</option>
                      <option value="Trà Bồng">Huyện Trà Bồng</option>
                      <option value="Lý Sơn">Huyện đảo Lý Sơn</option>
                    </select>
                  </div>
                </div>

                {/* Role Specific Fields */}
                {role === 'patient' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mã thẻ BHYT (Nếu có)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: GD45100091823"
                      value={bhytNumber}
                      onChange={(e) => setBhytNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden uppercase"
                    />
                  </div>
                ) : role === 'doctor' ? (
                  <div className="space-y-3 p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                        Bệnh viện công tác tại Quảng Ngãi
                      </label>
                      <input
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                        Chuyên khoa phụ trách
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Cấp cứu & Hồi sức tích cực, Nội khoa..."
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                ) : role === 'hospital_admin' ? (
                  <div className="space-y-3 p-3 bg-cyan-50/70 dark:bg-cyan-950/40 rounded-xl border border-cyan-200 dark:border-cyan-800">
                    <div className="flex items-center gap-1.5 text-cyan-900 dark:text-cyan-300 font-bold text-xs">
                      <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span>Cơ sở Y tế / Bệnh viện quản lý tại Quảng Ngãi:</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cyan-900 dark:text-cyan-300 mb-1">
                        Tên Bệnh Viện / Cơ Sở Y Tế
                      </label>
                      <input
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-cyan-300 dark:border-cyan-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="VD: Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cyan-900 dark:text-cyan-300 mb-1">
                        Chức vụ quản lý điều hành
                      </label>
                      <input
                        type="text"
                        defaultValue="Phó Giám Đốc Điều Hành / Trưởng Ban Quản Lý"
                        className="w-full px-3 py-2 text-sm border border-cyan-300 dark:border-cyan-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-3.5 bg-purple-50/80 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-300 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>Thông tin Ban Quản Trị Hệ Thống & Nhà Phát Triển:</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-purple-900 dark:text-purple-300 mb-1">
                        Đơn vị công tác / Quản lý trang web
                      </label>
                      <input
                        type="text"
                        value={adminUnit}
                        onChange={(e) => setAdminUnit(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
                        placeholder="Trường THPT Chuyên Lê Khiết"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-purple-900 dark:text-purple-300 mb-1">
                        Chức vụ / Nhiệm vụ quản trị
                      </label>
                      <input
                        type="text"
                        value={adminPosition}
                        onChange={(e) => setAdminPosition(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-hidden"
                        placeholder="Lập trình viên & Admin trang web"
                      />
                    </div>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300 italic">
                      Tài khoản Admin có đặc quyền nạp và thay thế dữ liệu bệnh tật từ file Excel và quản trị hệ thống.
                    </p>
                  </div>
                )}

                {/* Notice on email confirmation */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Sau khi bấm Tạo tài khoản, hệ thống sẽ <strong>gửi thông tin và mã xác thực 6 số về email của bạn</strong> để kích hoạt tài khoản.
                  </span>
                </div>

                {/* Submit Register Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý & gửi email xác thực...</span>
                    </>
                  ) : (
                    <>
                      <span>Tạo Tài Khoản & Gửi Email Xác Nhận</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>
            )}

            {/* MODE 3: LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="email-cua-ban@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mật khẩu</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang kiểm tra thông tin...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Đăng Nhập</span>
                    </>
                  )}
                </button>

                {/* Quick Test Demo Accounts */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center">
                    Tài khoản thử nghiệm nhanh (1-click điền tự động):
                  </p>

                  {/* Primary highlight button for khanhthao */}
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('khanhthao')}
                    className="w-full p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-400/80 dark:border-emerald-600 text-xs font-bold flex items-center justify-between transition-colors shadow-xs cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        KT
                      </div>
                      <div>
                        <div className="text-emerald-950 dark:text-white font-extrabold text-xs">Tài khoản: khanhthao0407@gmail.com</div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-normal">Khánh Thảo • Bệnh nhân • Mật khẩu: 123456</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shrink-0">
                      Điền ngay
                    </span>
                  </button>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => fillDemoAccount('patient')}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="benhnhan@gmail.com / 123456"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">Người Bệnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoAccount('doctor')}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="bacsi@quangngai.gov.vn / 123456"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">Bác Sĩ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoAccount('hospital_admin')}
                      className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="quanly.bvdk@quangngai.gov.vn / 123456"
                    >
                      <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span className="truncate">QL Bệnh Viện</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoAccount('admin')}
                      className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      title="admin.hien@chuyenlekhiet.edu.vn / 123456"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="truncate">Quản Trị Viên</span>
                    </button>
                  </div>
                </div>

              </form>
            )}

            {/* MODE 4: FORGOT PASSWORD REQUEST FORM */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4 py-1">
                <div className="text-center space-y-1 mb-2">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-xs">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Khôi phục mật khẩu tài khoản</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                    Nhập địa chỉ email của bạn. Hệ thống y tế sẽ gửi mã xác thực OTP 6 số để bạn thiết lập lại mật khẩu mới ngay tức thì.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Địa chỉ Email của bạn <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="VD: khanhthao0407@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang gửi mã OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Gửi Mã Xác Nhận OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    ← Quay lại Đăng nhập
                  </button>
                </div>
              </form>
            )}

            {/* MODE 5: RESET PASSWORD WITH OTP */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4 py-1">
                <div className="text-center space-y-1 mb-2">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-200 dark:border-teal-800 shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Thiết lập mật khẩu mới</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Nhập mã OTP 6 số đã gửi đến <strong>{email}</strong> cùng mật khẩu mới của bạn.
                  </p>
                </div>

                {/* OTP Simulator Alert */}
                {latestSentOtp && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 text-xs">
                    <span className="text-amber-900 dark:text-amber-200">
                      Mã OTP của bạn: <strong className="font-mono font-bold text-amber-800 dark:text-amber-300">{latestSentOtp}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setResetOtp(latestSentOtp)}
                      className="px-2 py-0.5 rounded bg-amber-600 text-white font-semibold text-[11px]"
                    >
                      Điền mã
                    </button>
                  </div>
                )}

                {/* OTP Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã xác nhận 6 số (OTP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="VD: 123456"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-center font-mono font-bold text-lg tracking-widest bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-hidden"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mật khẩu mới <span className="text-rose-500">*</span> (Tối thiểu 6 ký tự)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Nhập mật khẩu mới..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Nhập lại mật khẩu mới..."
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/25 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang cập nhật mật khẩu...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Lưu Mật Khẩu Mới & Đăng Nhập</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    ← Quay lại Đăng nhập
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Bảo mật tiêu chuẩn Y tế Bộ Y Tế
            </span>
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Chưa có tài khoản? Đăng ký ngay
              </button>
            ) : mode === 'register' ? (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Đã có tài khoản? Đăng nhập
              </button>
            ) : (mode === 'forgot' || mode === 'reset') ? (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                ← Quay lại Đăng nhập
              </button>
            ) : null}
          </div>

        </div>
      </div>

      {/* Embedded Simulated Inbox Modal */}
      <EmailInboxSimulatorModal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        targetEmail={email}
        onApplyOtp={handleApplyOtpFromSimulator}
      />
    </>
  );
};
