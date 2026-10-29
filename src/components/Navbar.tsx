import React, { useState } from 'react';
import { 
  Building2, 
  UserCheck, 
  MapPin, 
  FileSpreadsheet, 
  PhoneCall, 
  HeartPulse,
  User,
  LogIn,
  CheckCircle2,
  Mail,
  ChevronDown,
  Stethoscope,
  Shield,
  ArrowRightLeft,
  LogOut,
  Sparkles,
  QrCode,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from '../types';
import { ThemeToggleButton } from './common/ThemeToggleButton';
import { PWAInstallButton } from './common/PWAInstallButton';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentView: 'patient' | 'hospital' | 'admin';
  onViewChange: (view: 'patient' | 'hospital' | 'admin') => void;
  onOpenEmergency: () => void;
  onOpenExcelImport?: () => void;
  onOpenQrCode?: () => void;
  emergencyCount: number;
  totalDiseases: number;
  currentUser: UserType | null;
  onOpenAuth: (mode?: 'login' | 'register', defaultRole?: 'patient' | 'doctor' | 'admin') => void;
  onOpenProfile: () => void;
  onOpenInbox: () => void;
  onQuickSwitchRole?: (role: 'patient' | 'doctor' | 'admin') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  onOpenEmergency,
  onOpenExcelImport,
  onOpenQrCode,
  emergencyCount,
  totalDiseases,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenInbox,
  onQuickSwitchRole,
  onLogout
}) => {
  const { theme, toggleTheme } = useTheme();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Brand Logo & Single-Line Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/80 dark:border-emerald-700/60 flex items-center justify-center shadow-xs shrink-0 overflow-hidden p-0.5 cursor-pointer"
            >
              <img 
                src="/bvdk_logo.png" 
                alt="Logo BVĐK Quảng Ngãi" 
                className="w-full h-full object-contain" 
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fb = document.getElementById('navbar-logo-fallback');
                  if (fb) fb.classList.remove('hidden');
                }}
              />
              <div id="navbar-logo-fallback" className="hidden w-full h-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 rounded-lg items-center justify-center text-white">
                <HeartPulse className="w-4 h-4 animate-pulse" />
              </div>
            </motion.div>

            {/* Chữ tiêu đề căn chuẩn trên 1 dòng duy nhất */}
            <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-nowrap select-none">
              <span className="font-black text-sm sm:text-base tracking-tight bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 dark:from-emerald-400 dark:via-teal-300 dark:to-slate-100 bg-clip-text text-transparent whitespace-nowrap">
                MedAssist Quảng Ngãi
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>BVĐK Tỉnh</span>
              </span>
            </div>
          </div>

          {/* Center: Dedicated Portal Badge (Tách riêng biệt theo vai trò, luôn canh 1 dòng) */}
          <div className="flex items-center shrink-0">
            {currentUser ? (
              // When logged in: strict isolation badge
              currentUser.role === 'patient' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 shadow-xs whitespace-nowrap"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap">Cổng Người Bệnh</span>
                </motion.div>
              ) : currentUser.role === 'doctor' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-2xl bg-blue-50/90 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 shadow-xs whitespace-nowrap"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap">Cổng Bác Sĩ & BV</span>
                  {emergencyCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-bounce whitespace-nowrap">
                      {emergencyCount} cấp cứu
                    </span>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 shadow-xs whitespace-nowrap"
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                  <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap">Cổng Quản Trị (Admin)</span>
                </motion.div>
              )
            ) : (
              // When not logged in: guest navigation selection
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs whitespace-nowrap">
                <button
                  onClick={() => onViewChange('patient')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    currentView === 'patient'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs border border-slate-200/60 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Bệnh Nhân</span>
                </button>
                <button
                  onClick={() => onViewChange('hospital')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    currentView === 'hospital'
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs border border-slate-200/60 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Bác Sĩ</span>
                </button>
                <button
                  onClick={() => onViewChange('admin')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs border border-slate-200/60 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Admin</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Tools & User Account */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Dark / Light Mode Switcher */}
            <ThemeToggleButton />

            {/* PWA Mobile App Install Button */}
            <PWAInstallButton />

            {/* Simulated Inbox Quick Trigger */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenInbox}
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900/70 text-teal-800 dark:text-teal-200 text-xs font-semibold border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
              title="Xem hộp thư email đã gửi từ hệ thống"
            >
              <Mail className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Hòm Thư Email</span>
            </motion.button>

            {/* App QR Code Introduction Button */}
            {onOpenQrCode && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenQrCode}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-200 dark:border-emerald-800 shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                title="Mã QR giới thiệu và chia sẻ ứng dụng MedAssist Quảng Ngãi"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Mã QR App</span>
                <span className="sm:hidden">QR</span>
              </motion.button>
            )}

            {/* Excel Import Button (Chỉ hiển thị khi đăng nhập vai trò Admin) */}
            {currentUser?.role === 'admin' && onOpenExcelImport && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenExcelImport}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                title="Quản trị viên nạp cơ sở dữ liệu bệnh từ file Excel (.xlsx, .xls, .csv)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span className="hidden sm:inline">Nạp Excel</span>
                <span className="sm:hidden">Excel</span>
              </motion.button>
            )}

            {/* Emergency SOS Button (Compact & Sleek) */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenEmergency}
                className="relative z-10 flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/30 cursor-pointer shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5 text-white animate-bounce" />
                <span className="whitespace-nowrap">CẤP CỨU 115</span>
              </motion.button>
              {/* Expanding radar glow wave */}
              <div className="absolute inset-0 rounded-xl bg-rose-500 animate-ping opacity-25 pointer-events-none"></div>
            </div>

            {/* User Profile / Auth Area */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 text-white ${
                    currentUser.role === 'admin'
                      ? 'bg-gradient-to-tr from-purple-700 to-indigo-600'
                      : currentUser.role === 'doctor' 
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' 
                      : 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                  }`}>
                    {currentUser.role === 'admin' ? (
                      <Shield className="w-4 h-4" />
                    ) : currentUser.role === 'doctor' ? (
                      <Stethoscope className="w-4 h-4" />
                    ) : (
                      currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'B'
                    )}
                  </div>
                  <div className="hidden sm:block text-left max-w-[125px]">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1">
                      {currentUser.fullName}
                      {currentUser.isVerified && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium">
                      {currentUser.role === 'admin' ? 'Quản Trị Viên' : currentUser.role === 'doctor' ? 'Bác sĩ / Kíp trực' : 'Người bệnh'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.fullName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          currentUser.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200'
                            : currentUser.role === 'doctor' 
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200' 
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200'
                        }`}>
                          {currentUser.role === 'admin' ? '🛡️ Quản Trị Viên (Admin)' : currentUser.role === 'doctor' ? '👨‍⚕️ Tài khoản Bác sĩ' : '🧑‍🦱 Tài khoản Người bệnh'}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                        </span>
                      </div>
                    </div>

                    {/* Theme Switcher in Dropdown */}
                    <button
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {theme === 'dark' ? (
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Moon className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        <span>Giao diện: {theme === 'dark' ? 'Chế độ Tối' : 'Chế độ Sáng'}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700">
                        {theme === 'dark' ? 'Bật Sáng' : 'Bật Tối'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Xem & Cập nhật Hồ Sơ</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenInbox();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Xem Hộp Thư Email Đến</span>
                    </button>

                    {onOpenQrCode && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenQrCode();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-2 transition-colors cursor-pointer font-semibold"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Mã QR Giới Thiệu App</span>
                      </button>
                    )}

                    {currentUser.role === 'admin' && onOpenExcelImport && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenExcelImport();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-2 transition-colors cursor-pointer font-semibold"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Nạp Cơ Sở Dữ Liệu Excel</span>
                      </button>
                    )}

                    {/* Role Switcher for 3 Roles: Patient, Doctor, Admin */}
                    {onQuickSwitchRole && (
                      <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                        <div className="px-3.5 py-1 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                          Đăng nhập tài khoản vai trò khác:
                        </div>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onQuickSwitchRole('patient');
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                            currentUser.role === 'patient' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold' 
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Đăng nhập Cổng Người Bệnh</span>
                        </button>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onQuickSwitchRole('doctor');
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                            currentUser.role === 'doctor' 
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 font-bold' 
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <Stethoscope className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Đăng nhập Cổng Bác Sĩ / BV</span>
                        </button>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onQuickSwitchRole('admin');
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                            currentUser.role === 'admin' 
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 font-bold' 
                              : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Đăng nhập Cổng Admin</span>
                        </button>
                      </div>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Đăng xuất tài khoản</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="hidden sm:inline">Đăng Nhập</span>
                  <span className="sm:hidden">Login</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <span>Đăng Ký</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
