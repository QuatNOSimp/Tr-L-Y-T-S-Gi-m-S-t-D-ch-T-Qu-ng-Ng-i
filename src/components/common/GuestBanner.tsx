import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Stethoscope, 
  Shield, 
  LogIn, 
  UserPlus, 
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GuestBannerProps {
  onOpenAuth: (mode: 'login' | 'register', role?: 'patient' | 'doctor' | 'admin') => void;
  onRequestAdminLogin: () => void;
}

export const GuestBanner: React.FC<GuestBannerProps> = ({
  onOpenAuth,
  onRequestAdminLogin
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-30 transition-all duration-300">
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          // COLLAPSED COMPACT BAR
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 text-white px-3 sm:px-4 py-1 border-b border-white/10 shadow-xs flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Chế độ khách</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Dropdown trigger */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="px-2.5 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-white/20"
                >
                  <LogIn className="w-3 h-3 text-emerald-200" />
                  <span>Đăng nhập vai trò</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 text-slate-800 dark:text-slate-200 z-50 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenAuth('login', 'patient');
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đăng nhập Người Bệnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenAuth('login', 'doctor');
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300 cursor-pointer"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                      <span>Đăng nhập Bác Sĩ / Kíp Trực</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        onRequestAdminLogin();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-center gap-2 text-xs font-semibold text-indigo-800 dark:text-indigo-300 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Đăng nhập Quản Trị Viên</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenAuth('register', 'patient')}
                className="px-2.5 py-0.5 rounded-lg bg-white text-emerald-800 font-bold text-[11px] shadow-2xs hover:bg-emerald-50 cursor-pointer"
              >
                Đăng ký
              </button>

              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="px-2 py-0.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Mở rộng thanh thông báo"
              >
                <span>Mở rộng</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ) : (
          // EXPANDED SLIM BAR WITH COMPACT DROPDOWN
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-800 text-white px-3 sm:px-6 py-2 border-b border-white/10 shadow-xs"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
              
              {/* Left Label */}
              <div className="flex items-center gap-2 text-xs sm:text-[13px] text-center sm:text-left">
                <ShieldCheck className="w-4 h-4 text-emerald-200 shrink-0 hidden sm:block" />
                <span>
                  Bạn đang xem ở <strong>chế độ khách</strong>. Đăng nhập đúng vai trò để mở cổng làm việc chuyên biệt!
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2 shrink-0">
                
                {/* Compact Role Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="px-3 py-1.5 bg-white text-slate-800 rounded-xl font-bold text-xs shadow-xs hover:bg-slate-50 flex items-center gap-1.5 transition-all cursor-pointer border border-white/30"
                  >
                    <LogIn className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Đăng nhập theo vai trò</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Chọn vai trò đăng nhập
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenAuth('login', 'patient');
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-start gap-2.5 transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Cổng Người Bệnh</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Đặt lịch, tra cứu bệnh, quản lý đơn thuốc</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenAuth('login', 'doctor');
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-slate-800 flex items-start gap-2.5 transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Bác Sĩ & Bệnh Viện</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Kíp trực cấp cứu, phòng khám, kê đơn thuốc</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onRequestAdminLogin();
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 flex items-start gap-2.5 transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Quản Trị Viên (Admin)</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Nạp kho bệnh Excel, giám sát dịch tễ QN</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Register Button */}
                <button
                  type="button"
                  onClick={() => onOpenAuth('register', 'patient')}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold text-xs border border-white/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Đăng ký</span>
                </button>

                {/* Collapse Bar Button */}
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 rounded-xl hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer ml-1"
                  title="Thu gọn thanh thông báo này"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
