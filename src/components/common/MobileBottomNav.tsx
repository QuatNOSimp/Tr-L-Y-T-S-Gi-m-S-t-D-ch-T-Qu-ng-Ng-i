import React from 'react';
import { 
  UserCheck, 
  Building2, 
  Shield, 
  Download, 
  PhoneCall,
  QrCode
} from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType } from '../../types';

interface MobileBottomNavProps {
  currentView: 'patient' | 'hospital' | 'admin';
  onViewChange: (view: 'patient' | 'hospital' | 'admin') => void;
  onOpenEmergency: () => void;
  onOpenInstall: () => void;
  onOpenQrCode?: () => void;
  currentUser: UserType | null;
  isInstallable?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  onOpenEmergency,
  onOpenInstall,
  onOpenQrCode,
  currentUser,
  isInstallable
}) => {
  return (
    <nav 
      aria-label="Thanh điều hướng di động"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 shadow-2xl px-2 pt-1.5 pb-2 transition-colors duration-200"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 6px)' }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Tab 1: Cổng Bệnh Nhân */}
        <button
          onClick={() => onViewChange('patient')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            currentView === 'patient'
              ? 'text-emerald-700 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <UserCheck className={`w-5 h-5 ${currentView === 'patient' ? 'stroke-[2.5]' : ''}`} />
            {currentView === 'patient' && (
              <motion.span 
                layoutId="mobileNavActive"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-600 rounded-full" 
              />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none">Bệnh Nhân</span>
        </button>

        {/* Tab 2: Cổng Bác Sĩ */}
        <button
          onClick={() => onViewChange('hospital')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            currentView === 'hospital'
              ? 'text-blue-700 dark:text-blue-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Building2 className={`w-5 h-5 ${currentView === 'hospital' ? 'stroke-[2.5]' : ''}`} />
            {currentView === 'hospital' && (
              <motion.span 
                layoutId="mobileNavActive"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" 
              />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none">Bác Sĩ/BV</span>
        </button>

        {/* Tab 3: Cấp Cứu 115 SOS (Centered prominent button) */}
        <div className="flex-1 flex justify-center -mt-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenEmergency}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 text-white flex flex-col items-center justify-center shadow-lg shadow-rose-600/40 border-2 border-white dark:border-slate-800 cursor-pointer"
            title="Gọi Cấp Cứu 115"
          >
            <PhoneCall className="w-5 h-5 animate-bounce" />
            <span className="text-[8px] font-black leading-none mt-0.5">115</span>
          </motion.button>
        </div>

        {/* Tab 4: Cổng Quản Trị Admin */}
        <button
          onClick={() => onViewChange('admin')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            currentView === 'admin'
              ? 'text-indigo-700 dark:text-indigo-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Shield className={`w-5 h-5 ${currentView === 'admin' ? 'stroke-[2.5]' : ''}`} />
            {currentView === 'admin' && (
              <motion.span 
                layoutId="mobileNavActive"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" 
              />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none">Admin</span>
        </button>

        {/* Tab 5: Cài Đặt App */}
        <button
          onClick={onOpenInstall}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-emerald-800 dark:text-emerald-300 hover:text-emerald-900 transition-all cursor-pointer relative"
          title="Cài đặt App lên điện thoại"
        >
          <div className="relative">
            <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Download className="w-3.5 h-3.5" />
            </div>
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          </div>
          <span className="text-[10px] font-bold mt-1 leading-none text-emerald-800 dark:text-emerald-300">Cài App</span>
        </button>

      </div>
    </nav>
  );
};
