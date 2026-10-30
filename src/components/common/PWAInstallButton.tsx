import React, { useState } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'floating' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'navbar',
  className = '' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  // If already running in standalone native mode, don't show install button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    // If the browser provides the native beforeinstallprompt event, invoke it directly
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setModalOpen(true);
      }
    } else {
      // For iOS Safari or in-app browsers, show the guided install modal
      setModalOpen(true);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0 whitespace-nowrap ${className}`}
        title="Cài đặt MedAssist thành ứng dụng trên điện thoại hoặc máy tính"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-100" />
        <span className="hidden sm:inline">Cài Đặt App</span>
        <span className="sm:hidden">Cài App</span>
      </motion.button>

      <PWAInstallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
