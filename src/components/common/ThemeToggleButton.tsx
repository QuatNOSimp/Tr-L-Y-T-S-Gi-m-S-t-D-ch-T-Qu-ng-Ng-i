import React from 'react';
import { motion } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleButtonProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ 
  className = '',
  showLabel = true 
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      type="button"
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all duration-200 cursor-pointer select-none shrink-0 ${
        theme === 'dark'
          ? 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border-slate-700 shadow-sm shadow-amber-500/10'
          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs hover:text-slate-900'
      } ${className}`}
      title={theme === 'dark' ? 'Chuyển sang Chế độ Sáng (Light Mode)' : 'Chuyển sang Chế độ Tối (Dark Mode)'}
      aria-label="Chuyển chế độ Sáng / Tối"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {theme === 'dark' ? (
          <motion.div
            key="dark-sun"
            initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          </motion.div>
        ) : (
          <motion.div
            key="light-moon"
            initial={{ rotate: 90, scale: 0.7, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-4 h-4 text-slate-700" />
          </motion.div>
        )}
      </div>

      {showLabel && (
        <span className="hidden sm:inline text-xs font-bold tracking-tight">
          {theme === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}
        </span>
      )}
    </motion.button>
  );
};
